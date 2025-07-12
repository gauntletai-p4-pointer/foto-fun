import Konva from 'konva'
import type { CanvasManager } from './CanvasManager'
import type { CanvasObject } from '../objects/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CommandManager } from '../commands/CommandManager'
import type { CommandFactory } from '../commands/base/CommandFactory'

export interface TransformHandle {
  type: 'resize' | 'rotate'
  position: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotation'
  cursor: string
  node: Konva.Circle | Konva.Rect
}

/**
 * TransformRenderer - Handles visual transform handles for selected objects
 * 
 * This class provides interactive transform handles for resizing and rotating
 * selected objects including frames, with proper constraint handling.
 */
export class TransformRenderer {
  private canvasManager: CanvasManager
  private eventBus: TypedEventBus
  private commandManager: CommandManager
  private commandFactory: CommandFactory
  private transformLayer: Konva.Layer
  private handles: Map<string, TransformHandle[]> = new Map()
  public isDragging = false
  private dragStartData: {
    objectId: string
    handleType: 'resize' | 'rotate'
    handlePosition: string
    startX: number
    startY: number
    originalBounds: { x: number; y: number; width: number; height: number }
    originalRotation: number
  } | null = null

  constructor(
    canvasManager: CanvasManager, 
    eventBus: TypedEventBus,
    commandManager: CommandManager,
    commandFactory: CommandFactory
  ) {
    this.canvasManager = canvasManager
    this.eventBus = eventBus
    this.commandManager = commandManager
    this.commandFactory = commandFactory
    this.transformLayer = new Konva.Layer()
    
    // Add transform layer to stage
    canvasManager.stage.add(this.transformLayer)
    
    // Listen for selection changes
    this.eventBus.on('selection.changed', () => {
      this.updateTransformHandles()
    })
  }

  /**
   * Update transform handles for selected objects
   */
  private updateTransformHandles(): void {
    // Clear existing handles
    this.clearHandles()
    
    // Get selected objects
    const selectedObjects = this.canvasManager.getSelectedObjects()
    
    // Create handles for each selected object
    selectedObjects.forEach((object: CanvasObject) => {
      if (object && !object.locked) {
        this.createHandlesForObject(object.id, object)
      }
    })
    
    this.transformLayer.draw()
  }

  /**
   * Create transform handles for a specific object
   */
  private createHandlesForObject(objectId: string, object: CanvasObject): void {
    const handles: TransformHandle[] = []
    
    // Get object bounds
    const bounds = {
      x: object.x,
      y: object.y,
      width: object.width * object.scaleX,
      height: object.height * object.scaleY
    }
    
    // Create resize handles
    const resizePositions: Array<{ pos: TransformHandle['position'], cursor: string }> = [
      { pos: 'nw', cursor: 'nw-resize' },
      { pos: 'n', cursor: 'n-resize' },
      { pos: 'ne', cursor: 'ne-resize' },
      { pos: 'e', cursor: 'e-resize' },
      { pos: 'se', cursor: 'se-resize' },
      { pos: 's', cursor: 's-resize' },
      { pos: 'sw', cursor: 'sw-resize' },
      { pos: 'w', cursor: 'w-resize' }
    ]
    
    resizePositions.forEach(({ pos, cursor }) => {
      const handle = this.createResizeHandle(objectId, pos, cursor, bounds)
      handles.push(handle)
      this.transformLayer.add(handle.node)
    })
    
    // Create rotation handle
    const rotationHandle = this.createRotationHandle(objectId, bounds)
    handles.push(rotationHandle)
    this.transformLayer.add(rotationHandle.node)
    
    this.handles.set(objectId, handles)
  }

