import { ObjectTool } from '../base/ObjectTool'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'
import { isImageObject } from '@/lib/editor/objects/types'
import { MagicEraserIcon } from '@/components/editor/icons/AIToolIcons'

export interface MagicEraserOptions {
  mode: 'object' | 'brush' | 'lasso'
  brushSize: number // For brush mode
  autoFill: boolean // Automatically fill after erasing
  fillQuality: 'fast' | 'balanced' | 'best'
}

interface ErasureArea {
  objectId: string
  mask: ImageData
  bounds: { x: number; y: number; width: number; height: number }
}

/**
 * AI-powered eraser that intelligently removes objects and fills the background
 * Uses scene understanding to generate realistic fill content
 */
export class MagicEraserTool extends ObjectTool {
  id = 'ai-magic-eraser'
  name = 'Magic Eraser'
  icon = MagicEraserIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  private eventBus: TypedEventBus
  private isErasing = false
  private erasureCanvas: HTMLCanvasElement | null = null
  private erasureCtx: CanvasRenderingContext2D | null = null
  private currentObject: CanvasObject | null = null
  private lassoPoints: Array<{ x: number; y: number }> = []
  
  constructor() {
    super()
    this.replicateService = new ReplicateService()
    this.eventBus = new TypedEventBus()
  }

  protected setupTool(): void {
    // Set default options
    this.setOption('mode', 'object')
    this.setOption('brushSize', 50)
    this.setOption('autoFill', true)
    this.setOption('fillQuality', 'balanced')
  }

  protected cleanupTool(): void {
    // Clean up any ongoing erasure state
    this.isErasing = false
    this.erasureCanvas = null
    this.erasureCtx = null
    this.currentObject = null
    this.lassoPoints = []
  }
  
  getOptions(): MagicEraserOptions {
    return {
      mode: 'object',
      brushSize: 50,
      autoFill: true,
      fillQuality: 'balanced'
    }
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    await super.onActivate(canvas)
    
    const options = this.getOptions()
    this.eventBus.emit('tool.message', {
      toolId: this.id,
      type: 'info',
      message: `Magic Eraser (${options.mode} mode): Click to remove objects intelligently`
    })
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const options = this.getOptions()
    
    if (options.mode === 'object') {
      // Object mode - click to select and remove entire objects
      const targetObject = canvas.getObjectAtPoint(event.point)
      if (targetObject) {
        await this.eraseObject(targetObject)
      }
    } else if (options.mode === 'brush') {
      // Brush mode - paint areas to erase
      const targetObject = canvas.getObjectAtPoint(event.point)
      if (targetObject && isImageObject(targetObject)) {
        this.startBrushErasure(targetObject, event.point)
      }
    } else if (options.mode === 'lasso') {
      // Lasso mode - draw selection to erase
      const targetObject = canvas.getObjectAtPoint(event.point)
      if (targetObject && isImageObject(targetObject)) {
        this.startLassoErasure(targetObject, event.point)
      }
    }
  }
  
  async onMouseMove(event: ToolEvent): Promise<void> {
    if (!this.isErasing) return
    
    const options = this.getOptions()
    
    if (options.mode === 'brush' && this.erasureCtx && this.currentObject) {
      this.continueBrushErasure(event.point)
    } else if (options.mode === 'lasso') {
      this.continueLassoErasure(event.point)
    }
  }
  
  async onMouseUp(event: ToolEvent): Promise<void> {
    if (!this.isErasing) return
    
    this.isErasing = false
    const options = this.getOptions()
    
    if (options.mode === 'brush' && this.erasureCanvas && this.currentObject) {
      await this.finishBrushErasure()
    } else if (options.mode === 'lasso' && this.lassoPoints.length > 2 && this.currentObject) {
      await this.finishLassoErasure()
    }
    
    // Clean up
    this.erasureCanvas = null
    this.erasureCtx = null
    this.currentObject = null
    this.lassoPoints = []
  }
  
  private async eraseObject(object: CanvasObject): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const options = this.getOptions()
    
