import { BaseTool, ToolDependencies, ToolState, type ToolOptions } from '../base/BaseTool';
import { type ToolEvent } from '../../../events/canvas/ToolEvents';
import { type CanvasManager } from '../../canvas/CanvasManager';
import { type CanvasObject } from '../../objects/types';
import { type ToolMetadata } from '../base/ToolRegistry';
import Konva from 'konva';
import { Brush } from 'lucide-react';

export interface BrushToolOptions extends ToolOptions {
  size: number;
  opacity: number;
  color: string;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  pressure: boolean;
  flow: number;
  hardness: number;
  spacing: number;
  roundness: number;
  angle: number;
}

interface BrushStroke {
  id: string;
  targetObjectId: string;
  points: Array<{
    x: number;
    y: number;
    pressure: number;
    timestamp: number;
  }>;
  options: BrushToolOptions;
}

/**
 * BrushTool - Professional pixel painting tool
 * 
 * Implements pixel-level painting on image objects with advanced brush engine.
 * Follows senior architecture patterns with proper dependency injection,
 * event-driven communication, and command pattern for undo/redo.
 */
export class BrushTool extends BaseTool<BrushToolOptions> {
  private currentStroke: BrushStroke | null = null;
  private isDrawing: boolean = false;
  private lastPoint: { x: number; y: number } | null = null;
  private targetImageObject: CanvasObject | null = null;

  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
    this.cursor = 'crosshair';
  }

  /**
   * Tool activation lifecycle
   */
  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);

    // Validate we have image objects to paint on
    const imageObjects = this.getImageObjects();
    if (imageObjects.length === 0) {
      await this.handleNoImageObjects();
      return;
    }

    // Set up event subscriptions
    this.setupEventSubscriptions();

    // Initialize for first selected image object
    this.targetImageObject = imageObjects[0];
    
    this.setState(ToolState.ACTIVE);
  }

  /**
   * Tool deactivation lifecycle
   */
  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);

    // Commit any active stroke
    if (this.currentStroke) {
      await this.commitStroke();
    }

    // Clean up state
    this.cleanup();

    this.setState(ToolState.INACTIVE);
  }

  /**
   * Mouse down - start drawing stroke
   */
  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    if (!this.targetImageObject) return;

    this.setState(ToolState.WORKING);
    this.isDrawing = true;
    this.lastPoint = { x: event.canvasX, y: event.canvasY };

    // Create new stroke
    this.currentStroke = {
      id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetObjectId: this.targetImageObject.id,
      points: [{
        x: event.canvasX,
        y: event.canvasY,
        pressure: event.pressure || 1.0,
        timestamp: Date.now()
      }],
      options: this.getAllOptions()
    };

    // Emit drawing started event
    this.dependencies.eventBus.emit('drawing.started', {
      toolId: this.id,
      canvasId: this.targetImageObject.id,
      position: { x: event.canvasX, y: event.canvasY },
      point: { x: event.canvasX, y: event.canvasY, pressure: event.pressure || 1.0 },
      options: this.getAllOptions()
    });
  }

  /**
   * Mouse move - continue drawing stroke
   */
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.lastPoint) return;

    const currentPoint = { x: event.canvasX, y: event.canvasY };
    
    // Add point to stroke
    this.currentStroke.points.push({
      x: currentPoint.x,
      y: currentPoint.y,
      pressure: event.pressure || 1.0,
      timestamp: Date.now()
    });

    // Emit drawing updated event
    this.dependencies.eventBus.emit('drawing.updated', {
      toolId: this.id,
      canvasId: this.targetImageObject!.id,
      position: currentPoint
    });
    
    this.updatePreview();
    this.lastPoint = currentPoint;
  }

  /**
   * Mouse up - finish drawing stroke
   */
  onMouseUp(event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke) return;

    // Add final point
    this.currentStroke.points.push({
      x: event.canvasX,
      y: event.canvasY,
      pressure: event.pressure || 1.0,
      timestamp: Date.now()
    });

    // Commit the stroke
    this.commitStroke();

    // Reset state
    this.isDrawing = false;
    this.lastPoint = null;
    this.currentStroke = null;
    this.dependencies.canvasManager.clearOverlay();

    this.setState(ToolState.ACTIVE);
  }

  /**
   * Get default tool options
   */
  protected getDefaultOptions(): BrushToolOptions {
    return {
      size: 20,
      opacity: 100,
      color: '#000000',
      blendMode: 'normal',
      pressure: true,
      flow: 100,
      hardness: 100,
      spacing: 25,
      roundness: 100,
      angle: 0
    };
  }

  /**
   * Get tool option definitions for UI
   */
  public getOptionDefinitions(): Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select' | 'color';
    defaultValue?: string | number | boolean;
    label?: string;
    options?: Array<{ value: string | number; label: string; }>;
    min?: number;
    max?: number;
    step?: number;
  }> {
    return {
      size: {
        type: 'number',
        defaultValue: 20,
        min: 1,
        max: 500,
        step: 1,
        label: 'Size'
      },
      opacity: {
        type: 'number',
        defaultValue: 100,
        min: 0,
        max: 100,
        step: 1,
        label: 'Opacity'
      },
      color: {
        type: 'color',
        defaultValue: '#000000',
        label: 'Color'
      },
      blendMode: {
        type: 'select',
        defaultValue: 'normal',
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
          { value: 'soft-light', label: 'Soft Light' },
          { value: 'hard-light', label: 'Hard Light' }
        ],
        label: 'Blend Mode'
      },
      pressure: {
        type: 'boolean',
        defaultValue: true,
        label: 'Pressure Sensitivity'
      },
      flow: {
        type: 'number',
        defaultValue: 100,
        min: 1,
        max: 100,
        step: 1,
        label: 'Flow'
      },
      hardness: {
        type: 'number',
        defaultValue: 100,
        min: 0,
        max: 100,
        step: 1,
        label: 'Hardness'
      },
      spacing: {
        type: 'number',
        defaultValue: 25,
        min: 1,
        max: 100,
        step: 1,
        label: 'Spacing'
      },
    };
  }

  private updatePreview(): void {
    if (!this.currentStroke) return;

    this.dependencies.canvasManager.clearOverlay();
    
    const line = new Konva.Line({
      points: this.currentStroke.points.flatMap(p => [p.x, p.y]),
      stroke: this.currentStroke.options.color,
      strokeWidth: this.currentStroke.options.size,
      tension: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
      globalCompositeOperation: this.getCompositeOperation(this.currentStroke.options.blendMode),
      opacity: this.currentStroke.options.opacity / 100,
    });
    
    this.dependencies.canvasManager.addToOverlay(line);
  }

  private getCompositeOperation(blendMode: BrushToolOptions['blendMode']) {
    switch (blendMode) {
      case 'multiply':
      case 'screen':
      case 'overlay':
      case 'soft-light':
      case 'hard-light':
        return blendMode;
      default:
        return 'source-over'; // 'normal' maps to 'source-over'
    }
  }

  /**
   * Get image objects that can be painted on
   */
  private getImageObjects(): CanvasObject[] {
    const selectedObjects = this.dependencies.objectManager.getSelectedObjects();
    
    // Filter to only image objects
    const imageObjects = selectedObjects.filter((obj: CanvasObject) => obj.type === 'image');
    
    // If no image objects selected, get all image objects
    if (imageObjects.length === 0) {
      const allObjects = this.dependencies.objectManager.getAllObjects();
      return allObjects.filter((obj: CanvasObject) => obj.type === 'image');
    }
    
    return imageObjects;
  }

  /**
   * Handle case when no image objects are available
   */
  private async handleNoImageObjects(): Promise<void> {
    // Emit event for UI to show message
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      message: 'Brush tool requires an image object to paint on. Please select an image or create one first.',
      type: 'warning'
    });

    // Switch to default tool
    await this.dependencies.eventBus.emit('tool.activated', {
      toolId: 'move',
      previousToolId: this.id
    });
  }

  /**
   * Set up event subscriptions
   */
  private setupEventSubscriptions(): void {
    // Listen for selection changes
    const selectionUnsubscribe = this.dependencies.eventBus.on('selection.changed', (data) => {
      if (data.selection?.type === 'objects' && 'objectIds' in data.selection && data.selection.objectIds) {
        const selectedObjects = data.selection.objectIds
          .map(id => this.dependencies.objectManager.getObject(id))
          .filter((obj): obj is CanvasObject => obj !== null);
        
        const imageObjects = selectedObjects.filter((obj: CanvasObject) => obj.type === 'image');
        if (imageObjects.length > 0) {
          this.targetImageObject = imageObjects[0];
        }
      }
    });
    this.registerCleanup(selectionUnsubscribe);

    // Listen for object deletion
    const objectDeleteUnsubscribe = this.dependencies.eventBus.on('canvas.object.removed', (data) => {
      if (this.targetImageObject?.id === data.objectId) {
        this.targetImageObject = null;
        // Find another image object
        const imageObjects = this.getImageObjects();
        if (imageObjects.length > 0) {
          this.targetImageObject = imageObjects[0];
        }
      }
    });
    this.registerCleanup(objectDeleteUnsubscribe);
  }

  /**
   * Commit the current stroke via command pattern
   */
  private async commitStroke(): Promise<void> {
    if (!this.currentStroke) return;

    // Use the factory to create the command
    const command = this.dependencies.commandFactory.createDrawCommand(
      this.currentStroke.targetObjectId,
      this.currentStroke.points,
      this.currentStroke.options
    );
    
    // Execute the command
    await this.dependencies.commandManager.executeCommand(command);

    // Emit drawing completed event
    this.dependencies.eventBus.emit('drawing.completed', {
      toolId: this.id,
      canvasId: this.currentStroke.targetObjectId,
      result: {
        strokeId: this.currentStroke.id,
        pointCount: this.currentStroke.points.length
      }
    });
  }

  /**
   * Clean up tool state
   */
  private cleanup(): void {
    this.isDrawing = false;
    this.lastPoint = null;
    this.currentStroke = null;
    this.targetImageObject = null;
  }

  /**
   * High-level API for adapters: Paint multiple strokes
   * Used by AI adapters to apply brush strokes programmatically
   */
  async paintStrokes(strokes: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    pressure?: number;
  }>): Promise<void> {
    if (!this.targetImageObject) {
      throw new Error('No target image object for painting');
    }

    // Create stroke data
    const strokePoints: Array<{
      x: number;
      y: number;
      pressure: number;
      timestamp: number;
    }> = [];

    // Convert strokes to points
    for (const stroke of strokes) {
      strokePoints.push({
        x: stroke.from.x,
        y: stroke.from.y,
        pressure: stroke.pressure || 1.0,
        timestamp: Date.now()
      });
      strokePoints.push({
        x: stroke.to.x,
        y: stroke.to.y,
        pressure: stroke.pressure || 1.0,
        timestamp: Date.now() + 1
      });
    }

    // Create and execute command
    const command = this.dependencies.commandFactory.createDrawCommand(
      this.targetImageObject.id,
      strokePoints,
      this.getAllOptions()
    );
    
    await this.dependencies.commandManager.executeCommand(command);
  }

  /**
   * High-level API for adapters: Apply a pattern
   * Used by AI adapters to apply patterns like dots, lines, scribble, fill
   */
  async applyPattern(pattern: 'dots' | 'lines' | 'scribble' | 'fill', bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void> {
    if (!this.targetImageObject) {
      throw new Error('No target image object for painting');
    }

    const objectBounds = bounds || {
      x: this.targetImageObject.x,
      y: this.targetImageObject.y,
      width: this.targetImageObject.width,
      height: this.targetImageObject.height
    };

    const strokes: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];

    switch (pattern) {
      case 'dots': {
        const size = this.getOption('size') as number;
        const spacing = size * 2;
        for (let y = objectBounds.y; y < objectBounds.y + objectBounds.height; y += spacing) {
          for (let x = objectBounds.x; x < objectBounds.x + objectBounds.width; x += spacing) {
            strokes.push({ from: { x, y }, to: { x, y } });
          }
        }
        break;
      }
      
      case 'lines': {
        const spacing = this.getOption('size') as number;
        for (let y = objectBounds.y; y < objectBounds.y + objectBounds.height; y += spacing) {
          strokes.push({
            from: { x: objectBounds.x, y },
            to: { x: objectBounds.x + objectBounds.width, y }
          });
        }
        break;
      }
      
      case 'scribble': {
        const segments = 20;
        for (let i = 0; i < segments; i++) {
          const x1 = objectBounds.x + Math.random() * objectBounds.width;
          const y1 = objectBounds.y + Math.random() * objectBounds.height;
          const x2 = objectBounds.x + Math.random() * objectBounds.width;
          const y2 = objectBounds.y + Math.random() * objectBounds.height;
          strokes.push({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });
        }
        break;
      }
      
      case 'fill': {
        const spacing = 1;
        for (let y = objectBounds.y; y < objectBounds.y + objectBounds.height; y += spacing) {
          strokes.push({
            from: { x: objectBounds.x, y },
            to: { x: objectBounds.x + objectBounds.width, y }
          });
        }
        break;
      }
    }

    await this.paintStrokes(strokes);
  }

  /**
   * Tool metadata for registration
   */
  static getMetadata(): ToolMetadata {
    return {
      id: 'brush',
      name: 'Brush',
      description: 'Paint pixels directly on image objects',
      category: 'drawing',
      groupId: 'drawing-group',
      icon: Brush,
      cursor: 'crosshair',
      shortcut: 'B',
      priority: 1
    };
  }
} 