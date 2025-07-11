import { Move } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, CanvasObject, Transform, Layer } from '@/lib/editor/canvas/types'
import { ObjectsTransformedEvent } from '@/lib/events/canvas/ToolEvents'
import { KonvaObjectAddedEvent } from '@/lib/events/canvas/CanvasEvents'

/**
 * Move Tool - Professional object manipulation with Photoshop parity
 * Features: Auto-select, Smart Guides, Constraints, Duplication, Nudging
 */
export class MoveTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.MOVE
  name = 'Move Tool'
  icon = Move
  cursor = 'default' // Changes based on hover state
  shortcut = 'V'
  
  // Drag state
  private dragState: {
    target: CanvasObject | null
    startPos: Point
    originalTransform: Transform
    isDragging: boolean
    isDuplicating: boolean
  } | null = null
  
  // Selection state
  private selectionTransformer: Konva.Transformer | null = null
  private selectedObjects: CanvasObject[] = []
  
  // Smart guides
  private smartGuides: {
    vertical: Konva.Line[]
    horizontal: Konva.Line[]
  } = { vertical: [], horizontal: [] }
  private guideLayer: Konva.Layer | null = null
  
  // Nudge state
  private nudgeAmount = 1 // pixels
  private largeNudgeAmount = 10 // pixels with Shift
  
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
    
    // Get the canvas manager's overlay layer instead of creating a new one
    const stage = canvas.konvaStage
    // The CanvasManager has an overlayLayer at index 2 (after background and selection layers)
    const overlayLayer = stage.children[2] as Konva.Layer
    
    if (overlayLayer) {
      overlayLayer.add(this.selectionTransformer)
    }
    
    // Create guide group instead of layer (to add to overlay layer)
    const guideGroup = new Konva.Group({ name: 'moveToolGuides' })
    if (overlayLayer) {
      overlayLayer.add(guideGroup)
    }
    
    // Store reference to guide group instead of layer
    this.guideLayer = overlayLayer
    
    // Set default options
    this.setOption('autoSelect', true)
    this.setOption('autoSelectType', 'layer') // 'layer' or 'group'
    this.setOption('showTransform', true)
    this.setOption('showSmartGuides', true)
  }
  
  protected cleanupTool(): void {
    // Clean up transformer
    if (this.selectionTransformer) {
      this.selectionTransformer.destroy()
      this.selectionTransformer = null
    }
    
    // Clean up guide group
    if (this.guideLayer) {
      const guideGroup = this.guideLayer.findOne('.moveToolGuides')
      if (guideGroup) {
        guideGroup.destroy()
      }
    }
    
    // Clear smart guides
    this.clearSmartGuides()
    
    // Clear selection
    this.selectedObjects = []
    
    // Reset drag state
    this.dragState = null
    
    // Clear reference
    this.guideLayer = null
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Check for Alt key (duplication)
    const isDuplicating = event.altKey
    
    // Set pointer position from the event to avoid Konva warning
    stage.setPointersPositions(event.nativeEvent)
    
    // Get clicked object
    const pos = stage.getPointerPosition()
    if (!pos) return
    
    const shape = stage.getIntersection(pos)
    
    if (shape) {
      // Auto-select functionality
      const autoSelect = this.getOption('autoSelect') as boolean
      const autoSelectType = this.getOption('autoSelectType') as string
      
      let targetObject: CanvasObject | null = null
      
      if (autoSelect) {
        // Find the appropriate object based on auto-select type
        targetObject = autoSelectType === 'group' 
          ? this.findParentGroup(shape) || this.findCanvasObject(shape)
          : this.findCanvasObject(shape)
      } else if (this.selectedObjects.length > 0) {
        // If not auto-selecting, only move if clicking on selected object
        targetObject = this.selectedObjects.find(obj => 
          obj.node === shape || this.isChildOf(shape, obj.node)
        ) || null
      }
      
      if (targetObject && !targetObject.locked) {
        // Handle duplication
        if (isDuplicating) {
          targetObject = await this.duplicateObject(targetObject)
          if (!targetObject) return
        }
        
        // Start drag operation
        this.dragState = {
          target: targetObject,
          startPos: event.point,
          originalTransform: { ...targetObject.transform },
          isDragging: false,
          isDuplicating
        }
        
        // Select the object
        this.selectObject(targetObject)
        
        // Change cursor
        stage.container().style.cursor = 'move'
      }
    } else {
      // Clicked on empty space - deselect
      this.clearSelection()
    }
  }
  
  onMouseMove(event: ToolEvent): void {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Update cursor based on hover
    if (!this.dragState) {
      // Set pointer position from the event to avoid Konva warning
      stage.setPointersPositions(event.nativeEvent)
      
      const pos = stage.getPointerPosition()
      if (pos) {
        const shape = stage.getIntersection(pos)
        if (shape) {
          const obj = this.findCanvasObject(shape)
          if (obj && !obj.locked) {
            stage.container().style.cursor = 'move'
            return
          }
        }
      }
      stage.container().style.cursor = 'default'
      return
    }
    
    if (!this.dragState.target) return
    
    // Mark as dragging after first move
    if (!this.dragState.isDragging) {
      this.dragState.isDragging = true
    }
    
    // Calculate movement delta
    let dx = event.point.x - this.dragState.startPos.x
    let dy = event.point.y - this.dragState.startPos.y
    
    // Apply constraints
    if (event.shiftKey) {
      // Constrain to 45-degree angles
      const angle = Math.atan2(dy, dx)
      const distance = Math.sqrt(dx * dx + dy * dy)
      const constrainedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
      dx = Math.cos(constrainedAngle) * distance
      dy = Math.sin(constrainedAngle) * distance
    }
    
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
    
    // Show smart guides
    if (this.getOption('showSmartGuides')) {
      this.updateSmartGuides(this.dragState.target, newTransform)
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
    let dx = event.point.x - this.dragState.startPos.x
    let dy = event.point.y - this.dragState.startPos.y
    
    // Apply constraints if shift is still held
    if (event.shiftKey) {
      const angle = Math.atan2(dy, dx)
      const distance = Math.sqrt(dx * dx + dy * dy)
      const constrainedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
      dx = Math.cos(constrainedAngle) * distance
      dy = Math.sin(constrainedAngle) * distance
    }
    
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
          previousTransform: { ...this.dragState.originalTransform } as Record<string, unknown>,
          newTransform: { ...finalTransform } as Record<string, unknown>
        }],
        this.executionContext.getMetadata()
      ))
    }
    
    // Clear smart guides
    this.clearSmartGuides()
    
    // Reset cursor
    canvas.konvaStage.container().style.cursor = 'default'
    
    // Clear drag state
    this.dragState = null
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Arrow key nudging
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      const amount = event.shiftKey ? this.largeNudgeAmount : this.nudgeAmount
      this.nudgeSelection(event.key, amount)
      return
    }
    
    // Delete selected objects
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedObjects.length > 0) {
      event.preventDefault()
      this.deleteSelectedObjects()
      return
    }
    
    // Select all
    if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
      event.preventDefault()
      this.selectAll()
      return
    }
    
    // Duplicate
    if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
      event.preventDefault()
      this.duplicateSelection()
      return
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
   * Nudge selected objects with arrow keys
   */
  private async nudgeSelection(direction: string, amount: number): Promise<void> {
    if (this.selectedObjects.length === 0) return
    
    let dx = 0, dy = 0
    switch (direction) {
      case 'ArrowUp': dy = -amount; break
      case 'ArrowDown': dy = amount; break
      case 'ArrowLeft': dx = -amount; break
      case 'ArrowRight': dx = amount; break
    }
    
    const transformedObjects: Array<{
      objectId: string
      previousTransform: Record<string, unknown>
      newTransform: Record<string, unknown>
    }> = []
    
    // Apply nudge to all selected objects
    for (const obj of this.selectedObjects) {
      const previousTransform = { ...obj.transform }
      
      obj.transform.x += dx
      obj.transform.y += dy
      
      obj.node.setAttrs({
        x: obj.transform.x,
        y: obj.transform.y
      })
      
      transformedObjects.push({
        objectId: obj.id,
        previousTransform: previousTransform as Record<string, unknown>,
        newTransform: { ...obj.transform } as Record<string, unknown>
      })
    }
    
    // Update transformer
    if (this.selectionTransformer) {
      this.selectionTransformer.forceUpdate()
    }
    
    // Emit event
    if (this.executionContext && transformedObjects.length > 0) {
      await this.executionContext.emit(new ObjectsTransformedEvent(
        'canvas',
        transformedObjects,
        this.executionContext.getMetadata()
      ))
    }
    
    // Redraw
    const canvas = this.getCanvas()
    canvas.konvaStage.batchDraw()
  }
  
  /**
   * Find the parent group of a shape
   */
  private findParentGroup(node: Konva.Node): CanvasObject | null {
    const canvas = this.getCanvas()
    let parent = node.getParent()
    
    while (parent && parent !== canvas.konvaStage) {
      // Check if this parent is a group object
      for (const layer of canvas.state.layers) {
        for (const obj of layer.objects) {
          if (obj.node === parent && obj.type === 'group') {
            return obj
          }
        }
      }
      parent = parent.getParent()
    }
    
    return null
  }
  
  /**
   * Check if a node is a child of another node
   */
  private isChildOf(child: Konva.Node, parent: Konva.Node): boolean {
    let current = child.getParent()
    while (current) {
      if (current === parent) return true
      current = current.getParent()
    }
    return false
  }
  
  /**
   * Duplicate an object
   */
  private async duplicateObject(original: CanvasObject): Promise<CanvasObject | null> {
    const canvas = this.getCanvas()
    
    // Clone the Konva node
    const clonedNode = original.node.clone()
    
    // Offset the position slightly
    clonedNode.setAttrs({
      x: original.transform.x + 20,
      y: original.transform.y + 20
    })
    
    // Find the layer containing the original
    const layer = this.findLayerForObject(original)
    if (!layer) return null
    
    // Create new canvas object
    const newObject: CanvasObject = {
      id: `${original.id}_copy_${Date.now()}`,
      type: original.type,
      name: `${original.name} copy`,
      visible: original.visible,
      locked: false,
      opacity: original.opacity,
      blendMode: original.blendMode,
      transform: {
        ...original.transform,
        x: original.transform.x + 20,
        y: original.transform.y + 20
      },
      node: clonedNode,
      layerId: layer.id, // Include the layerId
      data: original.data
    }
    
    // Add to the same layer
    await canvas.addObject(newObject, layer.id)
    
    // Emit event
    if (this.executionContext) {
      await this.executionContext.emit(new KonvaObjectAddedEvent(
        'canvas',
        newObject.id,
        newObject.type,
        {
          name: newObject.name,
          visible: newObject.visible,
          locked: newObject.locked,
          opacity: newObject.opacity,
          blendMode: newObject.blendMode,
          transform: newObject.transform,
          data: newObject.data
        },
        layer.id,
        this.executionContext.getMetadata()
      ))
    }
    
    return newObject
  }
  
  /**
   * Duplicate selected objects
   */
  private async duplicateSelection(): Promise<void> {
    if (this.selectedObjects.length === 0) return
    
    const duplicated: CanvasObject[] = []
    
    for (const obj of this.selectedObjects) {
      const newObj = await this.duplicateObject(obj)
      if (newObj) {
        duplicated.push(newObj)
      }
    }
    
    // Select the duplicated objects
    if (duplicated.length > 0) {
      this.selectedObjects = duplicated
      if (this.selectionTransformer) {
        this.selectionTransformer.nodes(duplicated.map(obj => obj.node))
        this.selectionTransformer.forceUpdate()
      }
    }
  }
  
  /**
   * Update smart guides based on object position
   */
  private updateSmartGuides(object: CanvasObject, transform: Transform): void {
    if (!this.guideLayer) return
    
    this.clearSmartGuides()
    
    const canvas = this.getCanvas()
    const threshold = 5 // pixels
    
    // Get object bounds
    const objBounds = {
      left: transform.x,
      right: transform.x + (object.node.width() || 0) * (transform.scaleX || 1),
      top: transform.y,
      bottom: transform.y + (object.node.height() || 0) * (transform.scaleY || 1),
      centerX: transform.x + ((object.node.width() || 0) * (transform.scaleX || 1)) / 2,
      centerY: transform.y + ((object.node.height() || 0) * (transform.scaleY || 1)) / 2
    }
    
    // Check alignment with other objects
    for (const layer of canvas.state.layers) {
      if (!layer.visible || layer.locked) continue
      
      for (const other of layer.objects) {
        if (other === object || !other.visible || other.locked) continue
        
        const otherBounds = {
          left: other.transform.x,
          right: other.transform.x + (other.node.width() || 0) * (other.transform.scaleX || 1),
          top: other.transform.y,
          bottom: other.transform.y + (other.node.height() || 0) * (other.transform.scaleY || 1),
          centerX: other.transform.x + ((other.node.width() || 0) * (other.transform.scaleX || 1)) / 2,
          centerY: other.transform.y + ((other.node.height() || 0) * (other.transform.scaleY || 1)) / 2
        }
        
        // Check vertical alignments
        const vAlignments = [
          { obj: objBounds.left, other: otherBounds.left },
          { obj: objBounds.left, other: otherBounds.right },
          { obj: objBounds.right, other: otherBounds.left },
          { obj: objBounds.right, other: otherBounds.right },
          { obj: objBounds.centerX, other: otherBounds.centerX }
        ]
        
        for (const align of vAlignments) {
          if (Math.abs(align.obj - align.other) < threshold) {
            this.addVerticalGuide(align.other)
          }
        }
        
        // Check horizontal alignments
        const hAlignments = [
          { obj: objBounds.top, other: otherBounds.top },
          { obj: objBounds.top, other: otherBounds.bottom },
          { obj: objBounds.bottom, other: otherBounds.top },
          { obj: objBounds.bottom, other: otherBounds.bottom },
          { obj: objBounds.centerY, other: otherBounds.centerY }
        ]
        
        for (const align of hAlignments) {
          if (Math.abs(align.obj - align.other) < threshold) {
            this.addHorizontalGuide(align.other)
          }
        }
      }
    }
    
    this.guideLayer.batchDraw()
  }
  
  /**
   * Add a vertical guide line
   */
  private addVerticalGuide(x: number): void {
    if (!this.guideLayer) return
    
    const guideGroup = this.guideLayer.findOne('.moveToolGuides') as Konva.Group
    if (!guideGroup) return
    
    const canvas = this.getCanvas()
    const guide = new Konva.Line({
      points: [x, 0, x, canvas.state.height],
      stroke: '#00ff00',
      strokeWidth: 1,
      dash: [4, 4],
      listening: false
    })
    
    guideGroup.add(guide)
    this.smartGuides.vertical.push(guide)
  }
  
  /**
   * Add a horizontal guide line
   */
  private addHorizontalGuide(y: number): void {
    if (!this.guideLayer) return
    
    const guideGroup = this.guideLayer.findOne('.moveToolGuides') as Konva.Group
    if (!guideGroup) return
    
    const canvas = this.getCanvas()
    const guide = new Konva.Line({
      points: [0, y, canvas.state.width, y],
      stroke: '#00ff00',
      strokeWidth: 1,
      dash: [4, 4],
      listening: false
    })
    
    guideGroup.add(guide)
    this.smartGuides.horizontal.push(guide)
  }
  
  /**
   * Clear all smart guides
   */
  private clearSmartGuides(): void {
    [...this.smartGuides.vertical, ...this.smartGuides.horizontal].forEach(guide => {
      guide.destroy()
    })
    
    this.smartGuides.vertical = []
    this.smartGuides.horizontal = []
    
    if (this.guideLayer) {
      this.guideLayer.batchDraw()
    }
  }
  
  /**
   * Find the layer containing an object
   */
  private findLayerForObject(object: CanvasObject): Layer | null {
    const canvas = this.getCanvas()
    
    for (const layer of canvas.state.layers) {
      if (layer.objects.includes(object)) {
        return layer
      }
    }
    
    return null
  }
  
  /**
   * Find the CanvasObject that owns a Konva node
   */
  private findCanvasObject(node: Konva.Node): CanvasObject | null {
    const canvas = this.getCanvas()
    
    // Search through all layers
    for (const layer of canvas.state.layers) {
      for (const obj of layer.objects) {
        if (obj.node === node) {
          return obj
        }
        // Check if node is a child of a group
        if (obj.node instanceof Konva.Group || obj.node instanceof Konva.Container) {
          const found = obj.node.findOne((n: Konva.Node) => n === node)
          if (found) {
            return obj
          }
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