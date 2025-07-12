import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { EventStore } from '@/lib/events/core/EventStore'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { nanoid } from 'nanoid'

export interface ClipboardData {
  objects: CanvasObject[]
  timestamp: number
}

/**
 * Configuration for ClipboardManager
 */
export interface ClipboardManagerConfig {
  persistence?: boolean
  validation?: boolean
  systemClipboard?: boolean
  maxClipboardSize?: number
}

/**
 * Manages clipboard operations for the canvas
 * Handles copy, cut, and paste operations with proper serialization
 */
export class ClipboardManager {
  private clipboard: ClipboardData | null = null
  private disposed = false
  
  constructor(
    private eventStore: EventStore,
    private typedEventBus: TypedEventBus,
    private config: ClipboardManagerConfig = {}
  ) {
    this.initialize()
  }
  
  private initialize(): void {
    this.setupEventHandlers()
    this.setupValidation()
  }
  
  private setupEventHandlers(): void {
    // Listen for clipboard events
    this.typedEventBus.on('clipboard.cut', (event) => {
      if (this.config.validation) {
        console.log(`[ClipboardManager] Cut operation: ${event.objects.length} objects`)
      }
    })
    
    this.typedEventBus.on('clipboard.paste', (event) => {
      if (this.config.validation) {
        console.log(`[ClipboardManager] Paste operation: ${event.objects.length} objects`)
      }
    })
  }
  
  private setupValidation(): void {
    if (!this.config.validation) return
    
    // Setup clipboard validation middleware
  }
  
  /**
   * Copy objects to clipboard
   */
  async copy(objects: CanvasObject[]): Promise<void> {
    if (this.disposed) {
      throw new Error('ClipboardManager has been disposed')
    }
    
    if (objects.length === 0) return
    
    // Check size limit
    if (this.config.maxClipboardSize && objects.length > this.config.maxClipboardSize) {
      throw new Error(`Cannot copy more than ${this.config.maxClipboardSize} objects`)
    }
    
    // Deep clone objects for clipboard
    const clonedObjects = objects.map(obj => this.cloneObject(obj))
    
    this.clipboard = {
      objects: clonedObjects,
      timestamp: Date.now()
    }
    
    // Copy to system clipboard if enabled
    if (this.config.systemClipboard && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        const json = JSON.stringify(this.clipboard)
        await navigator.clipboard.writeText(json)
      } catch {
        console.warn('Failed to copy to system clipboard')
      }
    }
    
    // Emit copy event
    this.typedEventBus.emit('clipboard.cut', { 
      canvasId: 'default',
      objects: clonedObjects,
      timestamp: Date.now()
    })
  }
  
  /**
   * Cut objects (copy and mark for deletion)
   */
  async cut(objects: CanvasObject[]): Promise<void> {
    if (this.disposed) {
      throw new Error('ClipboardManager has been disposed')
    }
    
    await this.copy(objects)
    
    // Emit cut event
    this.typedEventBus.emit('clipboard.cut', { 
      canvasId: 'default',
      objects,
      timestamp: Date.now()
    })
    
    // The actual deletion is handled by the CutCommand
  }
  
  /**
   * Paste objects from clipboard
   */
  async paste(canvas: CanvasManager): Promise<CanvasObject[]> {
    if (this.disposed) {
      throw new Error('ClipboardManager has been disposed')
    }
    
    // Try to read from system clipboard first if enabled
    if (this.config.systemClipboard && navigator.clipboard && navigator.clipboard.readText) {
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
    
    // Emit paste event
    this.typedEventBus.emit('clipboard.paste', { 
      canvasId: 'default',
      objects: pastedObjects,
      timestamp: Date.now()
    })
    
    return pastedObjects
  }
  
  /**
   * Check if clipboard has content
   */
  hasContent(): boolean {
    if (this.disposed) return false
    return this.clipboard !== null && this.clipboard.objects.length > 0
  }
  
  /**
   * Get clipboard content (read-only)
   */
  getContent(): ClipboardData | null {
    if (this.disposed) return null
    return this.clipboard ? { ...this.clipboard } : null
  }
  
  /**
   * Clear clipboard
   */
  clear(): void {
    if (this.disposed) return
    this.clipboard = null
  }
  
  /**
   * Get clipboard statistics
   */
  getStats(): { objectCount: number; timestamp: number | null; age: number | null } {
    if (this.disposed || !this.clipboard) {
      return { objectCount: 0, timestamp: null, age: null }
    }
    
    return {
      objectCount: this.clipboard.objects.length,
      timestamp: this.clipboard.timestamp,
      age: Date.now() - this.clipboard.timestamp
    }
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
      filters: obj.filters || [],
      adjustments: obj.adjustments || [],
      data: this.cloneData(obj.data)
    }
  }
  
  /**
   * Clone object data based on type
   */
  private cloneData(data: import('@/lib/editor/objects/types').ImageData | import('@/lib/editor/objects/types').TextData | import('@/lib/editor/objects/types').ShapeData | import('@/lib/editor/objects/types').GroupData | import('@/lib/editor/objects/types').FrameData): import('@/lib/editor/objects/types').ImageData | import('@/lib/editor/objects/types').TextData | import('@/lib/editor/objects/types').ShapeData | import('@/lib/editor/objects/types').GroupData | import('@/lib/editor/objects/types').FrameData {
    // Clone based on the actual data type
    if ('element' in data) {
      // ImageData
      return { ...data }
    }
    if ('content' in data) {
      // TextData
      return { ...data }
    }
    if ('preset' in data) {
      // FrameData
      return {
        ...data,
        style: {
          ...data.style,
          stroke: data.style.stroke ? { ...data.style.stroke } : data.style.stroke,
          background: data.style.background ? { ...data.style.background } : data.style.background
        },
        export: { ...data.export }
      }
    }
    if ('type' in data && data.type !== 'group') {
      // ShapeData
      const shapeData = data as import('@/lib/editor/objects/types').ShapeData
      return {
        ...shapeData,
        points: shapeData.points ? [...shapeData.points] : shapeData.points
      }
    }
    if ('children' in data) {
      // GroupData
      return {
        ...data,
        children: data.children ? [...data.children] : []
      }
    }
    return data
  }
  
  /**
   * Dispose the ClipboardManager and clean up resources
   */
  dispose(): void {
    if (this.disposed) return
    
    this.clear()
    this.disposed = true
    
    // Remove event listeners
    this.typedEventBus.clear('clipboard.cut')
    this.typedEventBus.clear('clipboard.paste')
  }
  
  /**
   * Check if the manager has been disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
} 