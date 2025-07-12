import { BaseTool, ToolState, type ToolDependencies } from '../base/BaseTool';
import { type ToolEvent } from '@/lib/events/canvas/ToolEvents';
import { type ToolMetadata } from '../base/ToolRegistry';
import { CreateBrushStrokeCommand } from '../../commands/drawing/CreateBrushStrokeCommand';
import { BrushEngine } from '../engines/BrushEngine';
import React from 'react';

export interface BrushToolOptions {
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

/**
 * BrushTool - Pixel painting tool with advanced brush engine
 * Follows senior architecture patterns: event-driven, command-based, dependency injection
 */
export class BrushTool extends BaseTool {
  id = 'brush';
  name = 'Brush Tool';
  icon = () => React.createElement('div', { className: 'icon-brush' });
  cursor = 'crosshair';
  
  private brushEngine: BrushEngine | null = null;
  private currentStroke: any = null;
  private isDrawing = false;
  private lastPoint: { x: number; y: number } | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies);
  }
  
  // State change handler (required by BaseTool)
  protected onStateChange(from: ToolState, to: ToolState): void {
    console.log(`BrushTool: ${from} → ${to}`);
    
    if (to === ToolState.ACTIVE) {
      this.setupBrushEngine();
    } else if (to === ToolState.INACTIVE) {
      this.cleanupBrushEngine();
    }
  }
  
  // Tool setup
  protected async setupTool(): Promise<void> {
    console.log('BrushTool: Setting up brush tool...');
    
    // Initialize brush engine with default options
    this.brushEngine = new BrushEngine(this.getDefaultOptions());
    
    // Register cleanup
    this.registerCleanup(() => {
      this.brushEngine?.dispose();
      this.brushEngine = null;
    });
    
    // Register for option changes
    this.dependencies.eventBus.on('tool.option.changed', (event) => {
      if (event.toolId === this.id && this.brushEngine) {
        this.brushEngine.updateOptions(this.getAllOptions());
      }
    });
  }
  
  // Tool cleanup
  protected async cleanupTool(): Promise<void> {
    console.log('BrushTool: Cleaning up brush tool...');
    
    // Complete any active stroke
    if (this.isDrawing && this.currentStroke) {
      await this.completeStroke();
    }
    
    // Cleanup brush engine
    if (this.brushEngine) {
      this.brushEngine.dispose();
      this.brushEngine = null;
    }
  }
  
  // Default options
  protected getDefaultOptions(): BrushToolOptions {
    return {
      size: 10,
      opacity: 100,
      color: '#000000',
      blendMode: 'normal',
      pressure: false,
      flow: 100,
      hardness: 100,
      spacing: 20,
      roundness: 100,
      angle: 0
    };
  }
  
  // Get current options with defaults
  protected getAllOptions(): BrushToolOptions {
    const defaults = this.getDefaultOptions();
    // TODO: Implement proper options retrieval once EventToolOptionsStore is updated
    const current = {}; // this.dependencies.toolOptionsStore?.getOptions?.(this.id) || {};
    return { ...defaults, ...current };
  }
  
  // Mouse event handlers
  protected handleMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvents() || !this.brushEngine) return;
    
    try {
      // Get target image objects
      const selectedObjects = this.dependencies.canvasManager.getSelectedObjects();
      const imageObjects = selectedObjects.filter(obj => obj.type === 'image');
      
      if (imageObjects.length === 0) {
        // No image selected - emit error
        this.dependencies.eventBus.emit('tool.error', {
          toolId: this.id,
          instanceId: this.instanceId,
          error: new Error('No image selected for brush tool'),
          operation: 'mouseDown',
          timestamp: Date.now()
        });
        return;
      }
      
      // Start brush stroke
      this.startBrushStroke(event, imageObjects[0]);
      
    } catch (error) {
      this.dependencies.eventBus.emit('tool.error', {
        toolId: this.id,
        instanceId: this.instanceId,
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'mouseDown',
        timestamp: Date.now()
      });
    }
  }
  
  protected handleMouseMove(event: ToolEvent): void {
    if (!this.canHandleEvents() || !this.brushEngine) return;
    
    if (this.isDrawing && this.currentStroke) {
      this.continueBrushStroke(event);
    }
  }
  
  protected handleMouseUp(event: ToolEvent): void {
    if (this.isDrawing && this.currentStroke) {
      this.completeBrushStroke(event);
    }
  }
  
  // Keyboard event handlers (required by BaseTool)
  protected handleKeyDown(event: KeyboardEvent): void {
    // Handle brush-specific shortcuts
    if (event.key === '[' && !event.ctrlKey && !event.metaKey) {
      // Decrease brush size
      const options = this.getAllOptions();
      const newSize = Math.max(1, options.size - 1);
      this.setOption('size', newSize);
      event.preventDefault();
    } else if (event.key === ']' && !event.ctrlKey && !event.metaKey) {
      // Increase brush size
      const options = this.getAllOptions();
      const newSize = Math.min(500, options.size + 1);
      this.setOption('size', newSize);
      event.preventDefault();
    }
  }
  
  protected handleKeyUp(event: KeyboardEvent): void {
    // Handle key releases if needed
  }
  
  // Brush stroke operations
  private startBrushStroke(event: ToolEvent, targetObject: any): void {
    if (!this.brushEngine) return;
    
    this.isDrawing = true;
    this.lastPoint = { x: event.canvasX, y: event.canvasY };
    
    // Create stroke data
    this.currentStroke = {
      id: `brush-stroke-${Date.now()}`,
      targetObjectId: targetObject.id,
      points: [{ 
        x: event.canvasX, 
        y: event.canvasY, 
        pressure: event.pressure || 1.0,
        timestamp: Date.now()
      }],
      options: this.getAllOptions(),
      startTime: Date.now()
    };
    
    // Emit stroke started event
    this.emitOperation('brush.stroke.started', {
      strokeId: this.currentStroke.id,
      targetObjectId: targetObject.id,
      startPoint: { x: event.canvasX, y: event.canvasY },
      options: this.currentStroke.options
    });
    
    // Start rendering stroke preview
    this.brushEngine.startStroke(this.currentStroke);
  }
  
  private continueBrushStroke(event: ToolEvent): void {
    if (!this.brushEngine || !this.currentStroke) return;
    
    const currentPoint = { x: event.canvasX, y: event.canvasY };
    
    // Check if we should add this point (based on spacing)
    if (this.lastPoint && this.shouldAddPoint(this.lastPoint, currentPoint)) {
      // Add point to stroke
      this.currentStroke.points.push({
        x: event.canvasX,
        y: event.canvasY,
        pressure: event.pressure || 1.0,
        timestamp: Date.now()
      });
      
      // Update brush engine
      this.brushEngine.continueStroke(this.currentStroke);
      
      // Emit stroke continued event
      this.emitOperation('brush.stroke.continued', {
        strokeId: this.currentStroke.id,
        point: currentPoint,
        pressure: event.pressure || 1.0,
        pointCount: this.currentStroke.points.length
      });
      
      this.lastPoint = currentPoint;
    }
  }
  
  private completeBrushStroke(event: ToolEvent): void {
    if (!this.brushEngine || !this.currentStroke) return;
    
    // Add final point
    this.currentStroke.points.push({
      x: event.canvasX,
      y: event.canvasY,
      pressure: event.pressure || 1.0,
      timestamp: Date.now()
    });
    
    // Complete stroke in brush engine
    this.brushEngine.completeStroke(this.currentStroke);
    
    // Create command for undo/redo
    const command = new CreateBrushStrokeCommand(
      `Brush stroke (${this.currentStroke.points.length} points)`,
      this.getCommandContext(),
      {
        strokeData: this.currentStroke,
        targetObjectId: this.currentStroke.targetObjectId
      }
    );
    
    // Execute command
    this.dependencies.commandManager.executeCommand(command);
    
    // Emit stroke completed event
    this.emitOperation('brush.stroke.completed', {
      strokeId: this.currentStroke.id,
      targetObjectId: this.currentStroke.targetObjectId,
      endPoint: { x: event.canvasX, y: event.canvasY },
      pointCount: this.currentStroke.points.length,
      duration: Date.now() - this.currentStroke.startTime
    });
    
    // Reset stroke state
    this.currentStroke = null;
    this.isDrawing = false;
    this.lastPoint = null;
  }
  
  // Helper methods
  private shouldAddPoint(lastPoint: { x: number; y: number }, currentPoint: { x: number; y: number }): boolean {
    const options = this.getAllOptions();
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - lastPoint.x, 2) + 
      Math.pow(currentPoint.y - lastPoint.y, 2)
    );
    
    // Add point if distance is greater than spacing percentage of brush size
    const minDistance = (options.size * options.spacing) / 100;
    return distance >= minDistance;
  }
  
  private setupBrushEngine(): void {
    if (this.brushEngine) {
      this.brushEngine.updateOptions(this.getAllOptions());
    }
  }
  
  private cleanupBrushEngine(): void {
    if (this.isDrawing && this.currentStroke) {
      // Force complete any active stroke
      this.completeStroke();
    }
  }
  
  private async completeStroke(): Promise<void> {
    if (this.currentStroke && this.brushEngine) {
      this.brushEngine.completeStroke(this.currentStroke);
      this.currentStroke = null;
      this.isDrawing = false;
      this.lastPoint = null;
    }
  }
}

// Tool metadata for registration
export const BrushToolMetadata: ToolMetadata = {
  id: 'brush',
  name: 'Brush Tool',
  description: 'Paint with customizable brushes on image objects',
  category: 'drawing',
  groupId: 'drawing-group',
  icon: () => React.createElement('div', { className: 'icon-brush' }),
  cursor: 'crosshair',
  shortcut: 'B',
  priority: 1
}; 