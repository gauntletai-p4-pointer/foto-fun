import { Move } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, CanvasObject, Transform } from '@/lib/editor/canvas/types'
import { ObjectsTransformedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Move Tool - Allows selecting and moving objects on the canvas
 * Konva implementation with proper event emission
 */
export class MoveTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.MOVE
  name = 'Move Tool'
  icon = Move
  cursor = 'move'
  shortcut = 'V'
  
  // Drag state
  private dragState: {
    target: CanvasObject | null
    startPos: Point
    originalTransform: Transform
    isDragging: boolean
  } | null = null
  
  // Selection state
  private selectionTransformer: Konva.Transformer | null = null
  private selectedObjects: CanvasObject[] = []
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create transformer for showing selection handles
    this.selectionTransformer = new Konva.Transformer({
      enabledAnchors: ['top-left', 'top-center', 'top-right', 'middle-right', 
                       'middle-left', 'bottom-left', 'bottom-center', 'bottom-right'],
      boundBoxFunc: (oldBox, newBox) => {
        // Limit resize to prevent negative dimensions
        if (newBox.width < 5 || newBox.height < 5) {
          return oldBox
        }
        return newBox
      }
    })
    
    // Add transformer to overlay layer
    const stage = canvas.konvaStage
    let overlayLayer = stage.findOne('.overlayLayer') as Konva.Layer | undefined
    
    if (!overlayLayer) {
      overlayLayer = new Konva.Layer({ name: 'overlayLayer' })
      stage.add(overlayLayer)
    }
    
    overlayLayer.add(this.selectionTransformer)
    
    // Set default options
    this.setOption('autoSelect', true)
    this.setOption('showTransform', true)
  }
  
  protected cleanupTool(): void {
    // Clean up transformer
    if (this.selectionTransformer) {
      this.selectionTransformer.destroy()
      this.selectionTransformer = null
    }
    
    // Clear selection
    this.selectedObjects = []
    
    // Reset drag state
    this.dragState = null
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Get clicked object
    const pos = stage.getPointerPosition()
    if (!pos) return
    
    const shape = stage.getIntersection(pos)
    
    if (shape) {
      // Find the canvas object that owns this shape
      const canvasObject = this.findCanvasObject(shape)
      
      if (canvasObject && !canvasObject.locked) {
        // Start drag operation
        this.dragState = {
          target: canvasObject,
          startPos: event.point,
          originalTransform: { ...canvasObject.transform },
          isDragging: false
        }
        
        // Select the object if auto-select is enabled
        if (this.getOption('autoSelect')) {
          this.selectObject(canvasObject)
        }
        
        // Change cursor
        stage.container().style.cursor = 'move'
      }
    } else {
      // Clicked on empty space - deselect
      this.clearSelection()
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.dragState || !this.dragState.target) return
    
    const canvas = this.getCanvas()
    
    // Mark as dragging after first move
    if (!this.dragState.isDragging) {
      this.dragState.isDragging = true
    }
    
    // Calculate movement delta
    const dx = event.point.x - this.dragState.startPos.x
    const dy = event.point.y - this.dragState.startPos.y
    
    // Update object position
    const newTransform: Transform = {
      ...this.dragState.originalTransform,
      x: this.dragState.originalTransform.x + dx,
      y: this.dragState.originalTransform.y + dy
    }
    
    // Apply transform to the Konva node
    this.dragState.target.node.setAttrs({
      x: newTransform.x,
      y: newTransform.y
    })
    
    // Update transformer if active
    if (this.selectionTransformer && this.selectedObjects.includes(this.dragState.target)) {
      this.selectionTransformer.forceUpdate()
    }
    
    // Redraw
    canvas.konvaStage.batchDraw()
  }
  
  async onMouseUp(event: ToolEvent): Promise<void> {
    if (!this.dragState || !this.dragState.target || !this.dragState.isDragging) {
      this.dragState = null
      return
    }
    
    const canvas = this.getCanvas()
    
    // Calculate final transform
    const dx = event.point.x - this.dragState.startPos.x
    const dy = event.point.y - this.dragState.startPos.y
    
    const finalTransform: Transform = {
      ...this.dragState.originalTransform,
      x: this.dragState.originalTransform.x + dx,
      y: this.dragState.originalTransform.y + dy
    }
    
    // Update the canvas object's transform
    this.dragState.target.transform = finalTransform
    
    // Emit event if in ExecutionContext
    if (this.executionContext) {
      await this.executionContext.emit(new ObjectsTransformedEvent(
        'canvas',
        [{
          objectId: this.dragState.target.id,
          previousTransform: this.dragState.originalTransform,
          newTransform: finalTransform
        }],
        this.executionContext.getMetadata()
      ))
    }
    
    // Reset cursor
    canvas.konvaStage.container().style.cursor = this.cursor
    
    // Clear drag state
    this.dragState = null
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Delete selected objects
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedObjects.length > 0) {
      event.preventDefault()
      this.deleteSelectedObjects()
    }
    
    // Select all
    if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
      event.preventDefault()
      this.selectAll()
    }
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'showTransform' && this.selectionTransformer) {
      // Show/hide transformer handles
      this.selectionTransformer.visible(value as boolean)
      const canvas = this.getCanvas()
      canvas.konvaStage.batchDraw()
    }
  }
  
  /**
   * Find the CanvasObject that owns a Konva node
   */
  private findCanvasObject(node: Konva.Node): CanvasObject | null {
    const canvas = this.getCanvas()
    
    // Search through all layers
    for (const layer of canvas.state.layers) {
      for (const obj of layer.objects) {
        if (obj.node === node || (obj.node.findOne && obj.node.findOne((n: Konva.Node) => n === node))) {
          return obj
        }
      }
    }
    
    return null
  }
  
  /**
   * Select an object and show transform handles
   */
  private selectObject(object: CanvasObject): void {
    if (!this.selectionTransformer) return
    
    this.selectedObjects = [object]
    
    // Attach transformer to the object's node
    this.selectionTransformer.nodes([object.node])
    
    // Show transformer if enabled
    const showTransform = this.getOption('showTransform') as boolean
    this.selectionTransformer.visible(showTransform)
    
    const canvas = this.getCanvas()
    canvas.konvaStage.batchDraw()
  }
  
  /**
   * Clear selection
   */
  private clearSelection(): void {
    if (!this.selectionTransformer) return
    
    this.selectedObjects = []
    this.selectionTransformer.nodes([])
    
    const canvas = this.getCanvas()
    canvas.konvaStage.batchDraw()
  }
  
  /**
   * Select all objects
   */
  private selectAll(): void {
    if (!this.selectionTransformer) return
    
    const canvas = this.getCanvas()
    const allObjects: CanvasObject[] = []
    const allNodes: Konva.Node[] = []
    
    // Collect all unlocked objects
    for (const layer of canvas.state.layers) {
      if (!layer.locked && layer.visible) {
        for (const obj of layer.objects) {
          if (!obj.locked && obj.visible) {
            allObjects.push(obj)
            allNodes.push(obj.node)
          }
        }
      }
    }
    
    this.selectedObjects = allObjects
    this.selectionTransformer.nodes(allNodes)
    
    const showTransform = this.getOption('showTransform') as boolean
    this.selectionTransformer.visible(showTransform)
    
    canvas.konvaStage.batchDraw()
  }
  
  /**
   * Delete selected objects
   */
  private async deleteSelectedObjects(): Promise<void> {
    const canvas = this.getCanvas()
    
    for (const obj of this.selectedObjects) {
      await canvas.removeObject(obj.id)
    }
    
    this.clearSelection()
  }
}

// Export singleton instance
export const moveTool = new MoveTool() 