import { DrawingTool } from './DrawingTool';
import { ToolDependencies, ToolState, type ToolOptions } from '../base/BaseTool';
import { type ToolEvent } from '../../../events/canvas/ToolEvents';
import { type CanvasManager } from '../../canvas/CanvasManager';
import { type CanvasObject } from '../../objects/types';
import { type ToolMetadata } from '../base/ToolRegistry';
import { PixelBuffer, type Brush, type Color } from '../../pixel/PixelBuffer';
import { Eraser } from 'lucide-react';
import Konva from 'konva';
import '../../../events/tools/DrawingToolEvents';

export interface EraserToolOptions extends ToolOptions {
  size: number;
  opacity: number;
  hardness: number;
  mode: 'alpha' | 'background';
  backgroundColor: string;
  pressure: boolean;
}

interface EraserStroke {
  id: string;
  targetObjectId: string;
  points: Array<{
    x: number;
    y: number;
    pressure: number;
    timestamp: number;
  }>;
  options: EraserToolOptions;
}

/**
 * EraserTool - Professional pixel erasing tool
 * 
 * Implements pixel-level erasing on image objects with two modes:
 * - Alpha mode: Erases to transparency
 * - Background mode: Erases to a specific background color
 * 
 * Follows senior architecture patterns with proper dependency injection,
 * event-driven communication, and command pattern for undo/redo.
 */
export class EraserTool extends DrawingTool {
  private currentStroke: EraserStroke | null = null;
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
    
    // Validate we have image objects to erase on
    const imageObjects = this.getImageObjects();
    if (imageObjects.length === 0) {
      await this.handleNoImageObjects();
      return;
    }
    
    // Set up event subscriptions
    this.setupEventSubscriptions();
    
    // Initialize for first selected image object
    this.targetImageObject = imageObjects[0];
    
    // Initialize pixel buffer
    await this.initializePixelBuffer();
    
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
   * Mouse down - start erasing
   */
  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    if (!this.targetImageObject || !this.pixelBuffer) return;
    
    this.setState(ToolState.WORKING);
    this.isDrawing = true;
    this.lastPoint = {
      x: event.canvasX,
      y: event.canvasY,
      pressure: event.pressure || 1.0,
      timestamp: Date.now()
    };
    
