import { ObjectTool } from '../base/ObjectTool'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { ToolEvent, Selection } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { SmartSelectionIcon } from '@/components/editor/icons/AIToolIcons'

export interface SmartSelectionOptions {
  mode: 'refine' | 'expand' | 'contract'
  strength: number // 0-1, how aggressive the refinement should be
  smoothness: number // 0-1, edge smoothing
  feather: number // pixels
}

/**
 * AI-powered selection refinement tool
 * Takes a rough selection and uses AI to perfect the edges
 */
export class SmartSelectionTool extends ObjectTool {
  id = 'ai-smart-selection'
  name = 'Smart Selection'
  icon = SmartSelectionIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  private eventBus: TypedEventBus
  private isProcessing = false
  private currentSelection: Selection | null = null
  
  constructor() {
    super()
    this.replicateService = new ReplicateService()
    this.eventBus = new TypedEventBus()
  }
  
  async setupTool(): Promise<void> {
    // Tool-specific setup
    this.isProcessing = false
    this.currentSelection = null
  }
  
  async cleanupTool(): Promise<void> {
    // Tool-specific cleanup
    this.isProcessing = false
    this.currentSelection = null
  }
  
  getOptions(): SmartSelectionOptions {
    return {
      mode: 'refine',
      strength: 0.7,
      smoothness: 0.5,
      feather: 2
    }
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    await super.onActivate(canvas)
    
    // Get current selection if any
    const selectionManager = canvas.getSelectionManager()
    this.currentSelection = selectionManager.getSelection()
    
    if (!this.currentSelection) {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'info',
        message: 'Please make a rough selection first, then activate Smart Selection to refine it'
      })
    }
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (this.isProcessing) return
    
    const canvas = this.getCanvas()
    if (!canvas) return
    
    // If no existing selection, start a new rough selection
    if (!this.currentSelection) {
      // Start lasso-style selection
      this.startRoughSelection(event.point)
      return
    }
    
    // Otherwise, refine the existing selection
    await this.refineSelection()
  }
  
  private startRoughSelection(_point: { x: number; y: number }): void {
    // This would integrate with a basic lasso tool
    // For now, we'll assume the user has already made a selection
    this.eventBus.emit('tool.message', {
      toolId: this.id,
      type: 'info',
      message: 'Use the Lasso or Marquee tool to make a rough selection first'
    })
  }
  
  private async refineSelection(): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas || !this.currentSelection) return
    
    this.isProcessing = true
    const options = this.getOptions()
    
    try {
      // Show processing state
      const taskId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.started', {
        taskId,
        toolId: this.id,
        description: 'Refining selection with AI'
      })
      
      // Get the selection bounds and image data
      const bounds = this.getSelectionBounds(this.currentSelection)
      if (!bounds) {
        throw new Error('Unable to determine selection bounds')
      }
      
      // Extract the image data for the selection area
      const imageData = canvas.getImageData(bounds)
      
      // Convert to canvas for processing
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = bounds.width
      tempCanvas.height = bounds.height
      const ctx = tempCanvas.getContext('2d')!
      ctx.putImageData(imageData, 0, 0)
      
      // Create mask from current selection
      const maskCanvas = this.createSelectionMask(this.currentSelection, bounds)
      
      // In a real implementation, this would call an AI model
      // For now, we'll simulate the refinement
      const refinedMask = await this.simulateAIRefinement(
        tempCanvas,
        maskCanvas,
        options
      )
      
      // Apply the refined selection
      const refinedSelection: Selection = {
        type: 'pixel',
        bounds,
        mask: refinedMask
      }
      
      canvas.setSelection(refinedSelection)
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true
      })
      
    } catch (error) {
      console.error('Smart selection failed:', error)
      const errorTaskId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.failed', {
        taskId: errorTaskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      this.isProcessing = false
    }
  }
  
  private getSelectionBounds(selection: Selection): { x: number; y: number; width: number; height: number } | null {
    switch (selection.type) {
      case 'rectangle':
      case 'ellipse':
        return selection.bounds
      case 'pixel':
        return selection.bounds
      case 'polygon':
        // Calculate bounds from points
        const xs = selection.points.map(p => p.x)
        const ys = selection.points.map(p => p.y)
        return {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        }
      case 'objects':
        // Get bounds of selected objects
        const canvas = this.getCanvas()
        if (!canvas) return null
        
        const objects = selection.objectIds
          .map(id => canvas.getObject(id))
          .filter((obj): obj is CanvasObject => obj !== null)
        
        if (objects.length === 0) return null
        
        const left = Math.min(...objects.map(o => o.x))
        const top = Math.min(...objects.map(o => o.y))
        const right = Math.max(...objects.map(o => o.x + o.width))
        const bottom = Math.max(...objects.map(o => o.y + o.height))
        
        return {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top
        }
      default:
        return null
    }
  }
  
  private createSelectionMask(
    selection: Selection,
    bounds: { x: number; y: number; width: number; height: number }
  ): HTMLCanvasElement {
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = bounds.width
    maskCanvas.height = bounds.height
    const ctx = maskCanvas.getContext('2d')!
    
    // Fill with black (unselected)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, bounds.width, bounds.height)
    
    // Draw white (selected) based on selection type
    ctx.fillStyle = 'white'
    ctx.save()
    ctx.translate(-bounds.x, -bounds.y)
    
    switch (selection.type) {
      case 'rectangle':
        ctx.fillRect(
          selection.bounds.x,
          selection.bounds.y,
          selection.bounds.width,
          selection.bounds.height
        )
        break
        
      case 'ellipse':
        ctx.beginPath()
        ctx.ellipse(
          selection.bounds.x + selection.bounds.width / 2,
          selection.bounds.y + selection.bounds.height / 2,
          selection.bounds.width / 2,
          selection.bounds.height / 2,
          0,
          0,
          Math.PI * 2
        )
        ctx.fill()
        break
        
      case 'polygon':
        ctx.beginPath()
        selection.points.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        })
        ctx.closePath()
        ctx.fill()
        break
        
      case 'pixel':
        // Use existing mask
        if (selection.mask) {
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = selection.mask.width
          tempCanvas.height = selection.mask.height
          const tempCtx = tempCanvas.getContext('2d')!
          tempCtx.putImageData(selection.mask, 0, 0)
          ctx.drawImage(tempCanvas, selection.bounds.x, selection.bounds.y)
        }
        break
    }
    
    ctx.restore()
    return maskCanvas
  }
  
  private async simulateAIRefinement(
    imageCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    options: SmartSelectionOptions
  ): Promise<ImageData> {
    // In a real implementation, this would:
    // 1. Send the image and mask to an AI model
    // 2. Get back a refined mask
    // 3. Apply smoothing and feathering
    
    // For now, we'll simulate with edge detection and smoothing
    const ctx = maskCanvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    
    // Apply gaussian blur for smoothness
    if (options.smoothness > 0) {
      const blurRadius = Math.round(options.smoothness * 5)
      this.applyGaussianBlur(imageData, blurRadius)
    }
    
    // Apply feathering
    if (options.feather > 0) {
      this.applyFeather(imageData, options.feather)
    }
    
    // Adjust based on mode
    switch (options.mode) {
      case 'expand':
        this.dilateSelection(imageData, options.strength)
        break
      case 'contract':
        this.erodeSelection(imageData, options.strength)
        break
      case 'refine':
        // Edge detection would go here
        break
    }
    
    return imageData
  }
  
  private applyGaussianBlur(imageData: ImageData, radius: number): void {
    // Simple box blur as approximation
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const output = new Uint8ClampedArray(data)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let count = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4
              sum += data[idx + 3] // Alpha channel
              count++
            }
          }
        }
        
        const idx = (y * width + x) * 4
        output[idx + 3] = Math.round(sum / count)
      }
    }
    
    // Copy back
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = output[i + 3]
    }
  }
  
  private applyFeather(imageData: ImageData, featherRadius: number): void {
    // Apply distance-based falloff at edges
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    
    // Find edges
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const alpha = data[idx + 3]
        
        if (alpha > 0 && alpha < 255) {
          // Already partially transparent, enhance feathering
          const distance = this.getDistanceToEdge(imageData, x, y, featherRadius)
          const falloff = Math.min(1, distance / featherRadius)
          data[idx + 3] = Math.round(alpha * falloff)
        }
      }
    }
  }
  
  private getDistanceToEdge(
    imageData: ImageData,
    x: number,
    y: number,
    maxDistance: number
  ): number {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    
    for (let d = 1; d <= maxDistance; d++) {
      for (let dy = -d; dy <= d; dy++) {
        for (let dx = -d; dx <= d; dx++) {
          if (Math.abs(dx) !== d && Math.abs(dy) !== d) continue
          
          const nx = x + dx
          const ny = y + dy
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4
            if (data[idx + 3] === 0) {
              return d
            }
          }
        }
      }
    }
    
    return maxDistance
  }
  
  private dilateSelection(imageData: ImageData, strength: number): void {
    const radius = Math.round(strength * 5)
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const output = new Uint8ClampedArray(data)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let maxAlpha = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4
              maxAlpha = Math.max(maxAlpha, data[idx + 3])
            }
          }
        }
        
        const idx = (y * width + x) * 4
        output[idx + 3] = maxAlpha
      }
    }
    
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = output[i + 3]
    }
  }
  
  private erodeSelection(imageData: ImageData, strength: number): void {
    const radius = Math.round(strength * 5)
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const output = new Uint8ClampedArray(data)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minAlpha = 255
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4
              minAlpha = Math.min(minAlpha, data[idx + 3])
            }
          }
        }
        
        const idx = (y * width + x) * 4
        output[idx + 3] = minAlpha
      }
    }
    
    for (let i = 0; i < data.length; i += 4) {
      data[i + 3] = output[i + 3]
    }
  }
} 