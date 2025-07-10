import { SelectionManager, type SelectionMode as BaseSelectionMode } from './SelectionManager'
import { ObjectPixelCache } from './ObjectPixelCache'
import type { Canvas, FabricObject, Path } from 'fabric'
import type { PixelSelection, BoundingBox } from '@/types'
import { useObjectRegistryStore } from '@/store/objectRegistryStore'

export type SelectionTargetMode = 'global' | 'object' | 'layer'

/**
 * LayerAwareSelectionManager - Extends SelectionManager to support object-aware selections
 * 
 * This class manages selections per object/layer instead of just globally,
 * enabling professional image editing capabilities where selections can be
 * constrained to specific objects or layers.
 */
export class LayerAwareSelectionManager extends SelectionManager {
  // Per-object selection masks
  private objectSelections: Map<string, PixelSelection> = new Map()
  
  // Active object for selection
  private activeObjectId: string | null = null
  
  // Selection mode
  private selectionMode: SelectionTargetMode = 'global'
  
  // Object pixel cache for efficient operations
  private pixelCache: ObjectPixelCache
  
  // Store canvas reference for our use
  private canvasRef: Canvas
  
  constructor(canvas: Canvas) {
    super(canvas)
    this.canvasRef = canvas
    this.pixelCache = new ObjectPixelCache()
  }
  
  /**
   * Set the active object for selection operations
   */
  setActiveObject(objectId: string | null): void {
    this.activeObjectId = objectId
    
    if (objectId && this.selectionMode === 'object') {
      // Switch to object's selection if it exists
      const objectSelection = this.objectSelections.get(objectId)
      if (objectSelection) {
        this.restoreSelection(objectSelection.mask, objectSelection.bounds, objectSelection.shape)
      } else {
        // Clear global selection when switching to new object
        this.clear()
      }
    }
  }
  
  /**
   * Get the active object ID
   */
  getActiveObjectId(): string | null {
    return this.activeObjectId
  }
  
  /**
   * Set the selection target mode
   */
  setSelectionMode(mode: SelectionTargetMode): void {
    this.selectionMode = mode
    
    // Handle mode transitions
    if (mode === 'global') {
      // Restore global selection
      this.activeObjectId = null
    } else if (mode === 'object' && this.activeObjectId) {
      // Restore object selection
      const objectSelection = this.objectSelections.get(this.activeObjectId)
      if (objectSelection) {
        this.restoreSelection(objectSelection.mask, objectSelection.bounds, objectSelection.shape)
      } else {
        this.clear()
      }
    }
  }
  
  /**
   * Get the current selection mode
   */
  getSelectionMode(): SelectionTargetMode {
    return this.selectionMode
  }
  
  /**
   * Create a selection specific to an object
   */
  createObjectSelection(objectId: string, mask: ImageData): void {
    const bounds = this.calculateMaskBounds(mask)
    this.objectSelections.set(objectId, { mask, bounds })
  }
  
  /**
   * Get selection for a specific object
   */
  getObjectSelection(objectId: string): PixelSelection | null {
    return this.objectSelections.get(objectId) || null
  }
  
  /**
   * Apply a selection operation to a specific object
   */
  applySelectionToObject(objectId: string, operation: (selection: PixelSelection) => void): void {
    const selection = this.objectSelections.get(objectId)
    if (selection) {
      operation(selection)
    }
  }
  
  /**
   * Override createRectangle to respect object boundaries in object mode
   */
  override createRectangle(x: number, y: number, width: number, height: number, mode: BaseSelectionMode = 'replace'): void {
    if (this.selectionMode === 'object' && this.activeObjectId) {
      // Get object bounds from registry
      const objectRegistry = useObjectRegistryStore.getState()
      const objectBounds = objectRegistry.objectBounds.get(this.activeObjectId)
      
      if (objectBounds) {
        // Clip rectangle to object bounds
        const clippedX = Math.max(x, objectBounds.x)
        const clippedY = Math.max(y, objectBounds.y)
        const clippedRight = Math.min(x + width, objectBounds.x + objectBounds.width)
        const clippedBottom = Math.min(y + height, objectBounds.y + objectBounds.height)
        
        const clippedWidth = Math.max(0, clippedRight - clippedX)
        const clippedHeight = Math.max(0, clippedBottom - clippedY)
        
        // Create selection within object bounds
        super.createRectangle(clippedX, clippedY, clippedWidth, clippedHeight, mode)
        
        // Mask with object pixels
        this.maskSelectionWithObject(this.activeObjectId)
        
        // Store as object selection
        const currentSelection = this.getSelection()
        if (currentSelection) {
          this.objectSelections.set(this.activeObjectId, currentSelection)
        }
      }
    } else {
      // Global selection mode
      super.createRectangle(x, y, width, height, mode)
    }
  }
  
