import { Canvas, Path, TPointerEventInfo, Rect, type FabricObject } from 'fabric'
import { BaseTool } from './BaseTool'
import { createToolState } from '../utils/toolState'
import { useSelectionStore } from '@/store/selectionStore'
import { useCanvasStore } from '@/store/canvasStore'
import { useHistoryStore } from '@/store/historyStore'
import { markAsSystemObject } from '@/lib/editor/utils/systemObjects'
import { SystemObjectType } from '@/types/fabric'
import { useObjectRegistryStore } from '@/store/objectRegistryStore'
import { ClearSelectionCommand } from '@/lib/editor/commands/selection'
import { constrainProportions, drawFromCenter, type Point } from '../utils/constraints'
import type { LayerAwareSelectionManager } from '@/lib/editor/selection/LayerAwareSelectionManager'

// Selection tool state interface - use type instead of interface for index signature
type SelectionToolState = {
  isSelecting: boolean
  startPoint: Point | null
  currentPoint: Point | null
  selectionPath: Point[]
  shiftPressed: boolean
  altPressed: boolean
  // Object-aware selection
  targetObjectId: string | null
  isObjectMode: boolean
  potentialClearClick: Point | null
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
    altPressed: false,
    targetObjectId: null,
    isObjectMode: false,
    potentialClearClick: null
  })
  
  // Store reference
  protected selectionStore = useSelectionStore.getState()
  
  // Visual feedback element
  protected feedbackElement: Path | null = null
  
  // Object highlight element
  protected objectHighlight: Rect | null = null
  
  // Bound event handlers for cleanup
  private boundHandleKeyDown = this.handleKeyDown.bind(this)
  private boundHandleKeyUp = this.handleKeyUp.bind(this)
  
  /**
   * Get the current selection mode from tool options
   */
  protected get selectionMode(): 'new' | 'add' | 'subtract' | 'intersect' {
    const mode = this.toolOptionsStore.getOptionValue<string>(this.id, 'selectionMode')
    return (mode as 'new' | 'add' | 'subtract' | 'intersect') || 'new'
  }
  
  /**
   * Get the current selection target from tool options
   */
  protected get selectionTarget(): 'auto' | 'canvas' | 'object' | 'layer' {
    const target = this.toolOptionsStore.getOptionValue<string>(this.id, 'selectionTarget')
    return (target as 'auto' | 'canvas' | 'object' | 'layer') || 'auto'
  }
  
  /**
   * Tool-specific setup
   */
  protected setupTool(canvas: Canvas): void {
    // Ensure pixel map is updated when selection tool is activated
    const objectRegistry = useObjectRegistryStore.getState()
    objectRegistry.updatePixelMapIfNeeded()
    
    // Ensure canvas object selection is disabled for pixel-based selection tools
    const canvasStore = useCanvasStore.getState()
    canvasStore.setObjectSelection(false)
    
    // Add event handlers
    this.addCanvasEvent('mouse:move', (e: unknown) => this.handleHover(e as TPointerEventInfo<MouseEvent>))
    
    // Mouse event handlers for selection operations
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      const event = e as TPointerEventInfo<MouseEvent>
      const pointer = canvas.getPointer(event.e)
      
      // Check if clicking on empty area (no object at click point)
      const objectRegistry = useObjectRegistryStore.getState()
      const targetObject = objectRegistry.getTopObjectAtPixel(pointer.x, pointer.y)
      
      // If no object at click point and not starting a new selection operation
      if (!targetObject && this.selectionTarget === 'auto' && canvasStore.selectionManager?.hasSelection()) {
        // Check if this is a simple click (not a drag operation)
        // We'll verify this in mouse:up by checking if mouse hasn't moved much
        this.state.set('potentialClearClick', { x: event.e.clientX, y: event.e.clientY })
      }
      
      // Handle normal mouse down for selection
      this.handleMouseDown(event)
    })
    
    this.addCanvasEvent('mouse:move', (e: unknown) => {
      const event = e as TPointerEventInfo<MouseEvent>
      // Handle hover for object highlighting
      this.handleHover(event)
      // Handle mouse move for selection dragging
      this.handleMouseMove(event)
    })
    
    this.addCanvasEvent('mouse:up', (e: unknown) => {
      const event = e as TPointerEventInfo<MouseEvent>
      const potentialClear = this.state.get('potentialClearClick')
      
      if (potentialClear) {
        // Check if mouse hasn't moved much (allow 5px tolerance)
        const distance = Math.sqrt(
          Math.pow(event.e.clientX - potentialClear.x, 2) + 
          Math.pow(event.e.clientY - potentialClear.y, 2)
        )
        
        if (distance < 5) {
          // This was a click, not a drag - clear the selection
          const command = new ClearSelectionCommand(canvasStore.selectionManager!)
          useHistoryStore.getState().executeCommand(command)
          useSelectionStore.getState().updateSelectionState(false)
        }
        
        this.state.set('potentialClearClick', null)
      }
      
      // Handle normal mouse up
      this.handleMouseUp()
    })
    
    // Add keyboard event handlers
    window.addEventListener('keydown', this.boundHandleKeyDown)
    window.addEventListener('keyup', this.boundHandleKeyUp)
    
    // Subscribe to tool options changes
    this.subscribeToToolOptions(() => {
      // React to option changes if needed
    })
  }
  
  /**
   * Tool-specific cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up any visual feedback
    if (this.feedbackElement && canvas.contains(this.feedbackElement)) {
      canvas.remove(this.feedbackElement)
    }
    this.feedbackElement = null
    
    // Clean up object highlight
    if (this.objectHighlight && canvas.contains(this.objectHighlight)) {
      canvas.remove(this.objectHighlight)
    }
    this.objectHighlight = null
    
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this.boundHandleKeyDown)
    document.removeEventListener('keyup', this.boundHandleKeyUp)
    
    // Reset state
    this.state.reset()
    
    // Re-enable object selection
    canvas.selection = true
    
    // Note: We don't stop the selection renderer here because
    // the selection should persist when switching tools
  }
  
  /**
   * Handle hover to show object highlight
   */
  protected handleHover(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas || this.state.get('isSelecting')) return
    
    const selectionTarget = this.selectionTarget
    if (selectionTarget === 'canvas') return
    
    const pointer = this.canvas.getPointer(e.e)
    const objectRegistry = useObjectRegistryStore.getState()
    const targetObject = objectRegistry.getTopObjectAtPixel(pointer.x, pointer.y)
    
    if (targetObject && (selectionTarget === 'auto' || selectionTarget === 'object')) {
      this.showObjectHighlight(targetObject)
    } else {
      this.hideObjectHighlight()
    }
  }
  
  /**
   * Show visual highlight for object that will be selected
   */
  protected showObjectHighlight(object: FabricObject): void {
    if (!this.canvas) return
    
    const bounds = object.getBoundingRect()
    
    if (!this.objectHighlight) {
      this.objectHighlight = new Rect({
        fill: 'transparent',
        stroke: '#007AFF',
        strokeWidth: 2,
        strokeDashArray: [5, 5]
      })
      
      // Mark as system object
      markAsSystemObject(this.objectHighlight, SystemObjectType.TOOL_FEEDBACK)
      
      this.canvas.add(this.objectHighlight)
    }
    
    this.objectHighlight.set({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height
    })
    
    // Bring to front using canvas method
    this.canvas.bringObjectToFront(this.objectHighlight)
    this.canvas.renderAll()
  }
  
  /**
   * Hide object highlight
   */
  protected hideObjectHighlight(): void {
    if (this.objectHighlight && this.canvas) {
      this.canvas.remove(this.objectHighlight)
      this.objectHighlight = null
      this.canvas.renderAll()
    }
  }
  
  /**
   * Handle mouse down - start selection
   */
  protected handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas) return

    // Hide object highlight during selection
    this.hideObjectHighlight()

    // Track performance
    this.track('mouseDown', () => {
      // Use Fabric's getPointer method to get the correct transformed coordinates
      const pointer = this.canvas!.getPointer(e.e)
      const point = { x: pointer.x, y: pointer.y }
      
      // Determine target object based on selection target mode
      const selectionTarget = this.selectionTarget
      let targetObjectId: string | null = null
      let isObjectMode = false
      
      if (selectionTarget === 'auto' || selectionTarget === 'object') {
        // Check if we clicked on an object
        const objectRegistry = useObjectRegistryStore.getState()
        const targetObject = objectRegistry.getTopObjectAtPixel(pointer.x, pointer.y)
        
        if (targetObject) {
          targetObjectId = targetObject.get('id') as string
          isObjectMode = true
          
          // Get selection manager and set active object
          const selectionManager = this.canvasStore.selectionManager as LayerAwareSelectionManager
          if (selectionManager) {
            selectionManager.setActiveObject(targetObjectId)
            selectionManager.setSelectionMode('object')
          }
          
          // Visual feedback for object selection mode
          this.showObjectSelectionMode()
        } else if (selectionTarget === 'auto') {
          // In auto mode, if no object clicked, use canvas mode
          const selectionManager = this.canvasStore.selectionManager as LayerAwareSelectionManager
          if (selectionManager) {
            selectionManager.setActiveObject(null)
            selectionManager.setSelectionMode('global')
          }
        }
      } else if (selectionTarget === 'layer') {
        // TODO: Implement layer selection mode
        console.log('Layer selection mode not yet implemented')
      } else {
        // Canvas mode
        const selectionManager = this.canvasStore.selectionManager as LayerAwareSelectionManager
        if (selectionManager) {
          selectionManager.setActiveObject(null)
          selectionManager.setSelectionMode('global')
        }
      }
      
      // Update state
      this.state.setState({
        isSelecting: true,
        startPoint: point,
        currentPoint: point,
        selectionPath: [point],
        targetObjectId,
        isObjectMode
      })
      
      // Create visual feedback
      this.createFeedback()
    })
  }
  
  /**
   * Show visual indicator for object selection mode
   */
  protected showObjectSelectionMode(): void {
    // The object highlight already provides visual feedback
    // Additional UI feedback will be added in the options bar
  }
  
  /**
   * Handle mouse move - update selection
   */
  protected handleMouseMove(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas || !this.state.get('isSelecting')) return

    // Track performance
    this.track('mouseMove', () => {
      // Use Fabric's getPointer method to get the correct transformed coordinates
      const pointer = this.canvas!.getPointer(e.e)
      const point = { x: pointer.x, y: pointer.y }
      
      // Update state
      this.state.set('currentPoint', point)
      
      // Add to path for lasso-type tools
      const selectionPath = [...this.state.get('selectionPath'), point]
      this.state.set('selectionPath', selectionPath)
      
      // Update visual feedback
      this.updateFeedback()
    })
  }
  
  /**
   * Handle mouse up - complete selection
   */
  protected handleMouseUp(): void {
    if (!this.canvas || !this.state.get('isSelecting')) return
    
    // Track performance
    this.track('mouseUp', () => {
      // Finalize selection
      this.finalizeSelection()
      
      // Clean up feedback
      if (this.feedbackElement && this.canvas) {
        this.canvas.remove(this.feedbackElement)
        this.feedbackElement = null
      }
      
      // Reset state
      this.state.setState({
        isSelecting: false,
        startPoint: null,
        currentPoint: null,
        selectionPath: []
      })
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