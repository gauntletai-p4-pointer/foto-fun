import { ObjectTool } from '../base/ObjectTool'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'
import { isImageObject } from '@/lib/editor/objects/types'
import { VariationGridIcon } from '@/components/editor/icons/AIToolIcons'

export interface VariationGridOptions {
  gridSize: 2 | 3 | 4 // 2x2, 3x3, or 4x4 grid
  variationStrength: number // 0-1, how different variations should be
  preserveOriginal: boolean // Include original in grid
  spacing: number // Pixels between variations
  prompt?: string // Optional prompt to guide variations
}

/**
 * AI tool that generates multiple variations of selected objects in a grid layout
 */
export class VariationGridTool extends ObjectTool {
  id = 'ai-variation-grid'
  name = 'Variation Grid'
  icon = VariationGridIcon
  cursor = 'crosshair'
  
  private replicateService: ReplicateService
  private eventBus: TypedEventBus
  private isProcessing = false
  
  constructor() {
    super()
    this.replicateService = new ReplicateService()
    this.eventBus = new TypedEventBus()
  }
  
  async setupTool(): Promise<void> {
    // Initialize tool-specific resources
    this.isProcessing = false
  }
  
  async cleanupTool(): Promise<void> {
    // Clean up resources
    this.isProcessing = false
  }
  
