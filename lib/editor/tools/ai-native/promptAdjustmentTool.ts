import { ObjectTool } from '../base/ObjectTool'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'
import { isImageObject } from '@/lib/editor/objects/types'
import { PromptAdjustmentIcon } from '@/components/editor/icons/AIToolIcons'

export interface PromptAdjustmentOptions {
  prompt: string
  targetMode: 'selected' | 'clicked' | 'all'
  strength: number // 0-1, how much to apply the adjustment
  preserveOriginal: boolean // Keep original for comparison
}

interface AdjustmentPreset {
  keywords: string[]
  adjustment: (data: Uint8ClampedArray, strength: number) => void
}

/**
 * AI tool that applies natural language adjustments to images
 * Examples: "make it warmer", "increase contrast", "add vintage feel"
 */
export class PromptAdjustmentTool extends ObjectTool {
  id = 'ai-prompt-adjustment'
  name = 'Prompt Adjustment'
  icon = PromptAdjustmentIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  private eventBus: TypedEventBus
  private adjustmentPresets: AdjustmentPreset[]
  
  constructor() {
    super()
    this.replicateService = new ReplicateService()
    this.eventBus = new TypedEventBus()
    
    // Define adjustment presets for common prompts
    this.adjustmentPresets = [
      {
        keywords: ['warm', 'warmer', 'warmth'],
        adjustment: this.makeWarmer.bind(this)
      },
      {
        keywords: ['cool', 'cooler', 'cold'],
        adjustment: this.makeCooler.bind(this)
      },
      {
        keywords: ['bright', 'brighter', 'lighten'],
        adjustment: this.makeBrighter.bind(this)
      },
      {
        keywords: ['dark', 'darker', 'darken'],
        adjustment: this.makeDarker.bind(this)
      },
      {
        keywords: ['contrast', 'contrasty'],
        adjustment: this.increaseContrast.bind(this)
      },
      {
        keywords: ['soft', 'soften', 'smooth'],
        adjustment: this.makeSofter.bind(this)
      },
      {
        keywords: ['sharp', 'sharpen', 'crisp'],
        adjustment: this.makeSharper.bind(this)
      },
      {
        keywords: ['saturate', 'saturation', 'vibrant', 'vivid'],
        adjustment: this.increaseSaturation.bind(this)
      },
      {
        keywords: ['desaturate', 'muted', 'faded'],
        adjustment: this.decreaseSaturation.bind(this)
      },
      {
        keywords: ['vintage', 'retro', 'old', 'aged'],
        adjustment: this.makeVintage.bind(this)
      },
      {
        keywords: ['dreamy', 'ethereal', 'soft-focus'],
        adjustment: this.makeDreamy.bind(this)
      },
      {
        keywords: ['dramatic', 'moody', 'cinematic'],
        adjustment: this.makeDramatic.bind(this)
      }
    ]
  }
  
  async setupTool(): Promise<void> {
    // Initialize tool-specific resources
    // ReplicateService doesn't need initialization
    
    // Set default options using the options system
    // Options are handled by the base class
  }
  
  async cleanupTool(): Promise<void> {
    // Clean up resources
    this.adjustmentPresets = []
    
    // Reset any active operations
    // No persistent state to clean up for this tool
  }
  