    // Create new stroke
    this.currentStroke = {
      id: `eraser-stroke-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      targetObjectId: this.targetImageObject.id,
      points: [{
        x: event.canvasX,
        y: event.canvasY,
        pressure: event.pressure || 1.0,
        timestamp: Date.now()
      }],
      options: this.getAllOptions() as EraserToolOptions
    };
    
    // Apply initial erase
    const localPoint = this.toLocalCoordinates(event.canvasX, event.canvasY);
    const brush = this.createBrush(this.getAllOptions() as Record<string, string | number | boolean>);
    this.pixelBuffer.applyBrush(localPoint, brush);
    
    // Emit erasing started event
    this.dependencies.eventBus.emit('erasing.started', {
      toolId: this.id,
      canvasId: this.targetImageObject.id,
      position: { x: event.canvasX, y: event.canvasY },
      mode: this.currentStroke.options.mode
    });
    
    this.updatePreview();
  }
  
  /**
   * Mouse move - continue erasing
   */
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.lastPoint || !this.pixelBuffer) return;
    
    const currentPoint = { 
      x: event.canvasX, 
      y: event.canvasY,
      pressure: event.pressure || 1.0,
      timestamp: Date.now()
    };
    
    // Add point to stroke
    this.currentStroke.points.push(currentPoint);
    
    // Apply erasing along the line
    const localFrom = this.toLocalCoordinates(this.lastPoint.x, this.lastPoint.y);
    const localTo = this.toLocalCoordinates(currentPoint.x, currentPoint.y);
    const brush = this.createBrush(this.getAllOptions() as Record<string, string | number | boolean>);
    
    // Interpolate pressure
    const fromBrush = { ...brush, pressure: this.lastPoint.pressure };
    const toBrush = { ...brush, pressure: currentPoint.pressure };
    
    this.interpolateErase(localFrom, localTo, fromBrush, toBrush);
    
    // Emit erasing updated event
    this.dependencies.eventBus.emit('erasing.updated', {
      toolId: this.id,
      canvasId: this.targetImageObject!.id,
      position: currentPoint
    });
    
    this.updatePreview();
    this.lastPoint = currentPoint;
  }
  
  /**
   * Mouse up - finish erasing
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
  protected getDefaultOptions(): EraserToolOptions {
    return {
      size: 20,
      opacity: 100,
      hardness: 100,
      mode: 'alpha',
      backgroundColor: '#FFFFFF',
      pressure: true
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
      hardness: {
        type: 'number',
        defaultValue: 100,
        min: 0,
        max: 100,
        step: 1,
        label: 'Hardness'
      },
      mode: {
        type: 'select',
        defaultValue: 'alpha',
        options: [
          { value: 'alpha', label: 'Erase to Transparent' },
          { value: 'background', label: 'Erase to Background' }
        ],
        label: 'Mode'
      },
      backgroundColor: {
        type: 'color',
        defaultValue: '#FFFFFF',
        label: 'Background Color'
      },
      pressure: {
        type: 'boolean',
        defaultValue: true,
        label: 'Pressure Sensitivity'
      }
    };
  }
  
  /**
   * Create brush for erasing
   */
  protected createBrush(options: Record<string, string | number | boolean>): Brush {
    const isAlphaMode = options.mode === 'alpha';
    const color = isAlphaMode 
      ? { r: 0, g: 0, b: 0, a: 0 } // Transparent for alpha mode
      : this.hexToRgba(options.backgroundColor as string); // Background color
    
    return {
      size: options.size as number,
      hardness: (options.hardness as number) / 100,
      opacity: (options.opacity as number) / 100,
      flow: 1.0, // Eraser always uses full flow
      color,
      blendMode: isAlphaMode ? 'normal' : 'normal', // Eraser uses normal blend mode
      pressure: options.pressure ? 1.0 : undefined
    };
  }
  
  /**
   * Initialize pixel buffer for current image
   */
  private async initializePixelBuffer(): Promise<void> {
    if (!this.targetImageObject) return;
    
    // Get image data from the object
    const imageData = await this.getImageDataFromObject(this.targetImageObject);
    if (!imageData) return;
    
    this.pixelBuffer = new PixelBuffer(
      imageData,
      this.targetImageObject.width,
      this.targetImageObject.height
    );
  }
  
  /**
   * Get image data from canvas object
   */
  private async getImageDataFromObject(object: CanvasObject): Promise<ImageData | null> {
    if (object.type === 'image' && object.data) {
      const imgData = object.data as import('@/lib/editor/objects/types').ImageData;
      if (imgData.element instanceof HTMLCanvasElement) {
        const ctx = imgData.element.getContext('2d');
        if (ctx) {
          return ctx.getImageData(0, 0, object.width, object.height);
        }
      } else if (imgData.element instanceof HTMLImageElement) {
        // Create temporary canvas to get image data
        const canvas = document.createElement('canvas');
        canvas.width = object.width;
        canvas.height = object.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgData.element, 0, 0, object.width, object.height);
          return ctx.getImageData(0, 0, object.width, object.height);
        }
      }
    }
    return null;
  }
  
  /**
   * Convert canvas coordinates to local object coordinates
   */
  private toLocalCoordinates(canvasX: number, canvasY: number): { x: number; y: number } {
    if (!this.targetImageObject) return { x: canvasX, y: canvasY };
    
    return {
      x: canvasX - this.targetImageObject.x,
      y: canvasY - this.targetImageObject.y
    };
  }
  
  /**
   * Interpolate erasing between two points with pressure
   */
  private interpolateErase(
    from: { x: number; y: number },
    to: { x: number; y: number },
    fromBrush: Brush,
    toBrush: Brush
  ): void {
    if (!this.pixelBuffer) return;
    
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );
    
    if (distance === 0) {
      this.pixelBuffer.applyBrush(from, fromBrush);
      return;
    }
    
    // Calculate spacing based on brush size
    const avgSize = (fromBrush.size + toBrush.size) / 2;
    const spacing = Math.max(1, avgSize * 0.25);
    const steps = Math.ceil(distance / spacing);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t
      };
      
      // Interpolate brush properties
      const brush: Brush = {
        ...fromBrush,
        size: fromBrush.size + (toBrush.size - fromBrush.size) * t,
        pressure: fromBrush.pressure && toBrush.pressure
          ? fromBrush.pressure + (toBrush.pressure - fromBrush.pressure) * t
          : undefined
      };
      
      this.pixelBuffer.applyBrush(point, brush);
    }
  }
  
  /**
   * Update preview overlay
   */
  private updatePreview(): void {
    if (!this.currentStroke || !this.pixelBuffer) return;
    
    this.dependencies.canvasManager.clearOverlay();
    
    // Get updated image data
    const imageData = this.pixelBuffer.getImageData();
    
    // Create temporary canvas for preview
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    // Create Konva image from canvas
    const image = new Konva.Image({
      x: this.targetImageObject!.x,
      y: this.targetImageObject!.y,
      image: tempCanvas,
      opacity: 0.8 // Slightly transparent to show it's a preview
    });
    
    this.dependencies.canvasManager.addToOverlay(image);
  }
  
  /**
   * Handle case when no image objects are available
   */
  private async handleNoImageObjects(): Promise<void> {
    // Emit event for UI to show message
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      message: 'Eraser tool requires an image object. Please select an image or create one first.',
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
          this.initializePixelBuffer();
        }
      }
    });
    this.registerCleanup(selectionUnsubscribe);
    
    // Listen for object deletion
    const objectDeleteUnsubscribe = this.dependencies.eventBus.on('canvas.object.removed', (data) => {
      if (this.targetImageObject?.id === data.objectId) {
        this.targetImageObject = null;
        this.pixelBuffer = null;
        // Find another image object
        const imageObjects = this.getImageObjects();
        if (imageObjects.length > 0) {
          this.targetImageObject = imageObjects[0];
          this.initializePixelBuffer();
        }
      }
    });
    this.registerCleanup(objectDeleteUnsubscribe);
  }
  
  /**
   * Commit the current stroke via command pattern
   */
  private async commitStroke(): Promise<void> {
    if (!this.currentStroke || !this.pixelBuffer) return;
    
    // Get the erased image data (not used directly - command will handle the actual application)
    
    // Use the factory to create the command
    const command = this.dependencies.commandFactory.createDrawCommand(
      this.currentStroke.targetObjectId,
      this.currentStroke.points,
      {
        size: this.currentStroke.options.size,
        opacity: this.currentStroke.options.opacity,
        color: this.currentStroke.options.mode === 'alpha' ? '#00000000' : this.currentStroke.options.backgroundColor,
        blendMode: 'normal',
        pressure: this.currentStroke.options.pressure,
        flow: 100,
        hardness: this.currentStroke.options.hardness,
        spacing: 25,
        roundness: 100,
        angle: 0
      }
    );
    
    // Execute the command
    await this.dependencies.commandManager.executeCommand(command);
    
    // Emit erasing completed event
    this.dependencies.eventBus.emit('erasing.completed', {
      toolId: this.id,
      canvasId: this.currentStroke.targetObjectId,
      result: {
        strokeId: this.currentStroke.id,
        pointCount: this.currentStroke.points.length,
        mode: this.currentStroke.options.mode
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
    this.pixelBuffer = null;
  }
  
  /**
   * Convert hex color to RGBA
   */
  private hexToRgba(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 255
    } : { r: 0, g: 0, b: 0, a: 255 };
  }
  
  /**
   * Tool metadata for registration
   */
  static getMetadata(): ToolMetadata {
    return {
      id: 'eraser',
      name: 'Eraser',
      description: 'Erase pixels from image objects',
      category: 'drawing',
      groupId: 'drawing-group',
      icon: Eraser,
      cursor: 'crosshair',
      shortcut: 'E',
      priority: 2
    };
  }
}