  /**
   * Create a resize handle
   */
  private createResizeHandle(
    objectId: string,
    position: TransformHandle['position'],
    cursor: string,
    bounds: { x: number; y: number; width: number; height: number }
  ): TransformHandle {
    const size = 8
    const { x, y } = this.getHandlePosition(position, bounds, size)
    
    const handle = new Konva.Rect({
      x: x - size / 2,
      y: y - size / 2,
      width: size,
      height: size,
      fill: '#ffffff',
      stroke: '#0096ff',
      strokeWidth: 2,
      draggable: true,
      cursor: cursor
    })
    
    // Add drag events
    handle.on('mousedown', (e) => {
      this.startDrag(objectId, 'resize', position, e)
    })
    
    handle.on('dragmove', (e) => {
      this.handleDrag(e)
    })
    
    handle.on('dragend', (_e) => {
      this.endDrag()
    })
    
    return {
      type: 'resize',
      position,
      cursor,
      node: handle
    }
  }

  /**
   * Create a rotation handle
   */
  private createRotationHandle(
    objectId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ): TransformHandle {
    const size = 8
    const offset = 20
    const x = bounds.x + bounds.width / 2
    const y = bounds.y - offset
    
    const handle = new Konva.Circle({
      x,
      y,
      radius: size / 2,
      fill: '#ffffff',
      stroke: '#0096ff',
      strokeWidth: 2,
      draggable: true,
      cursor: 'grab'
    })
    
    // Add drag events
    handle.on('mousedown', (e) => {
      this.startDrag(objectId, 'rotate', 'rotation', e)
    })
    
    handle.on('dragmove', (e) => {
      this.handleDrag(e)
    })
    
    handle.on('dragend', (_e) => {
      this.endDrag()
    })
    
    return {
      type: 'rotate',
      position: 'rotation',
      cursor: 'grab',
      node: handle
    }
  }

  /**
   * Get handle position based on bounds and handle type
   */
  private getHandlePosition(
    position: TransformHandle['position'],
    bounds: { x: number; y: number; width: number; height: number },
    _size: number
  ): { x: number; y: number } {
    const { x, y, width, height } = bounds
    
    switch (position) {
      case 'nw': return { x, y }
      case 'n': return { x: x + width / 2, y }
      case 'ne': return { x: x + width, y }
      case 'e': return { x: x + width, y: y + height / 2 }
      case 'se': return { x: x + width, y: y + height }
      case 's': return { x: x + width / 2, y: y + height }
      case 'sw': return { x, y: y + height }
      case 'w': return { x, y: y + height / 2 }
      default: return { x: x + width / 2, y: y - 20 }
    }
  }

  /**
   * Start drag operation
   */
  private startDrag(
    objectId: string,
    handleType: 'resize' | 'rotate',
    handlePosition: string,
    _event: Konva.KonvaEventObject<MouseEvent>
  ): void {
    this.isDragging = true
    const object = this.canvasManager.getObject(objectId)
    
    if (!object) return
    
    const stage = this.canvasManager.stage
    const pointer = stage.getPointerPosition()
    
    if (!pointer) return
    
    this.dragStartData = {
      objectId,
      handleType,
      handlePosition,
      startX: pointer.x,
      startY: pointer.y,
      originalBounds: {
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height
      },
      originalRotation: object.rotation
    }
    
    // Change cursor
    this.canvasManager.stage.container().style.cursor = handleType === 'rotate' ? 'grabbing' : 'pointer'
  }

  /**
   * Handle drag movement
   */
  private handleDrag(_event: Konva.KonvaEventObject<MouseEvent>): void {
    if (!this.isDragging || !this.dragStartData) return
    
    const stage = this.canvasManager.stage
    const pointer = stage.getPointerPosition()
    
    if (!pointer) return
    
    const deltaX = pointer.x - this.dragStartData.startX
    const deltaY = pointer.y - this.dragStartData.startY
    
    if (this.dragStartData.handleType === 'resize') {
      this.handleResize(deltaX, deltaY)
    } else {
      this.handleRotation(pointer.x, pointer.y)
    }
  }

