import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import type { ToolDependencies, ToolOptions } from '@/lib/editor/tools/base/BaseTool'
import { isImageObject } from '@/lib/editor/objects/types'
import { AIPromptBrushIcon } from '@/components/editor/icons/AIToolIcons'

export interface AIPromptBrushOptions extends ToolOptions {
  brushSize: { type: 'number'; default: number; min: 1; max: 200 }
  prompt: { type: 'string'; default: string }
  strength: { type: 'number'; default: number; min: 0; max: 1 }
  blendMode: { type: 'enum'; default: string; enum: string[] }
  feather: { type: 'number'; default: number; min: 0; max: 50 }
}

interface BrushStroke {
  points: Array<{ x: number; y: number }>
  size: number
  objectId: string
}

/**
 * AI brush that applies prompts to painted areas
 * Example: Paint "make it golden" to turn painted areas golden
 */
export class AIPromptBrush extends ObjectTool<AIPromptBrushOptions> {
  id = 'ai-prompt-brush'
  name = 'AI Prompt Brush'
  icon = AIPromptBrushIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  protected isDrawing = false
  private currentStroke: BrushStroke | null = null
  private strokeCanvas: HTMLCanvasElement | null = null
  private strokeCtx: CanvasRenderingContext2D | null = null
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
    this.replicateService = new ReplicateService()
  }
  
  protected getOptionDefinitions(): AIPromptBrushOptions {
    return {
      brushSize: { type: 'number', default: 50, min: 1, max: 200 },
      prompt: { type: 'string', default: 'make it beautiful' },
      strength: { type: 'number', default: 0.8, min: 0, max: 1 },
      blendMode: { type: 'enum', default: 'blend', enum: ['replace', 'blend', 'overlay'] },
      feather: { type: 'number', default: 10, min: 0, max: 50 }
    }
  }
  
  protected async setupTool(): Promise<void> {
    // Initialize stroke canvas
    this.strokeCanvas = document.createElement('canvas')
    this.strokeCtx = this.strokeCanvas.getContext('2d')
    
    // Check if prompt is set
    const prompt = this.getOption('prompt') as string
    if (!prompt || prompt.trim() === '') {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'warning',
        message: 'Please set a prompt in the tool options before painting'
      })
    }
  }
  
  protected async cleanupTool(): Promise<void> {
    // Clean up resources
    this.isDrawing = false
    this.currentStroke = null
    this.strokeCanvas = null
    this.strokeCtx = null
  }
  
  protected handleMouseDown(event: ToolEvent): void {
    const canvas = this.dependencies.canvasManager
    const prompt = this.getOption('prompt') as string
    
    if (!prompt || prompt.trim() === '') {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'error',
        message: 'No prompt set. Please enter a prompt in the tool options.'
      })
      return
    }
    
    // Find the object under the cursor
    const targetObject = canvas.getObjectAtPoint(event.point)
    if (!targetObject || !isImageObject(targetObject)) {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'info',
        message: 'Click and drag on an image to apply the AI prompt'
      })
      return
    }
    
    // Initialize stroke
    this.isDrawing = true
    this.currentStroke = {
      points: [event.point],
      size: this.getOption('brushSize') as number,
      objectId: targetObject.id
    }
    
    // Create stroke canvas
    this.strokeCanvas = document.createElement('canvas')
    this.strokeCanvas.width = targetObject.width
    this.strokeCanvas.height = targetObject.height
    this.strokeCtx = this.strokeCanvas.getContext('2d')!
    
    // Start drawing the stroke
    this.drawStrokePoint(event.point, targetObject)
  }
  
  protected handleMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.strokeCtx) return
    
    const canvas = this.dependencies.canvasManager
    const targetObject = canvas.getObject(this.currentStroke.objectId)
    if (!targetObject) return
    
    // Add point to stroke
    this.currentStroke.points.push(event.point)
    
    // Draw the stroke point
    this.drawStrokePoint(event.point, targetObject)
    
    // Show preview (optional)
    this.updatePreview()
  }
  
  protected handleMouseUp(_event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.strokeCanvas) return
    
    this.isDrawing = false
    
    const canvas = this.dependencies.canvasManager
    const targetObject = canvas.getObject(this.currentStroke.objectId)
    if (!targetObject || !isImageObject(targetObject)) return
    
    // Apply the AI prompt to the painted area
    this.applyPromptToStroke(targetObject, this.strokeCanvas)
    
    // Clean up
    this.currentStroke = null
    this.strokeCanvas = null
    this.strokeCtx = null
  }
  
  private drawStrokePoint(point: { x: number; y: number }, targetObject: CanvasObject): void {
    if (!this.strokeCtx) return
    
    const brushSize = this.getOption('brushSize') as number
    const feather = this.getOption('feather') as number
    const relativeX = point.x - targetObject.x
    const relativeY = point.y - targetObject.y
    
    // Draw with feathered brush
    const gradient = this.strokeCtx.createRadialGradient(
      relativeX, relativeY, 0,
      relativeX, relativeY, brushSize / 2
    )
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1 - feather / brushSize, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    
    this.strokeCtx.globalCompositeOperation = 'source-over'
    this.strokeCtx.fillStyle = gradient
    this.strokeCtx.beginPath()
    this.strokeCtx.arc(relativeX, relativeY, brushSize / 2, 0, Math.PI * 2)
    this.strokeCtx.fill()
  }
  
  private updatePreview(): void {
    // Could show a real-time preview of the effect
    // For now, just show the brush stroke
  }
  
  private async applyPromptToStroke(
    targetObject: CanvasObject & { data: import('@/lib/editor/objects/types').ImageData },
    strokeCanvas: HTMLCanvasElement
  ): Promise<void> {
    const canvas = this.dependencies.canvasManager
    const prompt = this.getOption('prompt') as string
    
    try {
      const taskId = `${this.id}-${Date.now()}`
      this.dependencies.eventBus.emit('ai.processing.started', {
        operationId: taskId,
        type: 'ai-prompt-brush',
        metadata: {
          toolId: this.id,
          description: `AI painting with prompt: ${prompt}`,
          targetObjectIds: [targetObject.id]
        }
      })
      
      // Get the stroke mask
      const maskData = this.createMaskFromStroke(strokeCanvas)
      
      // Get the original image data
      const originalCanvas = document.createElement('canvas')
      originalCanvas.width = targetObject.width
      originalCanvas.height = targetObject.height
      const originalCtx = originalCanvas.getContext('2d')!
      
      // Draw the original image
      if (targetObject.data.element instanceof HTMLImageElement) {
        originalCtx.drawImage(targetObject.data.element, 0, 0, targetObject.width, targetObject.height)
      } else {
        originalCtx.drawImage(targetObject.data.element, 0, 0)
      }
      
      // Apply the prompt effect (simulated for now)
      const strength = this.getOption('strength') as number
      const blendMode = this.getOption('blendMode') as string
      const enhancedCanvas = await this.simulatePromptEffect(originalCanvas, maskData, {
        prompt,
        strength,
        blendMode
      })
      
      // Update the object with the enhanced image
      await canvas.updateObject(targetObject.id, {
        data: {
          element: enhancedCanvas,
          naturalWidth: enhancedCanvas.width,
          naturalHeight: enhancedCanvas.height
        } as import('@/lib/editor/objects/types').ImageData
      })
      
      this.dependencies.eventBus.emit('ai.processing.completed', {
        operationId: taskId,
        result: {
          success: true,
          affectedObjectIds: [targetObject.id]
        },
        metadata: {
          toolId: this.id
        }
      })
      
    } catch (error) {
      console.error('AI prompt brush failed:', error)
      this.dependencies.eventBus.emit('ai.processing.failed', {
        operationId: `${this.id}-${Date.now()}`,
        error: error instanceof Error ? error.message : 'AI prompt brush failed',
        metadata: {
          toolId: this.id
        }
      })
    }
  }
  
  private createMaskFromStroke(strokeCanvas: HTMLCanvasElement): ImageData {
    const ctx = strokeCanvas.getContext('2d')!
    return ctx.getImageData(0, 0, strokeCanvas.width, strokeCanvas.height)
  }
  
  private async simulatePromptEffect(
    originalCanvas: HTMLCanvasElement,
    maskData: ImageData,
    options: { prompt: string; strength: number; blendMode: string }
  ): Promise<HTMLCanvasElement> {
    // This is a simplified simulation
    // In a real implementation, this would call the AI service
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = originalCanvas.width
    resultCanvas.height = originalCanvas.height
    const ctx = resultCanvas.getContext('2d')!
    
    // Copy original image
    ctx.drawImage(originalCanvas, 0, 0)
    
    // Apply simple color transformation based on prompt
    const imageData = ctx.getImageData(0, 0, resultCanvas.width, resultCanvas.height)
    const data = imageData.data
    const maskPixels = maskData.data
    
    for (let i = 0; i < data.length; i += 4) {
      const maskAlpha = maskPixels[i + 3] / 255
      if (maskAlpha > 0) {
        // Simple color transformation based on prompt keywords
        const strength = options.strength * maskAlpha
        
        if (options.prompt.toLowerCase().includes('golden')) {
          data[i] = Math.min(255, data[i] + strength * 50)     // Red
          data[i + 1] = Math.min(255, data[i + 1] + strength * 30) // Green
          data[i + 2] = Math.max(0, data[i + 2] - strength * 20)   // Blue
        } else if (options.prompt.toLowerCase().includes('blue')) {
          data[i + 2] = Math.min(255, data[i + 2] + strength * 50) // Blue
        } else if (options.prompt.toLowerCase().includes('warm')) {
          data[i] = Math.min(255, data[i] + strength * 30)     // Red
          data[i + 1] = Math.min(255, data[i + 1] + strength * 15) // Green
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    return resultCanvas
  }
} 