  getOptions(): PromptAdjustmentOptions {
    return {
      prompt: '',
      targetMode: 'selected',
      strength: 0.7,
      preserveOriginal: false
    }
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    await super.onActivate(canvas)
    
    const options = this.getOptions()
    if (!options.prompt) {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'info',
        message: 'Enter a natural language prompt like "make it warmer" or "increase contrast"'
      })
    }
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const options = this.getOptions()
    
    if (!options.prompt || options.prompt.trim() === '') {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'error',
        message: 'Please enter an adjustment prompt first'
      })
      return
    }
    
    let targetObjects: CanvasObject[] = []
    
    if (options.targetMode === 'clicked') {
      // Apply to clicked object
      const clickedObject = canvas.getObjectAtPoint(event.point)
      if (clickedObject && isImageObject(clickedObject)) {
        targetObjects = [clickedObject]
      }
    } else if (options.targetMode === 'selected') {
      // Apply to selected objects
      const selectedIds = Array.from(canvas.state.selectedObjectIds)
      targetObjects = selectedIds
        .map(id => canvas.getObject(id))
        .filter(obj => obj && isImageObject(obj)) as (CanvasObject & { data: import('@/lib/editor/objects/types').ImageData })[]
    } else if (options.targetMode === 'all') {
      // Apply to all image objects
      targetObjects = canvas.getAllObjects().filter(isImageObject)
    }
    
    if (targetObjects.length === 0) {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'warning',
        message: 'No image objects to adjust. Select images or change target mode.'
      })
      return
    }
    
    await this.applyPromptAdjustments(targetObjects, options)
  }
  
  private async applyPromptAdjustments(
    objects: CanvasObject[],
    options: PromptAdjustmentOptions
  ): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    try {
      const taskId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.started', {
        taskId,
        toolId: this.id,
        description: `Adjusting with prompt: ${options.prompt}`
      })
      
      for (const object of objects) {
        if (!isImageObject(object)) continue
        
        // Preserve original if requested
        if (options.preserveOriginal) {
          await this.duplicateObject(object, { x: object.x + object.width + 20, y: object.y })
        }
        
        // Apply adjustment
        await this.adjustObject(object, options)
      }
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true
      })
      
    } catch (error) {
      console.error('Prompt adjustment failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  private async adjustObject(
    object: CanvasObject & { data: import('@/lib/editor/objects/types').ImageData },
    options: PromptAdjustmentOptions
  ): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    // Create canvas from object
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = object.width
    tempCanvas.height = object.height
    const ctx = tempCanvas.getContext('2d')!
    
    if (object.data.element instanceof HTMLImageElement) {
      ctx.drawImage(object.data.element, 0, 0, object.width, object.height)
    } else {
      ctx.drawImage(object.data.element, 0, 0)
    }
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    
    // In a real implementation, this would:
    // 1. Parse the natural language prompt
    // 2. Send to an AI model to understand the adjustment
    // 3. Apply the adjustment
    
    // For now, use preset adjustments based on keywords
    this.applyPresetAdjustments(imageData.data, options.prompt.toLowerCase(), options.strength)
    
    // Put back the adjusted data
    ctx.putImageData(imageData, 0, 0)
    
    // Create new image
    const blob = await new Promise<Blob>((resolve) => {
      tempCanvas.toBlob((blob) => resolve(blob!), 'image/png')
    })
    
    const url = URL.createObjectURL(blob)
    const img = new Image()
    
    img.onload = async () => {
      await canvas.updateObject(object.id, {
        data: {
          src: url,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          element: img
        },
        metadata: {
          ...object.metadata,
          lastPromptAdjustment: options.prompt,
          lastAdjustmentDate: new Date().toISOString()
        }
      })
    }
    
    img.src = url
  }
  
  private applyPresetAdjustments(data: Uint8ClampedArray, prompt: string, strength: number): void {
    // Check each preset
    for (const preset of this.adjustmentPresets) {
      const matches = preset.keywords.some(keyword => prompt.includes(keyword))
      if (matches) {
        preset.adjustment(data, strength)
      }
    }
    
    // Check for compound adjustments
    if (prompt.includes('more')) {
      strength *= 1.5 // Increase strength for "more" modifier
    } else if (prompt.includes('less') || prompt.includes('slight')) {
      strength *= 0.5 // Decrease strength for "less" modifier
    }
    
    // Check for specific combinations
    if (prompt.includes('warm') && prompt.includes('vintage')) {
      this.makeWarmer(data, strength * 0.5)
      this.makeVintage(data, strength)
    }
  }
  
  private async duplicateObject(
    object: CanvasObject,
    position: { x: number; y: number }
  ): Promise<CanvasObject | null> {
    const canvas = this.getCanvas()
    if (!canvas) return null
    
    const duplicate = {
      ...object,
      id: nanoid(),
      x: position.x,
      y: position.y,
      name: `${object.name} (Original)`
    }
    
    const id = await canvas.addObject(duplicate)
    return canvas.getObject(id)
  }
  
  // Adjustment implementations
  private makeWarmer(data: Uint8ClampedArray, strength: number): void {
    for (let i = 0; i < data.length; i += 4) {
      // Increase red, slightly increase green, decrease blue
      data[i] = Math.min(255, data[i] + strength * 30) // Red
      data[i + 1] = Math.min(255, data[i + 1] + strength * 10) // Green
      data[i + 2] = Math.max(0, data[i + 2] - strength * 20) // Blue
    }
  }
  
  private makeCooler(data: Uint8ClampedArray, strength: number): void {
    for (let i = 0; i < data.length; i += 4) {
      // Decrease red, slightly decrease green, increase blue
      data[i] = Math.max(0, data[i] - strength * 20) // Red
      data[i + 1] = Math.max(0, data[i + 1] - strength * 10) // Green
      data[i + 2] = Math.min(255, data[i + 2] + strength * 30) // Blue
    }
  }
  
  private makeBrighter(data: Uint8ClampedArray, strength: number): void {
    const factor = 1 + strength * 0.5
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor)
      data[i + 1] = Math.min(255, data[i + 1] * factor)
      data[i + 2] = Math.min(255, data[i + 2] * factor)
    }
  }
  
  private makeDarker(data: Uint8ClampedArray, strength: number): void {
    const factor = 1 - strength * 0.5
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * factor
      data[i + 1] = data[i + 1] * factor
      data[i + 2] = data[i + 2] * factor
    }
  }
  
  private increaseContrast(data: Uint8ClampedArray, strength: number): void {
    const factor = 1 + strength
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128))
    }
  }
  
  private makeSofter(data: Uint8ClampedArray, strength: number): void {
    // Simple box blur effect
    const width = Math.sqrt(data.length / 4)
    const tempData = new Uint8ClampedArray(data)
    const radius = Math.round(strength * 3)
    
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        let r = 0, g = 0, b = 0, count = 0
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < width) {
              const nidx = (ny * width + nx) * 4
              r += tempData[nidx]
              g += tempData[nidx + 1]
              b += tempData[nidx + 2]
              count++
            }
          }
        }
        
        data[idx] = r / count
        data[idx + 1] = g / count
        data[idx + 2] = b / count
      }
    }
  }
  
  private makeSharper(data: Uint8ClampedArray, strength: number): void {
    // Simple sharpening using unsharp mask
    const width = Math.sqrt(data.length / 4)
    const tempData = new Uint8ClampedArray(data)
    
    for (let y = 1; y < width - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        // Apply sharpening kernel
        const kernel = [
          0, -strength, 0,
          -strength, 1 + 4 * strength, -strength,
          0, -strength, 0
        ]
        
        for (let c = 0; c < 3; c++) {
          let sum = 0
          let ki = 0
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nidx = ((y + dy) * width + (x + dx)) * 4 + c
              sum += tempData[nidx] * kernel[ki++]
            }
          }
          
          data[idx + c] = Math.min(255, Math.max(0, sum))
        }
      }
    }
  }
  
  private increaseSaturation(data: Uint8ClampedArray, strength: number): void {
    const factor = 1 + strength
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      
      data[i] = Math.min(255, Math.max(0, gray + (r - gray) * factor))
      data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * factor))
      data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * factor))
    }
  }
  
  private decreaseSaturation(data: Uint8ClampedArray, strength: number): void {
    const factor = 1 - strength
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      
      data[i] = gray + (r - gray) * factor
      data[i + 1] = gray + (g - gray) * factor
      data[i + 2] = gray + (b - gray) * factor
    }
  }
  
  private makeVintage(data: Uint8ClampedArray, strength: number): void {
    for (let i = 0; i < data.length; i += 4) {
      // Sepia tone effect
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      const tr = 0.393 * r + 0.769 * g + 0.189 * b
      const tg = 0.349 * r + 0.686 * g + 0.168 * b
      const tb = 0.272 * r + 0.534 * g + 0.131 * b
      
      data[i] = Math.min(255, r * (1 - strength) + tr * strength)
      data[i + 1] = Math.min(255, g * (1 - strength) + tg * strength)
      data[i + 2] = Math.min(255, b * (1 - strength) + tb * strength)
    }
    
    // Add slight vignette
    const width = Math.sqrt(data.length / 4)
    const centerX = width / 2
    const centerY = width / 2
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)
    
    for (let y = 0; y < width; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        const vignette = 1 - (dist / maxDist) * strength * 0.5
        
        data[idx] *= vignette
        data[idx + 1] *= vignette
        data[idx + 2] *= vignette
      }
    }
  }
  
  private makeDreamy(data: Uint8ClampedArray, strength: number): void {
    // Soft glow effect
    this.makeSofter(data, strength * 0.5)
    this.makeBrighter(data, strength * 0.3)
    this.decreaseSaturation(data, strength * 0.2)
  }
  
  private makeDramatic(data: Uint8ClampedArray, strength: number): void {
    // High contrast with slight desaturation
    this.increaseContrast(data, strength)
    this.decreaseSaturation(data, strength * 0.3)
    this.makeDarker(data, strength * 0.2)
  }
} 