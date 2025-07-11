import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { nanoid } from 'nanoid'

export interface ClipboardData {
  objects: CanvasObject[]
  timestamp: number
}

/**
 * Manages clipboard operations for the canvas
 * Handles copy, cut, and paste operations with proper serialization
 */
export class ClipboardManager {
  private static instance: ClipboardManager
  private clipboard: ClipboardData | null = null
  
  private constructor() {}
  
  static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager()
    }
    return ClipboardManager.instance
  }
  
  /**
   * Copy objects to clipboard
   */
  async copy(objects: CanvasObject[]): Promise<void> {
    if (objects.length === 0) return
    
    // Deep clone objects for clipboard
    const clonedObjects = objects.map(obj => this.cloneObject(obj))
    
    this.clipboard = {
      objects: clonedObjects,
      timestamp: Date.now()
    }
    
    // Also copy to system clipboard as JSON if possible
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        const json = JSON.stringify(this.clipboard)
        await navigator.clipboard.writeText(json)
      } catch {
        console.warn('Failed to copy to system clipboard')
      }
    }
  }
  
  /**
   * Cut objects (copy and mark for deletion)
   */
  async cut(objects: CanvasObject[]): Promise<void> {
    await this.copy(objects)
    // The actual deletion is handled by the CutCommand
  }
  
  /**
   * Paste objects from clipboard
   */
  async paste(canvas: CanvasManager): Promise<CanvasObject[]> {
    // Try to read from system clipboard first
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        const text = await navigator.clipboard.readText()
        const data = JSON.parse(text) as ClipboardData
        if (data.objects && Array.isArray(data.objects)) {
          this.clipboard = data
        }
      } catch {
        // Fall back to internal clipboard
      }
    }
    
    if (!this.clipboard || this.clipboard.objects.length === 0) {
      return []
    }
    
    // Create new objects with offset
    const pastedObjects: CanvasObject[] = []
    const offset = 20 // Offset for pasted objects
    
    for (const obj of this.clipboard.objects) {
      const newObj = this.cloneObject(obj)
      
      // Generate new ID
      newObj.id = nanoid()
      
      // Offset position
      newObj.x += offset
      newObj.y += offset
      
      // Add to canvas
      const objectId = await canvas.addObject(newObj)
      
      // Get the actual object back from canvas
      const addedObj = canvas.getObject(objectId)
      if (addedObj) {
        pastedObjects.push(addedObj)
      }
    }
    
    return pastedObjects
  }
  
  /**
   * Check if clipboard has content
   */
  hasContent(): boolean {
    return this.clipboard !== null && this.clipboard.objects.length > 0
  }
  
  /**
   * Clear clipboard
   */
  clear(): void {
    this.clipboard = null
  }
  
  /**
   * Clone a canvas object
   */
  private cloneObject(obj: CanvasObject): CanvasObject {
    return {
      id: obj.id,
      type: obj.type,
      name: obj.name,
      visible: obj.visible,
      locked: obj.locked,
      opacity: obj.opacity,
      blendMode: obj.blendMode,
      // Copy individual transform properties instead of transform object
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      rotation: obj.rotation,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      zIndex: obj.zIndex,
      layerId: obj.layerId, // Keep for compatibility but will be managed by canvas
      data: this.cloneData(obj.data),
      filters: [...obj.filters],
      adjustments: [...obj.adjustments],
      children: obj.children ? [...obj.children] : undefined,
      metadata: obj.metadata ? { ...obj.metadata } : undefined
    }
  }
  
  /**
   * Clone object data based on type
   */
  private cloneData(data: import('@/lib/editor/objects/types').ImageData | import('@/lib/editor/objects/types').TextData | import('@/lib/editor/objects/types').ShapeData): import('@/lib/editor/objects/types').ImageData | import('@/lib/editor/objects/types').TextData | import('@/lib/editor/objects/types').ShapeData {
    // Clone based on the actual data type
    if ('element' in data) {
      // ImageData
      return { ...data }
    }
    if ('content' in data) {
      // TextData
      return { ...data }
    }
    if ('type' in data) {
      // ShapeData
      return {
        ...data,
        points: data.points ? [...data.points] : undefined
      }
    }
    return data
  }
} 