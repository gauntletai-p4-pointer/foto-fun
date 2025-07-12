import { BaseTool, ToolState } from '../base/BaseTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject } from '@/lib/editor/objects/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolDependencies } from '../base/BaseTool';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';
import type { Point } from '@/lib/editor/canvas/types';

/**
 * Move Tool - Object positioning and dragging
 * Follows foundation architecture: Command Pattern, Event-Driven, State Machine.
 */
export class MoveTool extends BaseTool {
  id = 'move';
  name = 'Move Tool';
  cursor = 'move';

  private isDragging = false;
  private dragStartPoint: Point | null = null;
  private originalObjectPositions = new Map<string, Point>();

  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  static getMetadata(): ToolMetadata {
    return {
      id: 'move',
      name: 'Move Tool',
      description: 'Move, duplicate, and transform objects on the canvas',
      category: 'transform',
      groupId: 'transform-group',
      icon: ToolGroupIcons['move'],
      cursor: 'move',
      shortcut: 'V',
      priority: 1
    };
  }

  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVE);
    this.cursor = 'move';
  }

  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    if (this.isDragging) {
      this.cancelDrag();
    }
    this.setState(ToolState.INACTIVE);
  }

  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;

    const selectedObjects = this.dependencies.objectManager.getSelectedObjects();
    if (selectedObjects.length === 0) return;

    // Check if we're clicking on a selected object
    const clickedObject = this.dependencies.canvasManager.getObjectAtPoint({ x: event.canvasX, y: event.canvasY });
    if (!clickedObject || !selectedObjects.some(obj => obj.id === clickedObject.id)) {
      return;
    }
    
    this.isDragging = true;
    this.dragStartPoint = { x: event.canvasX, y: event.canvasY };
    this.originalObjectPositions.clear();

    selectedObjects.forEach((obj: CanvasObject) => {
      this.originalObjectPositions.set(obj.id, { x: obj.x, y: obj.y });
    });

    this.setState(ToolState.WORKING);
    this.cursor = 'grabbing';
    
    this.dependencies.eventBus.emit('tool.operation.requested', {
      toolId: this.id,
      instanceId: this.instanceId,
      operation: 'move',
      params: {
        objectIds: selectedObjects.map((o: CanvasObject) => o.id)
      },
      timestamp: Date.now(),
    });
  }

  onMouseMove(event: ToolEvent): void {
    if (!this.isDragging || !this.dragStartPoint) return;

    const deltaX = event.canvasX - this.dragStartPoint.x;
    const deltaY = event.canvasY - this.dragStartPoint.y;

    const updates: { objectId: string; changes: Partial<CanvasObject> }[] = [];

    this.originalObjectPositions.forEach((startPos, objectId) => {
      updates.push({
        objectId,
        changes: {
          x: startPos.x + deltaX,
          y: startPos.y + deltaY,
        },
      });
    });

    // Update preview without committing
    // NOTE: This method doesn't exist, we need to implement it or use an alternative.
    // For now, we will call updateObject directly and rely on Konva's batching.
    updates.forEach(u => this.dependencies.canvasManager.updateObject(u.objectId, u.changes));
  }

  onMouseUp(_event: ToolEvent): void {
    if (!this.isDragging || !this.dragStartPoint) return;

    const deltaX = _event.canvasX - this.dragStartPoint.x;
    const deltaY = _event.canvasY - this.dragStartPoint.y;

    const commands = [];
    for (const [objectId, startPos] of this.originalObjectPositions.entries()) {
      const newPosition = {
        x: startPos.x + deltaX,
        y: startPos.y + deltaY
      };
      
      const command = this.dependencies.commandFactory.createUpdateObjectCommand(
        objectId,
        newPosition
      );
      commands.push(command);
    }

    if (commands.length > 0) {
      const compositeCommand = this.dependencies.commandFactory.createCompositeCommand(
        'Move Objects',
        commands
      );
      this.dependencies.commandManager.executeCommand(compositeCommand);
    }
    
    this.resetDragState();
  }

  private cancelDrag(): void {
    const updates: { objectId: string; changes: Partial<CanvasObject> }[] = [];
    this.originalObjectPositions.forEach((startPos, objectId) => {
      updates.push({
        objectId,
        changes: { x: startPos.x, y: startPos.y },
      });
    });
    updates.forEach(u => this.dependencies.canvasManager.updateObject(u.objectId, u.changes));
    this.resetDragState();
  }

  private resetDragState(): void {
    this.isDragging = false;
    this.dragStartPoint = null;
    this.originalObjectPositions.clear();
    this.setState(ToolState.ACTIVE);
    this.cursor = 'move';
  }
}
