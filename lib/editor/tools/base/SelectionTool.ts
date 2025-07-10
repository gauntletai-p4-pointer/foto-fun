import { BaseTool } from './BaseTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import { createToolState } from '../utils/toolState'
import { constrainProportions, drawFromCenter } from '../utils/constraints'
import { container } from '@/lib/di'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import type Konva from 'konva'

// Selection tool state interface - use type instead of interface for index signature
type SelectionToolState = {
  isSelecting: boolean
  startPoint: Point | null
  currentPoint: Point | null
  selectionPath: Point[]
  shiftPressed: boolean
  altPressed: boolean
}

/**
 * Base class for selection tools (marquee, lasso, etc.)
 * Demonstrates proper state management, event handling, and command patterns
 */
export abstract class SelectionTool extends BaseTool {
  // Encapsulated state using ToolStateManager
  protected state = createToolState<SelectionToolState>({
    isSelecting: false,
    startPoint: null,
    currentPoint: null,
    selectionPath: [],
    shiftPressed: false,
    altPressed: false
  })
  
  // Store reference
  protected selectionStore = container.get(EventSelectionStore)
  
  // Visual feedback element
  protected feedbackElement: Konva.Shape | null = null
  
  /**
   * Get the current selection mode from tool options
   */
  protected get selectionMode(): 'new' | 'add' | 'subtract' | 'intersect' {
    const mode = this.getOption('selectionMode')
    return (mode as 'new' | 'add' | 'subtract' | 'intersect') || 'new'
  }
  
  /**
   * Tool-specific setup
   */
  protected setupTool(): void {
    // Keyboard events for modifiers
    this.registerEventListener('keydown', window, 'keydown', this.handleKeyDown.bind(this))
    this.registerEventListener('keyup', window, 'keyup', this.handleKeyUp.bind(this))
  
  /**
   * Tool-specific cleanup
   */
  protected cleanupTool(): void {
    // Clean up any visual feedback
    if (this.feedbackElement) {
      this.feedbackElement.destroy()
      this.feedbackElement = null
    }
    
    // Reset state
    this.state.reset()
  }
  
  /**
   * Handle mouse down - start selection
   */
  onMouseDown(event: ToolEvent): void {
    const point = event.point
    
    // Update state
    this.state.setState({
      isSelecting: true,
      startPoint: point,
      currentPoint: point,
      selectionPath: [point]
    })
    
    // Create visual feedback
    this.createFeedback()
  }
  
  /**
   * Handle mouse move - update selection
   */
  onMouseMove(event: ToolEvent): void {
    if (!this.state.get('isSelecting')) return
    
    const point = event.point
    
    // Update state
    this.state.set('currentPoint', point)
    
    // Add to path for lasso-type tools
    const selectionPath = [...this.state.get('selectionPath'), point]
    this.state.set('selectionPath', selectionPath)
    
    // Update visual feedback
    this.updateFeedback()
  }
  
  /**
   * Handle mouse up - complete selection
   */
  onMouseUp(_event: ToolEvent): void {
    if (!this.state.get('isSelecting')) return
    
    // Finalize selection
    this.finalizeSelection()
    
    // Clean up feedback
    if (this.feedbackElement) {
      this.feedbackElement.destroy()
      this.feedbackElement = null
    }
    
    // Reset state
    this.state.setState({
      isSelecting: false,
      startPoint: null,
      currentPoint: null,
      selectionPath: []
    })
  }
  
  /**
   * Handle key down for modifiers
   */
  protected handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.state.set('shiftPressed', true)
      if (this.state.get('isSelecting')) {
        this.updateFeedback()
      }
    }
    if (e.key === 'Alt') {
      this.state.set('altPressed', true)
      if (this.state.get('isSelecting')) {
        this.updateFeedback()
      }
    }
  }
  
  /**
   * Handle key up for modifiers
   */
  protected handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.state.set('shiftPressed', false)
      if (this.state.get('isSelecting')) {
        this.updateFeedback()
      }
    }
    if (e.key === 'Alt') {
      this.state.set('altPressed', false)
      if (this.state.get('isSelecting')) {
        this.updateFeedback()
      }
    }
  }
  
  /**
   * Create visual feedback for the selection
   * Override in derived classes for specific feedback
   */
  protected abstract createFeedback(): void
  
  /**
   * Update visual feedback during selection
   * Override in derived classes for specific feedback
   */
  protected abstract updateFeedback(): void
  
  /**
   * Finalize the selection and create a command
   * Override in derived classes for specific selection logic
   */
  protected abstract finalizeSelection(): void
  
  /**
   * Helper to get constrained dimensions (for rectangular selections)
   */
  protected getConstrainedDimensions(): { x: number; y: number; width: number; height: number } {
    const startPoint = this.state.get('startPoint')
    const currentPoint = this.state.get('currentPoint')
    
    if (!startPoint || !currentPoint) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    let width = currentPoint.x - startPoint.x
    let height = currentPoint.y - startPoint.y
    
    // Apply shift constraint (square/circle)
    if (this.state.get('shiftPressed')) {
      const constrained = constrainProportions(width, height)
      width = constrained.width
      height = constrained.height
    }
    
    // Apply alt constraint (draw from center)
    if (this.state.get('altPressed')) {
      const result = drawFromCenter(startPoint, currentPoint)
      return {
        x: result.position.x,
        y: result.position.y,
        width: result.dimensions.width,
        height: result.dimensions.height
      }
    }
    
    // Normal drawing
    return {
      x: Math.min(startPoint.x, startPoint.x + width),
      y: Math.min(startPoint.y, startPoint.y + height),
      width: Math.abs(width),
      height: Math.abs(height)
    }
  }
} 