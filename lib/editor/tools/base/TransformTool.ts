import { BaseTool, ToolState, type ToolOptions } from './BaseTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject } from '@/lib/editor/objects/types';

/**
 * Transform operation data structure
 */
export interface TransformData {
  objectIds: string[];
  startPosition: { x: number; y: number };
  currentPosition?: { x: number; y: number };
  modifiers: {
    duplicate: boolean;
    constrain: boolean;
    center: boolean;
  };
  transformType: 'move' | 'rotate' | 'scale' | 'crop' | 'flip';
  transformParams?: Record<string, string | number | boolean | { x: number; y: number } | undefined>;
}

/**
 * Base class for all transform tools
 * Handles common transform operations and state management
 */
export abstract class TransformTool<T extends ToolOptions = ToolOptions> extends BaseTool<T> {
  protected currentTransform: TransformData | null = null;
  protected transformStartTime: number = 0;

  /**
   * Get the transform operation name for this tool
   */
  protected abstract getTransformOperation(): string;

  /**
   * Calculate transform data from tool event
   */
  protected abstract calculateTransform(event: ToolEvent): Partial<TransformData>;

  /**
   * Validate if transform can be applied to selected objects
   */
  protected abstract canTransform(objects: CanvasObject[]): boolean;

  /**
   * Get additional transform parameters specific to this tool
   */
  protected getTransformParams(_event: ToolEvent): Record<string, string | number | boolean | { x: number; y: number } | undefined> {
    return {};
  }

  /**
   * Get keyboard modifiers from event
   */
  protected getModifiers(event: ToolEvent): TransformData['modifiers'] {
    return {
      duplicate: event.altKey || false,
      constrain: event.shiftKey || false,
      center: event.metaKey || false
    };
  }

  /**
   * Get selected objects that can be transformed
   */
  protected getSelectedObjects(): CanvasObject[] {
    const selectedObjects = this.dependencies.canvasManager.getSelectedObjects();
    return selectedObjects.filter(obj => this.canTransform([obj]));
  }

  /**
   * Get selected object IDs
   */
  protected getSelectedObjectIds(): string[] {
    return this.getSelectedObjects().map(obj => obj.id);
  }

  /**
   * Handle mouse down - start transform
   */
  protected handleMouseDown(event: ToolEvent): void {
    if (this.getState() !== ToolState.ACTIVE) return;

    try {
      const selectedObjects = this.getSelectedObjects();
      
      if (selectedObjects.length === 0) {
        // No objects selected - try to select object under cursor
        const objectUnderCursor = this.getObjectUnderCursor(event);
        if (objectUnderCursor && this.canTransform([objectUnderCursor])) {
          this.selectObject(objectUnderCursor.id);
          selectedObjects.push(objectUnderCursor);
        } else {
          // No valid object to transform
          return;
        }
      }

      this.setState(ToolState.WORKING);
      this.transformStartTime = Date.now();

      // Create transform data
      const transformData: TransformData = {
        objectIds: selectedObjects.map(obj => obj.id),
        startPosition: { x: event.canvasX, y: event.canvasY },
        modifiers: this.getModifiers(event),
        transformType: this.getTransformOperation() as TransformData['transformType'],
        transformParams: this.getTransformParams(event),
        ...this.calculateTransform(event)
      };

      this.currentTransform = transformData;

      // Emit transform start operation
      this.emitOperation(`${this.getTransformOperation()}.start`, transformData as unknown as Record<string, unknown>);

    } catch (error) {
      this.dependencies.eventBus.emit('tool.error', {
        toolId: this.id,
        instanceId: this.instanceId,
        error: error as Error,
        operation: 'mouseDown',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle mouse move - update transform
   */
  protected handleMouseMove(event: ToolEvent): void {
    if (this.getState() !== ToolState.WORKING || !this.currentTransform) return;

    try {
      // Update transform data
      const updatedTransform = {
        ...this.currentTransform,
        currentPosition: { x: event.canvasX, y: event.canvasY },
        modifiers: this.getModifiers(event),
        ...this.calculateTransform(event)
      };

      this.currentTransform = updatedTransform;

      // Emit transform update operation
      this.emitOperation(`${this.getTransformOperation()}.update`, updatedTransform as unknown as Record<string, unknown>);

    } catch (error) {
      this.dependencies.eventBus.emit('tool.error', {
        toolId: this.id,
        instanceId: this.instanceId,
        error: error as Error,
        operation: 'mouseMove',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle mouse up - complete transform
   */
  protected handleMouseUp(event: ToolEvent): void {
    if (this.getState() === ToolState.WORKING && this.currentTransform) {
      try {
        this.setState(ToolState.ACTIVE);

        // Final transform data
        const finalTransform = {
          ...this.currentTransform,
          currentPosition: { x: event.canvasX, y: event.canvasY },
          modifiers: this.getModifiers(event),
          duration: Date.now() - this.transformStartTime,
          ...this.calculateTransform(event)
        };

        // Emit transform complete operation
        this.emitOperation(`${this.getTransformOperation()}.complete`, finalTransform as unknown as Record<string, unknown>);

        // Clear current transform
        this.currentTransform = null;
        this.transformStartTime = 0;

      } catch (error) {
        this.dependencies.eventBus.emit('tool.error', {
          toolId: this.id,
          instanceId: this.instanceId,
          error: error as Error,
          operation: 'mouseUp',
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Handle keyboard events for transform modifiers
   */
  protected handleKeyDown(event: KeyboardEvent): void {
    // Update modifiers if transform is active
    if (this.getState() === ToolState.WORKING && this.currentTransform) {
      // Create fake tool event to get updated modifiers
      const fakeEvent: ToolEvent = {
        x: 0, y: 0, canvasX: 0, canvasY: 0,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        eventType: 'keydown',
        timestamp: Date.now(),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation()
      };

      const updatedModifiers = this.getModifiers(fakeEvent);
      
      // Check if modifiers changed
      const currentModifiers = this.currentTransform.modifiers;
      if (JSON.stringify(updatedModifiers) !== JSON.stringify(currentModifiers)) {
        this.currentTransform.modifiers = updatedModifiers;
        
        // Emit modifier change
        this.emitOperation(`${this.getTransformOperation()}.modifier.changed`, {
          ...this.currentTransform,
          modifiers: updatedModifiers
        } as unknown as Record<string, unknown>);
      }
    }
  }

  /**
   * Handle key up events
   */
  protected handleKeyUp(event: KeyboardEvent): void {
    // Same as keydown - update modifiers
    this.handleKeyDown(event);
  }

  /**
   * Get object under cursor
   */
  protected getObjectUnderCursor(event: ToolEvent): CanvasObject | null {
    // Use canvas manager to find object at position
    const object = this.dependencies.canvasManager.getObjectAtPoint({
      x: event.canvasX, 
      y: event.canvasY
    });
    
    return object;
  }

  /**
   * Select an object
   */
  protected selectObject(objectId: string): void {
    this.dependencies.canvasManager.selectObject(objectId);
  }

  /**
   * Common cleanup for transform tools
   */
  protected async cleanupTool(): Promise<void> {
    this.currentTransform = null;
    this.transformStartTime = 0;
  }


} 