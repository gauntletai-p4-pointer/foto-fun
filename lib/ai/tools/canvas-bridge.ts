import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject, Selection } from '@/lib/editor/canvas/types'

/**
 * Enhanced context for AI tools
 * Updated for Konva architecture
 */
export interface CanvasContext {
  canvas: CanvasManager
  targetImages: CanvasObject[]
  targetingMode: 'selection' | 'auto-single' | 'all' | 'none'
  dimensions: {
    width: number
    height: number
  }
  selection: Selection | null
}

/**
 * Bridge between AI tools and the canvas
 * Provides context and utilities for AI operations
 * Updated for Konva architecture
 */
export class CanvasToolBridge {
  private static canvasInstance: CanvasManager | null = null
  private static requestSelectionSnapshot: CanvasContext | null = null
  
  /**
   * Set the canvas instance
   */
  static setCanvas(canvas: CanvasManager | null): void {
    this.canvasInstance = canvas
  }
  
  /**
   * Get the current canvas context
   */
  static getCanvasContext(): CanvasContext | null {
    // Return snapshot if available (for AI request context)
    if (this.requestSelectionSnapshot) {
      return this.requestSelectionSnapshot
    }
    
    if (!this.canvasInstance) {
      return null
    }
    
    const canvas = this.canvasInstance
    
    // Get selected objects from the new selection system
    const selection = canvas.state.selection
    let targetImages: CanvasObject[] = []
    let targetingMode: CanvasContext['targetingMode'] = 'none'
    
    if (selection?.type === 'objects') {
      // Get selected image objects
      targetImages = selection.objectIds
        .map(id => canvas.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null && obj.type === 'image')
      
      if (targetImages.length > 0) {
        targetingMode = 'selection'
      }
    } else if (!selection) {
      // No selection - check for single image auto-target
      const allImages: CanvasObject[] = []
      canvas.state.layers.forEach(layer => {
        layer.objects.forEach(obj => {
          if (obj.type === 'image') {
            allImages.push(obj)
          }
        })
      })
      
      if (allImages.length === 1) {
        targetingMode = 'auto-single'
        targetImages = allImages
      } else if (allImages.length > 1) {
        targetingMode = 'all'
        targetImages = allImages
      }
    }
    
    return {
      canvas,
      targetImages,
      targetingMode,
      dimensions: {
        width: canvas.state.width,
        height: canvas.state.height
      },
      selection
    }
  }
  
  /**
   * Set a snapshot of the current selection for AI request context
   */
  static setRequestSelectionSnapshot(snapshot: CanvasContext | null): void {
    this.requestSelectionSnapshot = snapshot
  }
  
  /**
   * Clear the selection snapshot
   */
  static clearRequestSelectionSnapshot(): void {
    this.requestSelectionSnapshot = null
  }
  
  /**
   * Check if canvas has content
   */
  static hasContent(): boolean {
    if (!this.canvasInstance) return false
    
    // Check if any layer has objects
    return this.canvasInstance.state.layers.some(layer => layer.objects.length > 0)
  }
  
  /**
   * Get the document dimensions
   */
  static getDocumentDimensions(): { width: number; height: number } | null {
    if (!this.canvasInstance) return null
    
    return {
      width: this.canvasInstance.state.width,
      height: this.canvasInstance.state.height
    }
  }
}