  getOptions(): VariationGridOptions {
    return {
      gridSize: 3,
      variationStrength: 0.5,
      preserveOriginal: true,
      spacing: 20,
      prompt: ''
    }
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    await super.onActivate(canvas)
    
    const selectedObjects = this.getTargetObjects()
    if (selectedObjects.length === 0) {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'info',
        message: 'Select one or more objects to generate variations'
      })
    }
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (this.isProcessing) return
    
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const selectedObjects = this.getTargetObjects()
    if (selectedObjects.length === 0) {
      // Try to select object at click point
      const object = canvas.getObjectAtPoint(event.point)
      if (object) {
        canvas.selectObject(object.id)
        await this.generateVariations([object])
      } else {
        this.eventBus.emit('tool.message', {
          toolId: this.id,
          type: 'warning',
          message: 'No object selected. Click on an object or select one first.'
        })
      }
    } else {
      await this.generateVariations(selectedObjects)
    }
  }
  
  private async generateVariations(objects: CanvasObject[]): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    // Filter to only image objects
    const imageObjects = objects.filter(isImageObject)
    if (imageObjects.length === 0) {
      this.eventBus.emit('tool.message', {
        toolId: this.id,
        type: 'warning',
        message: 'Please select image objects to generate variations'
      })
      return
    }
    
    this.isProcessing = true
    const options = this.getOptions()
    
    try {
      const taskId = `${this.id}-${Date.now()}`
      this.eventBus.emit('ai.processing.started', {
        taskId,
        toolId: this.id,
        description: 'Generating image variations'
      })
      
      // Process each selected image
      for (const imageObject of imageObjects) {
        await this.generateVariationsForObject(imageObject, options)
      }
      
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true
      })
      
    } catch (error) {
      console.error('Variation generation failed:', error)
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
  
  private async generateVariationsForObject(
    imageObject: CanvasObject,
    options: VariationGridOptions
  ): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    const totalVariations = options.gridSize * options.gridSize
    const includeOriginal = options.preserveOriginal
    const variationsToGenerate = includeOriginal ? totalVariations - 1 : totalVariations
    
    // Create a group for the variations
    const groupId = await canvas.addObject({
      type: 'group',
      name: `${imageObject.name} Variations`,
      x: imageObject.x,
      y: imageObject.y + imageObject.height + options.spacing,
      width: imageObject.width * options.gridSize + options.spacing * (options.gridSize - 1),
      height: imageObject.height * options.gridSize + options.spacing * (options.gridSize - 1),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      filters: [],
      adjustments: [],
      children: [],
      data: {
        type: 'rectangle' as const,
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
        points: [] // Required for shape data
      } as import('@/lib/editor/objects/types').ShapeData,
      metadata: {
        isVariationGrid: true,
        originalObjectId: imageObject.id,
        gridSize: options.gridSize
      }
    })
    
    // Calculate positions for grid
    const cellWidth = imageObject.width
    const cellHeight = imageObject.height
    const positions: Array<{ x: number; y: number }> = []
    
    for (let row = 0; row < options.gridSize; row++) {
      for (let col = 0; col < options.gridSize; col++) {
        positions.push({
          x: imageObject.x + col * (cellWidth + options.spacing),
          y: imageObject.y + imageObject.height + options.spacing + row * (cellHeight + options.spacing)
        })
      }
    }
    
    // Add original if requested
    let currentIndex = 0
    if (includeOriginal) {
      const originalCopy = await this.duplicateObject(imageObject, positions[0])
      if (originalCopy) {
        await canvas.updateObject(originalCopy.id, {
          name: `${imageObject.name} (Original)`,
          metadata: {
            ...originalCopy.metadata,
            isOriginalInGrid: true
          }
        })
        await this.addToGroup(canvas as CanvasManager, groupId, originalCopy.id)
        currentIndex++
      }
    }
    
    // Generate variations
    const variations = await this.generateImageVariations(
      imageObject,
      variationsToGenerate,
      options
    )
    
    // Place variations in grid
    for (const variation of variations) {
      if (currentIndex >= positions.length) break
      
      const position = positions[currentIndex]
      const variationObject = await canvas.addObject({
        type: 'image',
        name: `${imageObject.name} Variation ${currentIndex}`,
        x: position.x,
        y: position.y,
        width: cellWidth,
        height: cellHeight,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: false,
        filters: [],
        adjustments: [],
        data: {
          src: variation.src,
          naturalWidth: variation.naturalWidth,
          naturalHeight: variation.naturalHeight,
          element: variation.element
        },
        metadata: {
          isVariation: true,
          originalObjectId: imageObject.id,
          variationIndex: currentIndex
        }
      })
      
      await this.addToGroup(canvas as CanvasManager, groupId, variationObject)
      currentIndex++
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
      name: `${object.name} Copy`
    }
    
    const id = await canvas.addObject(duplicate)
    return canvas.getObject(id)
  }
  
  private async addToGroup(
    canvas: CanvasManager,
    groupId: string,
    objectId: string
  ): Promise<void> {
    const group = canvas.getObject(groupId)
    if (group && group.type === 'group') {
      const children = group.children || []
      children.push(objectId)
      await canvas.updateObject(groupId, { children })
    }
  }
  
  private async generateImageVariations(
    imageObject: CanvasObject,
    count: number,
    options: VariationGridOptions
  ): Promise<Array<{ src: string; naturalWidth: number; naturalHeight: number; element: HTMLImageElement }>> {
    // Extract image data
    const canvas = this.getCanvas()
    if (!canvas || !isImageObject(imageObject)) return []
    
    const imageData = imageObject.data
    const variations: Array<{ src: string; naturalWidth: number; naturalHeight: number; element: HTMLImageElement }> = []
    
    // In a real implementation, this would:
    // 1. Convert the image to base64
    // 2. Send to AI model with variation parameters
    // 3. Get back multiple variations
    
    // For now, simulate with filters and transformations
    for (let i = 0; i < count; i++) {
      const variation = await this.simulateVariation(
        imageData.element,
        options.variationStrength,
        i
      )
      variations.push(variation)
    }
    
    return variations
  }
  
  private async simulateVariation(
    sourceElement: HTMLImageElement | HTMLCanvasElement,
    strength: number,
    index: number
  ): Promise<{ src: string; naturalWidth: number; naturalHeight: number; element: HTMLImageElement }> {
    // Create canvas for variation
    const canvas = document.createElement('canvas')
    canvas.width = sourceElement.width
    canvas.height = sourceElement.height
    const ctx = canvas.getContext('2d')!
    
    // Draw original
    ctx.drawImage(sourceElement, 0, 0)
    
    // Apply random variations based on strength
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    
    // Simulate different variations
    switch (index % 4) {
      case 0: // Brightness variation
        this.adjustBrightness(data, strength * 0.5 * (Math.random() - 0.5))
        break
      case 1: // Contrast variation
        this.adjustContrast(data, 1 + strength * 0.5 * (Math.random() - 0.5))
        break
      case 2: // Hue shift
        this.adjustHue(data, strength * 180 * (Math.random() - 0.5))
        break
      case 3: // Saturation variation
        this.adjustSaturation(data, 1 + strength * (Math.random() - 0.5))
        break
    }
    
    // Add slight noise for variation
    this.addNoise(data, strength * 0.1)
    
    ctx.putImageData(imageData, 0, 0)
    
    // Convert to image
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png')
    })
    
    const url = URL.createObjectURL(blob)
    const img = new Image()
    
    return new Promise((resolve) => {
      img.onload = () => {
        resolve({
          src: url,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          element: img
        })
      }
      img.src = url
    })
  }
  
  private adjustBrightness(data: Uint8ClampedArray, amount: number): void {
    const factor = 1 + amount
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * factor))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor))
    }
  }
  
  private adjustContrast(data: Uint8ClampedArray, amount: number): void {
    const factor = amount
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128))
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128))
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128))
    }
  }
  
  private adjustHue(data: Uint8ClampedArray, degrees: number): void {
    const radians = degrees * Math.PI / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // Convert to HSL and back (simplified)
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2
      
      if (max !== min) {
        const d = max - min
        const _s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        
        // Apply hue rotation (simplified)
        data[i] = Math.min(255, Math.max(0, r * cos - g * sin))
        data[i + 1] = Math.min(255, Math.max(0, r * sin + g * cos))
        // Keep blue channel similar
      }
    }
  }
  
  private adjustSaturation(data: Uint8ClampedArray, amount: number): void {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      
      data[i] = Math.min(255, Math.max(0, gray + (r - gray) * amount))
      data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * amount))
      data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * amount))
    }
  }
  
  private addNoise(data: Uint8ClampedArray, amount: number): void {
    const noiseAmount = amount * 255
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * noiseAmount
      data[i] = Math.min(255, Math.max(0, data[i] + noise))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
    }
  }
} 