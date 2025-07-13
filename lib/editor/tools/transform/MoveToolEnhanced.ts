import { TransformTool, TransformData } from '../base/TransformTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject } from '@/lib/editor/objects/types';
import type { ToolMetadata } from '../base/ToolRegistry';
import type { ToolDependencies } from '../base/BaseTool';
import { ToolState } from '../base/BaseTool';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';
import type { Point } from '@/lib/editor/canvas/types';
import type { Command } from '@/lib/editor/commands/base/Command';

interface TransformHandle {
  type: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | 'rotate';
  x: number;
  y: number;
  cursor: string;
}

interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface MoveState {
  startPoint: Point;
  originalTransforms: Map<string, TransformBounds>;
  handle: TransformHandle | null;
  transformMode: 'move' | 'resize' | 'rotate';
}

export class MoveToolEnhanced extends TransformTool {
  id = 'move';
  name = 'Move Tool';
  cursor = 'move';

  private moveState: MoveState | null = null;
  private transformHandles: TransformHandle[] = [];
  private handleSize = 8;
  private rotationHandleOffset = 30;

  static getMetadata(): ToolMetadata {
    return {
      id: 'move',
      name: 'Move Tool',
      description: 'Move, resize, and rotate objects',
      category: 'transform',
      groupId: 'transform-group',
      icon: ToolGroupIcons['move'],
      cursor: 'move',
      shortcut: 'V',
      priority: 1
    };
  }

  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  protected getTransformOperation(): string {
    return this.moveState?.transformMode || 'move';
  }

  protected calculateTransform(event: ToolEvent): Partial<TransformData> {
    if (!this.moveState) return {};

    const deltaX = event.canvasX - this.moveState.startPoint.x;
    const deltaY = event.canvasY - this.moveState.startPoint.y;

    return {
      transformParams: {
        deltaX,
        deltaY,
        handle: this.moveState.handle?.type,
        mode: this.moveState.transformMode
      }
    };
  }

  protected canTransform(objects: CanvasObject[]): boolean {
    return objects.length > 0;
  }

  async onActivate(): Promise<void> {
    this.setState(ToolState.ACTIVE);
    
    // Subscribe to selection changes
    const unsubscribe = this.dependencies.eventBus.on('selection.changed', (_data) => {
      this.updateTransformHandles();
    });
    this.registerCleanup(unsubscribe);

    // Update handles for current selection
    this.updateTransformHandles();
  }

  async onDeactivate(): Promise<void> {
    this.setState(ToolState.INACTIVE);
    this.clearTransformHandles();
    await this.cleanupTool();
  }

  onMouseDown(event: ToolEvent): void {
    if (this.getState() !== ToolState.ACTIVE) return;

    const point = { x: event.canvasX, y: event.canvasY };
    
    // Check if clicking on a handle
    const handle = this.getHandleAtPoint(point);
    
    if (handle) {
      // Start transform with handle
      this.startTransform(event, handle);
    } else {
      // Check if clicking on an object
      const object = this.getObjectUnderCursor(event);
      if (object) {
        const selectedObjects = this.getSelectedObjects();
        if (!selectedObjects.find(obj => obj.id === object.id)) {
          this.selectObject(object.id);
        }
        // Start move transform
        this.startTransform(event, null);
      }
    }
  }

  onMouseMove(event: ToolEvent): void {
    if (this.getState() === ToolState.WORKING && this.moveState) {
      this.updateTransform(event);
    } else if (this.getState() === ToolState.ACTIVE) {
      // Update cursor based on handle hover
      const handle = this.getHandleAtPoint({ x: event.canvasX, y: event.canvasY });
      this.cursor = handle ? handle.cursor : 'move';
    }
  }