  /**
   * Override createEllipse to respect object boundaries in object mode
   */
  override createEllipse(cx: number, cy: number, rx: number, ry: number, mode: BaseSelectionMode = 'replace'): void {
    if (this.selectionMode === 'object' && this.activeObjectId) {
      // Create ellipse normally first
      super.createEllipse(cx, cy, rx, ry, mode)
      
      // Then mask with object pixels
      this.maskSelectionWithObject(this.activeObjectId)
      
      // Store as object selection
      const currentSelection = this.getSelection()
      if (currentSelection) {
        this.objectSelections.set(this.activeObjectId, currentSelection)
      }
    } else {
      // Global selection mode
      super.createEllipse(cx, cy, rx, ry, mode)
    }
  }
  
  /**
   * Override createFromPath to respect object boundaries in object mode
   */
  override createFromPath(path: Path | FabricObject, mode: BaseSelectionMode = 'replace'): void {
    if (this.selectionMode === 'object' && this.activeObjectId) {
      // Create path selection normally first
      super.createFromPath(path, mode)
      
      // Then mask with object pixels
      this.maskSelectionWithObject(this.activeObjectId)
      
      // Store as object selection
      const currentSelection = this.getSelection()
      if (currentSelection) {
        this.objectSelections.set(this.activeObjectId, currentSelection)
      }
    } else {
      // Global selection mode
      super.createFromPath(path, mode)
    }
  }
  
  /**
   * Mask the current selection with object pixels
   */
  private maskSelectionWithObject(objectId: string): void {
    const currentSelection = this.getSelection()
    if (!currentSelection) return
    
    // Get object from canvas
    const object = this.canvasRef.getObjects().find(obj => 
      (obj.get('id') as string) === objectId
    )
    if (!object) return
    
    // Get object pixels from cache
    const objectPixels = this.pixelCache.getObjectPixels(object)
    if (!objectPixels) return
    
    // Get object bounds
    const objectRegistry = useObjectRegistryStore.getState()
    const objectBounds = objectRegistry.objectBounds.get(objectId)
    if (!objectBounds) return
    
    // Mask selection with object pixels
    const selectionMask = currentSelection.mask
    
    for (let y = 0; y < selectionMask.height; y++) {
      for (let x = 0; x < selectionMask.width; x++) {
        const selectionIndex = (y * selectionMask.width + x) * 4 + 3
        
        // Check if this pixel is within object bounds
        const localX = x - objectBounds.x
        const localY = y - objectBounds.y
        
        if (localX >= 0 && localX < objectPixels.width && 
            localY >= 0 && localY < objectPixels.height) {
          const objectIndex = (localY * objectPixels.width + localX) * 4 + 3
          const objectAlpha = objectPixels.data[objectIndex]
          
          // Multiply selection alpha by object alpha
          selectionMask.data[selectionIndex] = 
            (selectionMask.data[selectionIndex] * objectAlpha) / 255
        } else {
          // Outside object bounds
          selectionMask.data[selectionIndex] = 0
        }
      }
    }
  }
  
  /**
   * Calculate bounds of a mask
   */
  private calculateMaskBounds(mask: ImageData): BoundingBox {
    let minX = mask.width
    let minY = mask.height
    let maxX = 0
    let maxY = 0
    
    for (let y = 0; y < mask.height; y++) {
      for (let x = 0; x < mask.width; x++) {
        const index = (y * mask.width + x) * 4 + 3
        if (mask.data[index] > 0) {
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  }
  
  /**
   * Clear selection based on current mode
   */
  override clear(): void {
    if (this.selectionMode === 'object' && this.activeObjectId) {
      // Clear object selection
      this.objectSelections.delete(this.activeObjectId)
    }
    
    // Clear current selection
    super.clear()
  }
  
  /**
   * Check if there's a selection for the active context
   */
  override hasSelection(): boolean {
    if (this.selectionMode === 'object' && this.activeObjectId) {
      return this.objectSelections.has(this.activeObjectId)
    }
    
    return super.hasSelection()
  }
  
  /**
   * Get all object selections
   */
  getAllObjectSelections(): Map<string, PixelSelection> {
    return new Map(this.objectSelections)
  }
  
  /**
   * Clear all object selections
   */
  clearAllObjectSelections(): void {
    this.objectSelections.clear()
  }
  
  /**
   * Dispose of resources
   */
  override dispose(): void {
    this.objectSelections.clear()
    this.pixelCache.clear()
    super.dispose()
  }
} 