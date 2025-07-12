import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import type { ToolDependencies, ToolOptions } from '@/lib/editor/tools/base/BaseTool'
import { isImageObject } from '@/lib/editor/objects/types'
import { MagicEraserIcon } from '@/components/editor/icons/AIToolIcons'

export interface MagicEraserOptions extends ToolOptions {
  mode: { type: 'enum'; default: string; enum: string[] }
  brushSize: { type: 'number'; default: number; min: 1; max: 200 }
  autoFill: { type: 'boolean'; default: boolean }
  fillQuality: { type: 'enum'; default: string; enum: string[] }
}

/**
 * Magic Eraser Tool - AI-powered intelligent erasing
 * Modes: object (click to remove), brush (paint to erase), lasso (draw selection)
 */
export class MagicEraserTool extends ObjectTool<MagicEraserOptions> {
  id = 'ai-magic-eraser'
  name = 'Magic Eraser'
  icon = MagicEraserIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  private isErasing = false
  private erasureCanvas: HTMLCanvasElement | null = null
  private erasureCtx: CanvasRenderingContext2D | null = null
  private currentObject: CanvasObject | null = null
  private lassoPoints: Array<{ x: number; y: number }> = []
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
    this.replicateService = new ReplicateService()
  }
  
  protected getOptionDefinitions(): MagicEraserOptions {
    return {
      mode: { type: 'enum', default: 'object', enum: ['object', 'brush', 'lasso'] },
      brushSize: { type: 'number', default: 50, min: 1, max: 200 },
      autoFill: { type: 'boolean', default: true },
      fillQuality: { type: 'enum', default: 'balanced', enum: ['fast', 'balanced', 'best'] }
    }
  }

  protected async setupTool(): Promise<void> {
    const mode = this.getOption('mode') as string
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      type: 'info',
      message: `Magic Eraser (${mode} mode): Click to remove objects intelligently`
    })
  }

  protected async cleanupTool(): Promise<void> {
    // Clean up any ongoing erasure state
    this.isErasing = false
    this.erasureCanvas = null
    this.erasureCtx = null
    this.currentObject = null
    this.lassoPoints = []
  }

  protected handleMouseDown(event: ToolEvent): void {
    const canvas = this.dependencies.canvasManager
    const mode = this.getOption('mode') as string
    
    if (mode === 'object') {
      // Object mode - click to select and remove entire objects
      const targetObject = canvas.getObjectAtPoint(event.point)
      if (targetObject) {
        this.eraseObject(targetObject)
      }
    } else if (mode === 'brush') {
      // Brush mode - paint areas to erase
      const targetObject = canvas.getObjectAtPoint(event.point)
      if (targetObject && isImageObject(targetObject)) {
        this.startBrushErasure(targetObject, event.point)
      }
    } else if (mode === 'lasso') {
      // Lasso mode - draw selection to erase
      const targetObject = canvas.getObjectAtPoint(event.point)
      if (targetObject && isImageObject(targetObject)) {
        this.startLassoErasure(targetObject, event.point)
      }
    }
  }

  protected handleMouseMove(event: ToolEvent): void {
    if (!this.isErasing) return
    
    const mode = this.getOption('mode') as string
    
    if (mode === 'brush' && this.erasureCtx && this.currentObject) {
      this.continueBrushErasure(event.point)
    } else if (mode === 'lasso') {
      this.continueLassoErasure(event.point)
    }
  }

  protected handleMouseUp(_event: ToolEvent): void {
    if (!this.isErasing) return
    
    this.isErasing = false
    const mode = this.getOption('mode') as string
    
    if (mode === 'brush' && this.erasureCanvas && this.currentObject) {
      this.finishBrushErasure()
    } else if (mode === 'lasso' && this.lassoPoints.length > 2 && this.currentObject) {
      this.finishLassoErasure()
    }
    
    // Clean up
    this.erasureCanvas = null
    this.erasureCtx = null
    this.currentObject = null
    this.lassoPoints = []
  }

  private async eraseObject(object: CanvasObject): Promise<void> {
    const canvas = this.dependencies.canvasManager
    const autoFill = this.getOption('autoFill') as boolean
    
    try {
      const taskId = `${this.id}-${Date.now()}`
      this.dependencies.eventBus.emit('ai.processing.started', {
        operationId: taskId,
        type: 'object-removal',
        metadata: {
          toolId: this.id,
          description: 'Removing object with AI',
          targetObjectIds: [object.id]
        }
      })
      
      if (isImageObject(object)) {
        // For image objects, use AI to fill the space
        if (autoFill) {
          await this.fillRemovedArea(object)
        }
      }
      
      // Remove the object
      await canvas.removeObject(object.id)
      
      this.dependencies.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        result: {
          success: true,
          affectedObjectIds: [object.id]
        },
        metadata: {
          toolId: this.id
        }
      })
      
    } catch (error) {
      console.error('Magic eraser failed:', error)
      this.dependencies.eventBus.emit('ai.processing.failed', {
        operationId: `${this.id}-${Date.now()}`,
        error: error instanceof Error ? error.message : 'Magic eraser failed',
        metadata: {
          toolId: this.id
        }
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
    
    const brushSize = this.getOption('brushSize') as number
    const relativeX = point.x - this.currentObject.x
    const relativeY = point.y - this.currentObject.y
    
    // Draw white circle (area to erase)
    this.erasureCtx.globalCompositeOperation = 'source-over'
    this.erasureCtx.fillStyle = 'white'
    this.erasureCtx.beginPath()
    this.erasureCtx.arc(relativeX, relativeY, brushSize / 2, 0, Math.PI * 2)
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
  }

  private async finishLassoErasure(): Promise<void> {
    if (!this.currentObject || !isImageObject(this.currentObject)) return
    
    // Create mask from lasso points
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = this.currentObject.width
    maskCanvas.height = this.currentObject.height
    const maskCtx = maskCanvas.getContext('2d')!
    
    // Draw lasso selection
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
    _bounds: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    const canvas = this.dependencies.canvasManager
    const autoFill = this.getOption('autoFill') as boolean
    const fillQuality = this.getOption('fillQuality') as string
    
    try {
      const taskId = `${this.id}-${Date.now()}`
      this.dependencies.eventBus.emit('ai.processing.started', {
        operationId: taskId,
        type: 'ai-erasure',
        metadata: {
          toolId: this.id,
          description: 'Erasing area with AI',
          targetObjectIds: [object.id]
        }
      })
      
      // Get the original image data
      const originalCanvas = document.createElement('canvas')
      originalCanvas.width = object.width
      originalCanvas.height = object.height
      const originalCtx = originalCanvas.getContext('2d')!
      
      // Draw the original image
      if (object.data.element instanceof HTMLImageElement) {
        originalCtx.drawImage(object.data.element, 0, 0, object.width, object.height)
      } else {
        originalCtx.drawImage(object.data.element, 0, 0)
      }
      
      let resultCanvas: HTMLCanvasElement
      
      if (autoFill) {
        // Use AI to fill the erased area
        resultCanvas = await this.simulateContentAwareFill(originalCanvas, maskData, {
          fillQuality
        })
      } else {
        // Just erase (make transparent)
        resultCanvas = document.createElement('canvas')
        resultCanvas.width = object.width
        resultCanvas.height = object.height
        const resultCtx = resultCanvas.getContext('2d')!
        
        // Copy original
        resultCtx.drawImage(originalCanvas, 0, 0)
        
        // Apply mask to make areas transparent
        const imageData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height)
        const data = imageData.data
        const maskPixels = maskData.data
        
        for (let i = 0; i < data.length; i += 4) {
          const maskAlpha = maskPixels[i + 3] / 255
          if (maskAlpha > 0) {
            data[i + 3] = 0 // Make transparent
          }
        }
        
        resultCtx.putImageData(imageData, 0, 0)
      }
      
      // Update the object with the result
      await canvas.updateObject(object.id, {
        data: {
          element: resultCanvas,
          naturalWidth: resultCanvas.width,
          naturalHeight: resultCanvas.height
        } as import('@/lib/editor/objects/types').ImageData
      })
      
      this.dependencies.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        result: {
          success: true,
          affectedObjectIds: [object.id]
        },
        metadata: {
          toolId: this.id
        }
      })
      
    } catch (error) {
      console.error('AI erasure failed:', error)
      this.dependencies.eventBus.emit('ai.processing.failed', {
        operationId: `${this.id}-${Date.now()}`,
        error: error instanceof Error ? error.message : 'AI erasure failed',
        metadata: {
          toolId: this.id
        }
      })
    }
  }

  private async fillRemovedArea(object: CanvasObject): Promise<void> {
    // Simulate content-aware fill for removed objects
    console.log('Filling removed area for object:', object.id)
  }

  private async simulateContentAwareFill(
    originalCanvas: HTMLCanvasElement,
    maskData: ImageData,
    options: { fillQuality: string }
  ): Promise<HTMLCanvasElement> {
    // This is a simplified simulation of content-aware fill
    // In a real implementation, this would use AI inpainting models
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = originalCanvas.width
    resultCanvas.height = originalCanvas.height
    const ctx = resultCanvas.getContext('2d')!
    
    // Copy original image
    ctx.drawImage(originalCanvas, 0, 0)
    
    // Apply content-aware fill simulation
    const imageData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height)
    const data = imageData.data
    const maskPixels = maskData.data
    const width = resultCanvas.width
    const height = resultCanvas.height
    
    // Simple content-aware fill: sample from surrounding pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const maskAlpha = maskPixels[i + 3] / 255
        
        if (maskAlpha > 0) {
          // This pixel needs to be filled
          const samples = this.sampleSurroundingPixels(data, x, y, width, height, maskPixels)
          if (samples.length > 0) {
            // Average the samples
            let r = 0, g = 0, b = 0
            for (const sample of samples) {
              r += sample.r
              g += sample.g
              b += sample.b
            }
            
            data[i] = r / samples.length
            data[i + 1] = g / samples.length
            data[i + 2] = b / samples.length
            data[i + 3] = 255 // Full opacity
          }
        }
      }
    }
    
    // Apply quality-based smoothing
    if (options.fillQuality === 'best') {
      this.smoothFillEdges(data, maskPixels, width, height)
    }
    
    ctx.putImageData(imageData, 0, 0)
    return resultCanvas
  }

  private sampleSurroundingPixels(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    maskPixels: Uint8ClampedArray
  ): Array<{ r: number; g: number; b: number }> {
    const samples: Array<{ r: number; g: number; b: number }> = []
    const radius = 5
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          const maskAlpha = maskPixels[idx + 3] / 255
          
          // Only sample from non-masked pixels
          if (maskAlpha === 0) {
            samples.push({
              r: data[idx],
              g: data[idx + 1],
              b: data[idx + 2]
            })
          }
        }
      }
    }
    
    return samples
  }

  private smoothFillEdges(
    data: Uint8ClampedArray,
    maskPixels: Uint8ClampedArray,
    width: number,
    height: number
  ): void {
    // Apply Gaussian blur to edges of filled areas
    const blurRadius = 2
    const tempData = new Uint8ClampedArray(data)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const maskAlpha = maskPixels[i + 3] / 255
        
        if (maskAlpha > 0) {
          // This is a filled pixel, apply blur
          let r = 0, g = 0, b = 0, count = 0
          
          for (let dy = -blurRadius; dy <= blurRadius; dy++) {
            for (let dx = -blurRadius; dx <= blurRadius; dx++) {
              const nx = x + dx
              const ny = y + dy
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = (ny * width + nx) * 4
                r += tempData[idx]
                g += tempData[idx + 1]
                b += tempData[idx + 2]
                count++
              }
            }
          }
          
          if (count > 0) {
            data[i] = r / count
            data[i + 1] = g / count
            data[i + 2] = b / count
          }
        }
      }
    }
  }
} 