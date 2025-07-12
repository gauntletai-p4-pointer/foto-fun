import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasContext } from '@/lib/ai/canvas/CanvasContext'
import { CanvasContextProvider } from '@/lib/ai/canvas/CanvasContext'

// Re-export unified CanvasContext
export type { CanvasContext }

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
   * Get the current canvas context - unified format
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
    return CanvasContextProvider.fromClient(canvas)
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
    
    // Check if canvas has any objects
    return this.canvasInstance.getAllObjects().length > 0
  }
  
  /**
   * Get the viewport dimensions
   */
  static getViewportDimensions(): { width: number; height: number } | null {
    if (!this.canvasInstance) return null
    
    return this.canvasInstance.getViewport()
  }
}