  onMouseUp(event: ToolEvent): void {
    if (this.getState() !== ToolState.WORKING || !this.moveState) return;

    this.completeTransform(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.handleKeyDown(event);
  }

  onKeyUp(event: KeyboardEvent): void {
    this.handleKeyUp(event);
  }

  private startTransform(event: ToolEvent, handle: TransformHandle | null): void {
    const selectedObjects = this.getSelectedObjects();
    if (selectedObjects.length === 0) return;

    // Store original transforms
    const originalTransforms = new Map<string, TransformBounds>();
    selectedObjects.forEach(obj => {
      originalTransforms.set(obj.id, {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation || 0
      });
    });

    this.moveState = {
      startPoint: { x: event.canvasX, y: event.canvasY },
      originalTransforms,
      handle,
      transformMode: handle ? (handle.type === 'rotate' ? 'rotate' : 'resize') : 'move'
    };

    this.cursor = handle ? handle.cursor : 'grabbing';
    this.handleMouseDown(event);
  }

  private updateTransform(event: ToolEvent): void {
    if (!this.moveState) return;

    const selectedObjects = this.getSelectedObjects();
    const deltaX = event.canvasX - this.moveState.startPoint.x;
    const deltaY = event.canvasY - this.moveState.startPoint.y;

    switch (this.moveState.transformMode) {
      case 'move':
        this.updateMove(selectedObjects, deltaX, deltaY);
        break;
      case 'resize':
        this.updateResize(selectedObjects, deltaX, deltaY, event);
        break;
      case 'rotate':
        this.updateRotation(selectedObjects, event);
        break;
    }

    this.handleMouseMove(event);
  }

  private updateMove(objects: CanvasObject[], deltaX: number, deltaY: number): void {
    // Only update preview positions - actual state change happens in completeTransform
    objects.forEach(obj => {
      const original = this.moveState?.originalTransforms.get(obj.id);
      if (original) {
        // Store preview position without committing
        obj.x = original.x + deltaX;
        obj.y = original.y + deltaY;
      }
    });
  }

  private updateResize(objects: CanvasObject[], deltaX: number, deltaY: number, event: ToolEvent): void {
    if (!this.moveState?.handle) return;

    const handle = this.moveState.handle;
    const bounds = this.calculateSelectionBounds(objects);
    const original = this.moveState.originalTransforms.get(objects[0].id);
    if (!original) return;

    const newBounds = { ...bounds };
    const aspectRatio = original.width / original.height;

    switch (handle.type) {
      case 'nw':
        newBounds.x += deltaX;
        newBounds.y += deltaY;
        newBounds.width -= deltaX;
        newBounds.height -= deltaY;
        break;
      case 'ne':
        newBounds.y += deltaY;
        newBounds.width += deltaX;
        newBounds.height -= deltaY;
        break;
      case 'se':
        newBounds.width += deltaX;
        newBounds.height += deltaY;
        break;
      case 'sw':
        newBounds.x += deltaX;
        newBounds.width -= deltaX;
        newBounds.height += deltaY;
        break;
      case 'n':
        newBounds.y += deltaY;
        newBounds.height -= deltaY;
        break;
      case 'e':
        newBounds.width += deltaX;
        break;
      case 's':
        newBounds.height += deltaY;
        break;
      case 'w':
        newBounds.x += deltaX;
        newBounds.width -= deltaX;
        break;
    }

    // Constrain proportions if shift is held
    if (event.shiftKey && (handle.type === 'nw' || handle.type === 'ne' || handle.type === 'se' || handle.type === 'sw')) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newBounds.height = newBounds.width / aspectRatio;
      } else {
        newBounds.width = newBounds.height * aspectRatio;
      }
    }

    // Apply minimum size
    newBounds.width = Math.max(10, newBounds.width);
    newBounds.height = Math.max(10, newBounds.height);

    // Only update preview - actual state change happens in completeTransform
    if (objects.length === 1) {
      const obj = objects[0];
      obj.x = newBounds.x;
      obj.y = newBounds.y;
      obj.width = newBounds.width;
      obj.height = newBounds.height;
    }

