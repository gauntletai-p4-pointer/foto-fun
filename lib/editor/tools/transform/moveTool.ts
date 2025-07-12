import { Move } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolOptions, ToolDependencies } from '../base/BaseTool'
import { UpdateObjectCommand } from '@/lib/editor/commands/object/UpdateObjectCommand'
import { AddObjectCommand } from '@/lib/editor/commands/object/AddObjectCommand'
import { RemoveObjectCommand } from '@/lib/editor/commands/object/RemoveObjectCommand'

interface MoveToolOptions extends ToolOptions {
  autoSelect: { type: 'boolean'; default: boolean }
  showTransform: { type: 'boolean'; default: boolean }
  showSmartGuides: { type: 'boolean'; default: boolean }
  nudgeAmount: { type: 'number'; default: number; min: 1; max: 50 }
  largeNudgeAmount: { type: 'number'; default: number; min: 1; max: 100 }
}

/**
 * Move Tool - Object manipulation with Smart Guides and Constraints
 * Features: Auto-select, Smart Guides, Constraints, Duplication, Nudging
 */
export class MoveTool extends ObjectTool<MoveToolOptions> {
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
    originalPosition: { x: number; y: number }
    isDragging: boolean
    isDuplicating: boolean
  } | null = null
  
  // Selection state
  private selectionTransformer: Konva.Transformer | null = null
  private overlayLayer: Konva.Layer | null = null
  
  // Smart guides
  private smartGuides: {
    vertical: Konva.Line[]
    horizontal: Konva.Line[]
  } = { vertical: [], horizontal: [] }

  constructor(dependencies: ToolDependencies) {
    super(dependencies)
  }

  protected getOptionDefinitions(): MoveToolOptions {
    return {
      autoSelect: {
        type: 'boolean',
        default: true
      },
      showTransform: {
        type: 'boolean',
        default: true
      },
      showSmartGuides: {
        type: 'boolean',
        default: true
      },
      nudgeAmount: {
        type: 'number',
        default: 1,
        min: 1,
        max: 50
      },
      largeNudgeAmount: {
        type: 'number',
        default: 10,
        min: 1,
        max: 100
      }
    }
  }

  protected async setupTool(): Promise<void> {
    const canvas = this.dependencies.canvasManager
    const stage = canvas.stage
    
    // Get overlay layer
    this.overlayLayer = stage.children[stage.children.length - 1] as Konva.Layer
    
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
    
    if (this.overlayLayer) {
      this.overlayLayer.add(this.selectionTransformer)
    }
    
    // Update transformer based on current selection
    this.updateTransformer()
    
    // Emit tool activation event
    this.dependencies.eventBus.emit('tool.activated', {
      toolId: this.id,
      previousToolId: null
    })
  }

  protected async cleanupTool(): Promise<void> {
    // Clear drag state
    this.dragState = null
    
    // Remove transformer
    if (this.selectionTransformer) {
      this.selectionTransformer.destroy()
      this.selectionTransformer = null
    }
    
    // Clear smart guides
    this.clearSmartGuides()
    
    // Reset cursor
    const canvas = this.dependencies.canvasManager
    canvas.stage.container().style.cursor = 'default'
    
    // Emit tool deactivation event
    this.dependencies.eventBus.emit('tool.deactivated', {
      toolId: this.id
    })
  }

  protected handleMouseDown(event: ToolEvent): void {
    const canvas = this.dependencies.canvasManager
    const stage = canvas.stage
    
    // Check for Alt key (duplication)
    const isDuplicating = event.altKey
    
    // Get clicked object
    const clickedObject = canvas.getObjectAtPoint(event.point)
    
    if (clickedObject && !clickedObject.locked) {
      let targetObject: CanvasObject = clickedObject
      
      // Handle duplication
      if (isDuplicating) {
        this.duplicateObject(targetObject).then(duplicated => {
          if (duplicated) {
            targetObject = duplicated
            this.startDrag(targetObject, event.point, isDuplicating)
          }
        })
        return
      }
      
      this.startDrag(targetObject, event.point, isDuplicating)
    } else {
      // Clicked on empty space - deselect
      canvas.deselectAll()
      this.updateTransformer()
    }
  }

  protected handleMouseMove(event: ToolEvent): void {
    const canvas = this.dependencies.canvasManager
    const stage = canvas.stage
    
    // Update cursor based on hover
    if (!this.dragState) {
      const hoveredObject = canvas.getObjectAtPoint(event.point)
      if (hoveredObject && !hoveredObject.locked) {
        stage.container().style.cursor = 'move'
      } else {
        stage.container().style.cursor = 'default'
      }
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
    const newX = this.dragState.originalPosition.x + dx
    const newY = this.dragState.originalPosition.y + dy
    
    // Update object (this will update the Konva node internally)
    canvas.updateObject(this.dragState.target.id, {
      x: newX,
      y: newY
    })
    
    // Update transformer if active
    if (this.selectionTransformer) {
      this.selectionTransformer.forceUpdate()
    }
    
    // Show smart guides
    if (this.getOption('showSmartGuides')) {
      this.updateSmartGuides(this.dragState.target, { x: newX, y: newY })
    }
    
    // Redraw
    stage.batchDraw()
  }

  protected handleMouseUp(event: ToolEvent): void {
    if (!this.dragState || !this.dragState.target || !this.dragState.isDragging) {
      this.dragState = null
      return
    }
    
    const canvas = this.dependencies.canvasManager
    
    // Calculate final position
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
    
    const finalX = this.dragState.originalPosition.x + dx
    const finalY = this.dragState.originalPosition.y + dy
    
    // Execute move command for undo/redo support
    const moveCommand = new UpdateObjectCommand(
      `Move ${this.dragState.target.name}`,
      this.getCommandContext(),
      {
        objectId: this.dragState.target.id,
        updates: { x: finalX, y: finalY }
      }
    )
    
    this.executeCommand(moveCommand)
    
    // Clear smart guides
    this.clearSmartGuides()
    
    // Reset cursor
    canvas.stage.container().style.cursor = 'default'
    
    // Clear drag state
    this.dragState = null
  }

  onKeyDown(event: KeyboardEvent): void {
    // Arrow key nudging
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      const amount = event.shiftKey ? this.getOption('largeNudgeAmount') : this.getOption('nudgeAmount')
      this.nudgeSelection(event.key, amount)
      return
    }
    
    // Delete selected objects
    if ((event.key === 'Delete' || event.key === 'Backspace')) {
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

  private startDrag(target: CanvasObject, startPos: Point, isDuplicating: boolean): void {
    // Start drag operation
    this.dragState = {
      target,
      startPos,
      originalPosition: { x: target.x, y: target.y },
      isDragging: false,
      isDuplicating
    }
    
    // Select the object
    const canvas = this.dependencies.canvasManager
    canvas.selectObject(target.id)
    this.updateTransformer()
    
    // Change cursor
    canvas.stage.container().style.cursor = 'move'
  }

  /**
   * Update transformer based on current selection
   */
  private updateTransformer(): void {
    if (!this.selectionTransformer) return
    
    const canvas = this.dependencies.canvasManager
    const selectedObjects = this.getTargetObjects()
    
    if (selectedObjects.length === 0) {
      this.selectionTransformer.nodes([])
    } else {
      // Get Konva nodes for selected objects
      const nodes: Konva.Node[] = []
      const stage = canvas.stage
      
      // Find Konva nodes by searching the stage
      selectedObjects.forEach(obj => {
        const node = stage.findOne(`#${obj.id}`)
        if (node) {
          nodes.push(node)
        }
      })
      
      this.selectionTransformer.nodes(nodes)
    }
    
    const showTransform = this.getOption('showTransform') as boolean
    this.selectionTransformer.visible(showTransform && selectedObjects.length > 0)
    
    canvas.stage.batchDraw()
  }

  /**
   * Nudge selected objects with arrow keys
   */
  private async nudgeSelection(direction: string, amount: number): Promise<void> {
    const selectedObjects = this.getTargetObjects()
    if (selectedObjects.length === 0) return
    
    let dx = 0, dy = 0
    switch (direction) {
      case 'ArrowUp': dy = -amount; break
      case 'ArrowDown': dy = amount; break
      case 'ArrowLeft': dx = -amount; break
      case 'ArrowRight': dx = amount; break
    }
    
    const canvas = this.dependencies.canvasManager
    
    // Create move commands for each selected object
    for (const obj of selectedObjects) {
      const moveCommand = new UpdateObjectCommand(
        `Nudge ${obj.name}`,
        this.getCommandContext(),
        {
          objectId: obj.id,
          updates: { x: obj.x + dx, y: obj.y + dy }
        }
      )
      
      await this.executeCommand(moveCommand)
    }
    
    // Update transformer
    if (this.selectionTransformer) {
      this.selectionTransformer.forceUpdate()
    }
    
    // Redraw
    canvas.stage.batchDraw()
  }

  /**
   * Duplicate an object
   */
  private async duplicateObject(original: CanvasObject): Promise<CanvasObject | null> {
    const canvas = this.dependencies.canvasManager
    
    // Create duplicate command using proper context
    
    const duplicateCommand = new AddObjectCommand(
      `Duplicate ${original.name}`,
      this.getCommandContext(),
      {
        object: {
          ...original,
          id: undefined, // Let the system generate a new ID
          name: `${original.name} copy`,
          x: original.x + 20,
          y: original.y + 20
        }
      }
    )
    
    await this.executeCommand(duplicateCommand)
    
    const newObjectId = duplicateCommand.getObjectId()
    if (newObjectId) {
      return canvas.getObject(newObjectId)
    }
    
    return null
  }

  /**
   * Duplicate selected objects
   */
  private async duplicateSelection(): Promise<void> {
    const selectedObjects = this.getTargetObjects()
    if (selectedObjects.length === 0) return
    
    const canvas = this.dependencies.canvasManager
    const duplicatedIds: string[] = []
    
    for (const obj of selectedObjects) {
      const newObj = await this.duplicateObject(obj)
      if (newObj) {
        duplicatedIds.push(newObj.id)
      }
    }
    
    // Select the duplicated objects
    if (duplicatedIds.length > 0) {
      canvas.selectMultiple(duplicatedIds)
      this.updateTransformer()
    }
  }

  /**
   * Delete selected objects
   */
  private async deleteSelectedObjects(): Promise<void> {
    const selectedObjects = this.getTargetObjects()
    if (selectedObjects.length === 0) return
    
    const canvas = this.dependencies.canvasManager
    
    // Create remove commands for each selected object
    for (const obj of selectedObjects) {
      const removeCommand = new RemoveObjectCommand(
        `Delete ${obj.name}`,
        this.getCommandContext(),
        {
          objectId: obj.id
        }
      )
      
      await this.executeCommand(removeCommand)
    }
    
    // Update transformer
    this.updateTransformer()
  }

  /**
   * Update smart guides based on object position
   */
  private updateSmartGuides(object: CanvasObject, position: { x: number; y: number }): void {
    if (!this.overlayLayer) return
    
    this.clearSmartGuides()
    
    const canvas = this.dependencies.canvasManager
    const threshold = 5 // pixels
    
    // Get object bounds
    const objBounds = {
      left: position.x,
      right: position.x + object.width * object.scaleX,
      top: position.y,
      bottom: position.y + object.height * object.scaleY,
      centerX: position.x + (object.width * object.scaleX) / 2,
      centerY: position.y + (object.height * object.scaleY) / 2
    }
    
    // Check alignment with other objects
    const allObjects = canvas.getAllObjects()
    
    for (const other of allObjects) {
      if (other === object || !other.visible || other.locked) continue
      
      const otherBounds = {
        left: other.x,
        right: other.x + other.width * other.scaleX,
        top: other.y,
        bottom: other.y + other.height * other.scaleY,
        centerX: other.x + (other.width * other.scaleX) / 2,
        centerY: other.y + (other.height * other.scaleY) / 2
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

  /**
   * Add vertical guide line
   */
  private addVerticalGuide(x: number): void {
    if (!this.overlayLayer) return
    
    const stage = this.dependencies.canvasManager.stage
    const line = new Konva.Line({
      points: [x, 0, x, stage.height()],
      stroke: '#00ff00',
      strokeWidth: 1,
      dash: [5, 5],
      listening: false
    })
    
    this.smartGuides.vertical.push(line)
    this.overlayLayer.add(line)
  }

  /**
   * Add horizontal guide line
   */
  private addHorizontalGuide(y: number): void {
    if (!this.overlayLayer) return
    
    const stage = this.dependencies.canvasManager.stage
    const line = new Konva.Line({
      points: [0, y, stage.width(), y],
      stroke: '#00ff00',
      strokeWidth: 1,
      dash: [5, 5],
      listening: false
    })
    
    this.smartGuides.horizontal.push(line)
    this.overlayLayer.add(line)
  }

  /**
   * Clear all smart guides
   */
  private clearSmartGuides(): void {
    // Remove vertical guides
    this.smartGuides.vertical.forEach(line => line.destroy())
    this.smartGuides.vertical = []
    
    // Remove horizontal guides
    this.smartGuides.horizontal.forEach(line => line.destroy())
    this.smartGuides.horizontal = []
  }

  /**
   * Select all objects
   */
  private selectAll(): void {
    const canvas = this.dependencies.canvasManager
    const allObjects = canvas.getAllObjects()
    
    // Select all unlocked, visible objects
    const selectableIds = allObjects
      .filter(obj => !obj.locked && obj.visible)
      .map(obj => obj.id)
    
    if (selectableIds.length > 0) {
      canvas.selectMultiple(selectableIds)
      this.updateTransformer()
    }
  }
} 