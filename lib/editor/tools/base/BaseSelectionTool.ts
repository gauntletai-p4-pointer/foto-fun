import { BaseTool } from './BaseTool'
import { ToolEvent, SelectionMode, Point } from '@/types'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import Konva from 'konva'

/**
 * Base class for all selection tools
 * Provides common functionality for pixel-based selections
 */
export abstract class BaseSelectionTool extends BaseTool {
  protected selectionManager!: SelectionManager
  protected overlayLayer!: Konva.Layer
  protected isCreating = false
  protected startPoint: Point | null = null
  protected visualFeedback: Konva.Node | null = null
  
  onActivate(canvas: CanvasManager): void {
    super.onActivate(canvas)
    this.selectionManager = canvas.getSelectionManager()
    this.overlayLayer = canvas.stage.findOne('.overlay') as Konva.Layer || new Konva.Layer({ name: 'overlay' })
    
    // Show modifier hints in status bar
    this.showModifierHints()
  }
  
  onDeactivate(): void {
    this.cleanup()
    if (this.canvas) {
      super.onDeactivate(this.canvas)
    }
  }
  
  /**
   * Get selection mode based on current modifier keys
   * This is checked in real-time, not stored as state
   */
  protected getSelectionMode(event: ToolEvent): SelectionMode {
    const { shiftKey, altKey } = event
    
    if (shiftKey && altKey) return 'intersect'
    if (shiftKey) return 'add'
    if (altKey) return 'subtract'
    return 'replace'
  }
  
  /**
   * Apply constraints based on modifier keys
   * Used by marquee tools for square/circle constraints
   */
  protected applyConstraints(
    bounds: { x: number; y: number; width: number; height: number },
    event: ToolEvent
  ): typeof bounds {
    if (!this.startPoint) return bounds
    
    let { x, y, width, height } = bounds
    
    // Shift constrains proportions (square/circle)
    if (event.shiftKey && !event.altKey) {
      const size = Math.max(width, height)
      width = height = size
      
      // Adjust position to maintain direction
      if (event.point.x < this.startPoint.x) {
        x = this.startPoint.x - size
      }
      if (event.point.y < this.startPoint.y) {
        y = this.startPoint.y - size
      }
    }
    
    // Alt draws from center
    if (event.altKey && !event.shiftKey) {
      x = this.startPoint.x - width / 2
      y = this.startPoint.y - height / 2
    }
    
    // Shift + Alt: constrained from center
    if (event.shiftKey && event.altKey) {
      const size = Math.max(width, height)
      width = height = size
      x = this.startPoint.x - size / 2
      y = this.startPoint.y - size / 2
    }
    
    return { x, y, width, height }
  }
  
  /**
   * Show visual hints for available modifiers
   */
  protected showModifierHints(): void {
    if (!this.canvas) return
    
    // TODO: Implement status bar hints through proper event system
    // For now, just log the hints
    console.log('Selection tool hints:', [
      { key: 'Shift', action: 'Add to selection / Constrain' },
      { key: 'Alt', action: 'Subtract / From center' },
      { key: 'Shift+Alt', action: 'Intersect / Constrained center' }
    ])
  }
  
  /**
   * Create selection mask from bounds/shape
   * Must be implemented by each selection tool
   */
  protected abstract createSelectionMask(data: unknown): ImageData
  
  /**
   * Finalize and apply the selection
   */
  protected finalizeSelection(mask: ImageData, mode: SelectionMode): void {
    this.selectionManager.applySelection(mask, mode)
    this.cleanup()
  }
  
  /**
   * Clean up any temporary visuals
   */
  protected cleanup(): void {
    this.isCreating = false
    this.startPoint = null
    
    if (this.visualFeedback) {
      this.visualFeedback.destroy()
      this.visualFeedback = null
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.batchDraw()
    }
  }
  
  /**
   * Update visual feedback (preview)
   */
  protected updateVisualFeedback(node: Konva.Node): void {
    if (this.visualFeedback && this.visualFeedback !== node) {
      this.visualFeedback.destroy()
    }
    
    this.visualFeedback = node
    
    if (!node.getLayer()) {
      // Ensure node is a valid type for adding to layer
      if (node instanceof Konva.Shape || node instanceof Konva.Group) {
        this.overlayLayer.add(node)
      } else {
        console.error('Invalid node type for visual feedback')
      }
    }
    
    this.overlayLayer.batchDraw()
  }
  
  /**
   * Get mode color for visual feedback
   */
  protected getModeColor(mode: SelectionMode): string {
    switch (mode) {
      case 'add':
        return '#00ff00'
      case 'subtract':
        return '#ff0000'
      case 'intersect':
        return '#0000ff'
      default:
        return '#000000'
    }
  }
} 