    // Update handles
    this.updateTransformHandles();
  }

  private updateRotation(objects: CanvasObject[], event: ToolEvent): void {
    if (objects.length === 0) return;

    const bounds = this.calculateSelectionBounds(objects);
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const angle = Math.atan2(
      event.canvasY - centerY,
      event.canvasX - centerX
    ) * 180 / Math.PI + 90;

    let rotation = angle;

    // Snap to 15 degree increments if shift is held
    if (event.shiftKey) {
      rotation = Math.round(rotation / 15) * 15;
    }

    // Only update preview - actual state change happens in completeTransform
    if (objects.length === 1) {
      objects[0].rotation = rotation;
    }

    // Update handles
    this.updateTransformHandles();
  }

  private completeTransform(event: ToolEvent): void {
    if (!this.moveState) return;

    const selectedObjects = this.getSelectedObjects();
    const commands: Command[] = [];

    selectedObjects.forEach(obj => {
      const original = this.moveState!.originalTransforms.get(obj.id);
      if (original) {
        const current = {
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          rotation: obj.rotation || 0
        };

        // Only create command if something changed
        if (JSON.stringify(original) !== JSON.stringify(current)) {
          const command = this.dependencies.commandFactory.createUpdateObjectCommand(
            obj.id,
            current
          );
          commands.push(command);
        }
      }
    });

    if (commands.length > 0) {
      const compositeCommand = this.dependencies.commandFactory.createCompositeCommand(
        `${this.moveState.transformMode} Objects`,
        commands
      );
      this.dependencies.commandManager.executeCommand(compositeCommand);
    }

    this.handleMouseUp(event);
    this.moveState = null;
    this.cursor = 'move';
  }

  private updateTransformHandles(): void {
    const selectedObjects = this.getSelectedObjects();
    
    if (selectedObjects.length === 0) {
      this.clearTransformHandles();
      return;
    }

    const bounds = this.calculateSelectionBounds(selectedObjects);
    
    // Create handles
    this.transformHandles = [
      // Corner handles
      { type: 'nw', x: bounds.x, y: bounds.y, cursor: 'nw-resize' },
      { type: 'ne', x: bounds.x + bounds.width, y: bounds.y, cursor: 'ne-resize' },
      { type: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height, cursor: 'se-resize' },
      { type: 'sw', x: bounds.x, y: bounds.y + bounds.height, cursor: 'sw-resize' },
      // Edge handles
      { type: 'n', x: bounds.x + bounds.width / 2, y: bounds.y, cursor: 'n-resize' },
      { type: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, cursor: 'e-resize' },
      { type: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, cursor: 's-resize' },
      { type: 'w', x: bounds.x, y: bounds.y + bounds.height / 2, cursor: 'w-resize' },
      // Rotation handle
      { type: 'rotate', x: bounds.x + bounds.width / 2, y: bounds.y - this.rotationHandleOffset, cursor: 'grab' }
    ] as TransformHandle[];

    // Render handles (this would be done through canvas rendering)
    this.renderTransformHandles();
  }

  private clearTransformHandles(): void {
    this.transformHandles = [];
    // Clear rendered handles
  }

  private renderTransformHandles(): void {
    // This would render the handles on the canvas overlay
    // For now, we'll emit an event that the canvas can listen to
    this.emitOperation('handles.update', {
      handles: this.transformHandles,
      count: this.transformHandles.length
    });
  }

  private getHandleAtPoint(point: Point): TransformHandle | null {
    const threshold = this.handleSize / 2 + 2;
    
    return this.transformHandles.find(handle => {
      const dx = Math.abs(point.x - handle.x);
      const dy = Math.abs(point.y - handle.y);
      return dx <= threshold && dy <= threshold;
    }) || null;
  }

  /**
   * Public method for adapter integration - Move objects by delta
   */
  async moveObjects(deltaX: number, deltaY: number): Promise<void> {
    const selectedObjects = this.getSelectedObjects();
    if (selectedObjects.length === 0) {
      throw new Error('No objects selected to move');
    }

    const commands: Command[] = [];
    
    selectedObjects.forEach(obj => {
      const newPosition = {
        x: obj.x + deltaX,
        y: obj.y + deltaY
      };
      
      const command = this.dependencies.commandFactory.createUpdateObjectCommand(
        obj.id,
        newPosition
      );
      commands.push(command);
    });

    if (commands.length > 0) {
      const compositeCommand = this.dependencies.commandFactory.createCompositeCommand(
        'Move Objects',
        commands
      );
      await this.dependencies.commandManager.executeCommand(compositeCommand);
    }
  }

  /**
   * Public method for adapter integration - Move objects to position
   */
  async moveObjectsToPosition(x: number, y: number): Promise<void> {
    const selectedObjects = this.getSelectedObjects();
    if (selectedObjects.length === 0) {
      throw new Error('No objects selected to move');
    }

    // For single object, move to exact position
    // For multiple objects, move maintaining relative positions
    if (selectedObjects.length === 1) {
      const command = this.dependencies.commandFactory.createUpdateObjectCommand(
        selectedObjects[0].id,
        { x, y }
      );
      await this.dependencies.commandManager.executeCommand(command);
    } else {
      // Calculate center of selection
      const bounds = this.calculateSelectionBounds(selectedObjects);
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      
      const deltaX = x - centerX;
      const deltaY = y - centerY;
      
      await this.moveObjects(deltaX, deltaY);
    }
  }

  /**
   * Public method for adapter integration - Align objects
   */
  async alignObjects(alignment: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'middle'): Promise<void> {
    const selectedObjects = this.getSelectedObjects();
    if (selectedObjects.length < 2) {
      throw new Error('Need at least 2 objects to align');
    }

    const bounds = this.calculateSelectionBounds(selectedObjects);
    const commands: Command[] = [];

    selectedObjects.forEach(obj => {
      let newPosition: Partial<CanvasObject> = {};
      
      switch (alignment) {
        case 'left':
          newPosition = { x: bounds.x };
          break;
        case 'right':
          newPosition = { x: bounds.x + bounds.width - obj.width };
          break;
        case 'top':
          newPosition = { y: bounds.y };
          break;
        case 'bottom':
          newPosition = { y: bounds.y + bounds.height - obj.height };
          break;
        case 'center':
          newPosition = { x: bounds.x + (bounds.width - obj.width) / 2 };
          break;
        case 'middle':
          newPosition = { y: bounds.y + (bounds.height - obj.height) / 2 };
          break;
      }
      
      if (Object.keys(newPosition).length > 0) {
        const command = this.dependencies.commandFactory.createUpdateObjectCommand(
          obj.id,
          newPosition
        );
        commands.push(command);
      }
    });

    if (commands.length > 0) {
      const compositeCommand = this.dependencies.commandFactory.createCompositeCommand(
        `Align Objects ${alignment}`,
        commands
      );
      await this.dependencies.commandManager.executeCommand(compositeCommand);
    }
  }

  private calculateSelectionBounds(objects: CanvasObject[]): TransformBounds {
    if (objects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    }

    if (objects.length === 1) {
      const obj = objects[0];
      return {
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation || 0
      };
    }

    // Calculate bounding box for multiple objects
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    objects.forEach(obj => {
      minX = Math.min(minX, obj.x);
      minY = Math.min(minY, obj.y);
      maxX = Math.max(maxX, obj.x + obj.width);
      maxY = Math.max(maxY, obj.y + obj.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0
    };
  }
}