    try {
      const taskId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.started', {
        taskId,
        toolId: this.id,
        description: 'Removing object with AI',
        targetObjectIds: [object.id]
      })
      
      if (isImageObject(object)) {
        // For image objects, use AI to fill the space
        if (options.autoFill) {
          await this.fillRemovedArea(object)
        }
      }
      
      // Remove the object
      await canvas.removeObject(object.id)
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true,
        affectedObjectIds: [object.id]
      })
      
    } catch (error) {
      console.error('Magic eraser failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        toolId: this.id,
        operation: 'object-removal',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  private startBrushErasure(object: CanvasObject, point: { x: number; y: number }): void {
    this.isErasing = true
    this.currentObject = object
    
    // Create erasure canvas
    this.erasureCanvas = document.createElement('canvas')
    this.erasureCanvas.width = object.width
    this.erasureCanvas.height = object.height
    this.erasureCtx = this.erasureCanvas.getContext('2d')!
    
    // Start with transparent canvas
    this.erasureCtx.clearRect(0, 0, object.width, object.height)
    
    // Draw first point
    this.drawErasurePoint(point)
  }
  
  private continueBrushErasure(point: { x: number; y: number }): void {
    if (!this.erasureCtx || !this.currentObject) return
    this.drawErasurePoint(point)
  }
  
  private drawErasurePoint(point: { x: number; y: number }): void {
    if (!this.erasureCtx || !this.currentObject) return
    
    const options = this.getOptions()
    const relativeX = point.x - this.currentObject.x
    const relativeY = point.y - this.currentObject.y
    
    // Draw white circle (area to erase)
    this.erasureCtx.globalCompositeOperation = 'source-over'
    this.erasureCtx.fillStyle = 'white'
    this.erasureCtx.beginPath()
    this.erasureCtx.arc(relativeX, relativeY, options.brushSize / 2, 0, Math.PI * 2)
    this.erasureCtx.fill()
  }
  
  private async finishBrushErasure(): Promise<void> {
    if (!this.erasureCanvas || !this.currentObject || !isImageObject(this.currentObject)) return
    
    const maskData = this.erasureCtx!.getImageData(0, 0, this.erasureCanvas.width, this.erasureCanvas.height)
    
    await this.applyErasure(this.currentObject, maskData, {
      x: 0,
      y: 0,
      width: this.erasureCanvas.width,
      height: this.erasureCanvas.height
    })
  }
  
  private startLassoErasure(object: CanvasObject, point: { x: number; y: number }): void {
    this.isErasing = true
    this.currentObject = object
    this.lassoPoints = [point]
  }
  
  private continueLassoErasure(point: { x: number; y: number }): void {
    this.lassoPoints.push(point)
    // Could show preview of lasso path
  }
  
  private async finishLassoErasure(): Promise<void> {
    if (!this.currentObject || !isImageObject(this.currentObject)) return
    
    // Create mask from lasso points
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = this.currentObject.width
    maskCanvas.height = this.currentObject.height
    const maskCtx = maskCanvas.getContext('2d')!
    
    // Draw lasso path
    maskCtx.fillStyle = 'white'
    maskCtx.beginPath()
    this.lassoPoints.forEach((point, index) => {
      const relativeX = point.x - this.currentObject!.x
      const relativeY = point.y - this.currentObject!.y
      
      if (index === 0) {
        maskCtx.moveTo(relativeX, relativeY)
      } else {
        maskCtx.lineTo(relativeX, relativeY)
      }
    })
    maskCtx.closePath()
    maskCtx.fill()
    
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    
    await this.applyErasure(this.currentObject, maskData, {
      x: 0,
      y: 0,
      width: maskCanvas.width,
      height: maskCanvas.height
    })
  }
  
  private async applyErasure(
    object: CanvasObject & { data: import('@/lib/editor/objects/types').ImageData },
    maskData: ImageData,
    bounds: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const options = this.getOptions()
    
    try {
      this.eventBus.emit('ai.processing.started', {
        toolId: this.id,
        operation: 'content-aware-fill'
      })
      
      // Get the original image
      const originalCanvas = document.createElement('canvas')
      originalCanvas.width = object.width
      originalCanvas.height = object.height
      const originalCtx = originalCanvas.getContext('2d')!
      
      if (object.data.element instanceof HTMLImageElement) {
        originalCtx.drawImage(object.data.element, 0, 0, object.width, object.height)
      } else {
        originalCtx.drawImage(object.data.element, 0, 0)
      }
      
      // In a real implementation, this would:
      // 1. Send the image and mask to an AI inpainting model
      // 2. Get back the filled result
      
      // For now, simulate content-aware fill
      const filledCanvas = await this.simulateContentAwareFill(
        originalCanvas,
        maskData,
        options
      )
      
      // Create a new image object with the result
      const blob = await new Promise<Blob>((resolve) => {
        filledCanvas.toBlob((blob) => resolve(blob!), 'image/png')
      })
      
      const url = URL.createObjectURL(blob)
      const img = new Image()
      
      img.onload = async () => {
        // Update the object with the new image
        await canvas.updateObject(object.id, {
          data: {
            src: url,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            element: img
          },
          metadata: {
            ...object.metadata,
            lastMagicErase: new Date().toISOString()
          }
        })
        
        this.eventBus.emit('ai.processing.completed', {
          toolId: this.id,
          operation: 'content-aware-fill',
          result: 'success'
        })
      }
      
      img.src = url
      
    } catch (error) {
      console.error('Content-aware fill failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        toolId: this.id,
        operation: 'content-aware-fill',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  private async fillRemovedArea(object: CanvasObject): Promise<void> {
    // This would analyze surrounding objects and generate appropriate fill
    // For now, we'll skip this as it requires complex scene understanding
    console.log('Would fill area where object was removed:', object.id)
  }
  
  private async simulateContentAwareFill(
    originalCanvas: HTMLCanvasElement,
    maskData: ImageData,
    options: MagicEraserOptions
  ): Promise<HTMLCanvasElement> {
    const width = originalCanvas.width
    const height = originalCanvas.height
    
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = width
    resultCanvas.height = height
    const resultCtx = resultCanvas.getContext('2d')!
    
    // Draw original
    resultCtx.drawImage(originalCanvas, 0, 0)
    
    // Get image data
    const imageData = resultCtx.getImageData(0, 0, width, height)
    const data = imageData.data
    const maskPixels = maskData.data
    
    // Simple content-aware fill simulation
    // In reality, this would use AI to understand and fill the scene
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        
        // Check if this pixel should be filled
        if (maskPixels[idx + 3] > 128) {
          // Find nearby pixels that aren't masked
          const samples: Array<{ r: number; g: number; b: number }> = []
          const sampleRadius = options.fillQuality === 'best' ? 20 : 
                               options.fillQuality === 'balanced' ? 10 : 5
          
          for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
            for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
              const nx = x + dx
              const ny = y + dy
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = (ny * width + nx) * 4
                
                // Only sample non-masked pixels
                if (maskPixels[nidx + 3] < 128) {
                  samples.push({
                    r: data[nidx],
                    g: data[nidx + 1],
                    b: data[nidx + 2]
                  })
                }
              }
            }
          }
          
          if (samples.length > 0) {
            // Use weighted average based on distance
            let totalR = 0, totalG = 0, totalB = 0
            let totalWeight = 0
            
            samples.forEach((sample, i) => {
              const weight = 1 / (i + 1) // Simple distance weighting
              totalR += sample.r * weight
              totalG += sample.g * weight
              totalB += sample.b * weight
              totalWeight += weight
            })
            
            data[idx] = Math.round(totalR / totalWeight)
            data[idx + 1] = Math.round(totalG / totalWeight)
            data[idx + 2] = Math.round(totalB / totalWeight)
            
            // Add slight noise for realism
            data[idx] += (Math.random() - 0.5) * 5
            data[idx + 1] += (Math.random() - 0.5) * 5
            data[idx + 2] += (Math.random() - 0.5) * 5
            
            // Clamp values
            data[idx] = Math.max(0, Math.min(255, data[idx]))
            data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1]))
            data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2]))
          }
        }
      }
    }
    
    // Apply smoothing pass for better quality
    if (options.fillQuality !== 'fast') {
      this.smoothFillEdges(data, maskPixels, width, height)
    }
    
    resultCtx.putImageData(imageData, 0, 0)
    return resultCanvas
  }
  
  private smoothFillEdges(
    data: Uint8ClampedArray,
    maskPixels: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // Smooth the edges between filled and original areas
    const tempData = new Uint8ClampedArray(data)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        // Check if this is near a fill edge
        const isFilled = maskPixels[idx + 3] > 128
        let hasUnfilledNeighbor = false
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            
            const nidx = ((y + dy) * width + (x + dx)) * 4
            if (maskPixels[nidx + 3] < 128) {
              hasUnfilledNeighbor = true
              break
            }
          }
        }
        
        // Smooth edge pixels
        if (isFilled && hasUnfilledNeighbor) {
          let r = 0, g = 0, b = 0, count = 0
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nidx = ((y + dy) * width + (x + dx)) * 4
              r += tempData[nidx]
              g += tempData[nidx + 1]
              b += tempData[nidx + 2]
              count++
            }
          }
          
          data[idx] = Math.round(r / count)
          data[idx + 1] = Math.round(g / count)
          data[idx + 2] = Math.round(b / count)
        }
      }
    }
  }
} 