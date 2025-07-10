import type { Tool, ToolEvent, CanvasManager } from '@/lib/editor/canvas/types'

/**
 * Base class for all Konva-based tools
 */
export abstract class KonvaTool implements Tool {
  abstract id: string
  abstract name: string
  abstract icon: React.ComponentType
  abstract cursor: string
  shortcut?: string
  
  protected canvas: CanvasManager | null = null
  protected isActive = false
  
  // Tool lifecycle
  onActivate(canvas: CanvasManager): void {
    this.canvas = canvas
    this.isActive = true
    this.setupTool()
  }
  
  onDeactivate(canvas: CanvasManager): void {
    this.cleanupTool()
    this.isActive = false
    this.canvas = null
  }
  
  // Override these in subclasses
  protected abstract setupTool(): void
  protected abstract cleanupTool(): void
  
  // Default event handlers (override as needed)
  onMouseDown?(event: ToolEvent): void {
    // Override in subclasses
  }
  
  onMouseMove?(event: ToolEvent): void {
    // Override in subclasses
  }
  
  onMouseUp?(event: ToolEvent): void {
    // Override in subclasses
  }
  
  onKeyDown?(event: KeyboardEvent): void {
    // Override in subclasses
  }
  
  onKeyUp?(event: KeyboardEvent): void {
    // Override in subclasses
  }
  
  // Utility methods
  protected getCanvas(): CanvasManager {
    if (!this.canvas) {
      throw new Error(`Tool ${this.id} is not active`)
    }
    return this.canvas
  }
} 