  /**
   * Handle resize operation
   */
  private handleResize(deltaX: number, deltaY: number): void {
    if (!this.dragStartData) return
    
    const { objectId, handlePosition, originalBounds } = this.dragStartData
    const object = this.canvasManager.getObject(objectId)
    
    if (!object) return
    
    const newBounds = { ...originalBounds }
    
    // Calculate new bounds based on handle position
    switch (handlePosition) {
      case 'nw':
        newBounds.x = originalBounds.x + deltaX
        newBounds.y = originalBounds.y + deltaY
        newBounds.width = originalBounds.width - deltaX
        newBounds.height = originalBounds.height - deltaY
        break
      case 'n':
        newBounds.y = originalBounds.y + deltaY
        newBounds.height = originalBounds.height - deltaY
        break
      case 'ne':
        newBounds.y = originalBounds.y + deltaY
        newBounds.width = originalBounds.width + deltaX
        newBounds.height = originalBounds.height - deltaY
        break
      case 'e':
        newBounds.width = originalBounds.width + deltaX
        break
      case 'se':
        newBounds.width = originalBounds.width + deltaX
        newBounds.height = originalBounds.height + deltaY
        break
      case 's':
        newBounds.height = originalBounds.height + deltaY
        break
      case 'sw':
        newBounds.x = originalBounds.x + deltaX
        newBounds.width = originalBounds.width - deltaX
        newBounds.height = originalBounds.height + deltaY
        break
      case 'w':
        newBounds.x = originalBounds.x + deltaX
        newBounds.width = originalBounds.width - deltaX
        break
    }
    
    // Enforce minimum size
    const minSize = 10
    if (newBounds.width < minSize) {
      newBounds.width = minSize
      if (handlePosition.includes('w')) {
        newBounds.x = originalBounds.x + originalBounds.width - minSize
      }
    }
    if (newBounds.height < minSize) {
      newBounds.height = minSize
      if (handlePosition.includes('n')) {
        newBounds.y = originalBounds.y + originalBounds.height - minSize
      }
    }
    
    // Update object
    this.canvasManager.updateObject(objectId, {
      x: newBounds.x,
      y: newBounds.y,
      width: newBounds.width,
      height: newBounds.height
    })
  }

  /**
   * Handle rotation operation
   */
  private handleRotation(pointerX: number, pointerY: number): void {
    if (!this.dragStartData) return
    
    const { objectId, originalBounds } = this.dragStartData
    const object = this.canvasManager.getObject(objectId)
    
    if (!object) return
    
    // Calculate angle from object center to pointer
    const centerX = originalBounds.x + originalBounds.width / 2
    const centerY = originalBounds.y + originalBounds.height / 2
    const angle = Math.atan2(pointerY - centerY, pointerX - centerX)
    const degrees = (angle * 180) / Math.PI
    
    // Update object rotation
    this.canvasManager.updateObject(objectId, {
      rotation: degrees
    })
  }

  private endDrag(): void {
    if (!this.isDragging || !this.dragStartData) return

    const object = this.canvasManager.getObject(this.dragStartData.objectId);
    if (!object) return;

    const command = this.commandFactory.createUpdateObjectCommand(
      this.dragStartData.objectId,
      {
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        rotation: object.rotation
      }
    );
    this.commandManager.executeCommand(command);

    this.isDragging = false
    this.dragStartData = null
  }

  public hitTest(point: { x: number; y: number }): boolean {
    return !!this.transformLayer.getIntersection(point)
  }

  public handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>): void {
    const handleNode = e.target;
    // Find which handle this corresponds to
    for (const [objectId, handles] of this.handles.entries()) {
      const handle = handles.find(h => h.node === handleNode);
      if (handle) {
        this.startDrag(objectId, handle.type, handle.position, e);
        break;
      }
    }
  }

  public handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>): void {
    this.handleDrag(e);
  }

  public handleMouseUp(_e: Konva.KonvaEventObject<MouseEvent>): void {
    this.endDrag();
  }

  /**
   * Clear all transform handles
   */
  private clearHandles(): void {
    this.handles.clear()
    this.transformLayer.destroyChildren()
  }

  /**
   * Destroy the transform renderer
   */
  destroy(): void {
    this.clearHandles()
    this.transformLayer.destroy()
  }
} 