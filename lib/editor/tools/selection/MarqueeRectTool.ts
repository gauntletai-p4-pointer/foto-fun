import { SelectionTool } from './SelectionTool';
import { ToolDependencies, ToolState, type ToolOptions } from '../base/BaseTool';
import { type ToolEvent } from '../../../events/canvas/ToolEvents';
import { type CanvasManager } from '../../canvas/CanvasManager';
import { type ToolMetadata } from '../base/ToolRegistry';
import { SelectionMask, type SelectionMode as MaskMode } from '../../selection/SelectionMask';
import { Square } from 'lucide-react';
import Konva from 'konva';
import type { Point, Rect, SelectionMode } from '@/types';
import '../../../events/tools/DrawingToolEvents';

export interface MarqueeRectToolOptions extends ToolOptions {
  feather: number;
  antiAlias: boolean;
  aspectRatio: 'free' | '1:1' | '4:3' | '16:9' | 'fixed';
  fixedWidth: number;
  fixedHeight: number;
}

/**
 * MarqueeRectTool - Professional rectangular selection tool
 * 
 * Implements rectangular marquee selections with support for:
 * - Aspect ratio constraints
 * - Feathering and anti-aliasing
 * - Selection modes (new, add, subtract, intersect)
 * - Fixed size selections
 * 
 * Follows senior architecture patterns with proper dependency injection,
 * event-driven communication, and command pattern for undo/redo.
 */
export class MarqueeRectTool extends SelectionTool {
  private previewRect: Rect | null = null;
  private isDragging: boolean = false;
  private overlayGroup: Konva.Group | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
    this.cursor = 'crosshair';
  }
  
  /**
   * Tool activation lifecycle
   */
  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Set up event subscriptions
    this.setupEventSubscriptions();
    
    // Create overlay group for selection preview
    this.overlayGroup = new Konva.Group();
    
    this.setState(ToolState.ACTIVE);
  }
  
  /**
   * Tool deactivation lifecycle
   */
  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Clear any active selection preview
    this.clearSelectionPreview();
    
    // Clean up state
    this.cleanup();
    
    this.setState(ToolState.INACTIVE);
  }
  
  /**
   * Mouse down - start selection
   */
  onMouseDown(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    
    this.setState(ToolState.WORKING);
    this.isSelecting = true;
    this.isDragging = true;
    this.selectionStart = { x: event.canvasX, y: event.canvasY };
    
    // Update selection mode based on modifiers
    this.updateSelectionMode(event);
    
    // Emit selection started event
    this.dependencies.eventBus.emit('selection.interaction.started', {
      toolId: this.id,
      point: this.selectionStart,
      mode: this.selectionMode,
      timestamp: Date.now()
    });
  }
  
  /**
   * Mouse move - update selection
   */
  onMouseMove(event: ToolEvent): void {
    if (!this.isSelecting || !this.selectionStart) return;
    
    const current = { x: event.canvasX, y: event.canvasY };
    
    // Update selection mode based on modifiers
    this.updateSelectionMode(event);
    
    // Update preview
    this.updateSelectionPreview(current);
  }
  
  /**
   * Mouse up - finish selection
   */
  onMouseUp(_event: ToolEvent): void {
    if (!this.isSelecting || !this.previewRect) return;
    
    this.isSelecting = false;
    this.isDragging = false;
    
    // Create selection mask
    this.selectionMask = this.createRectangularMask(this.previewRect);
    
    // Apply options
    const options = this.getAllOptions() as MarqueeRectToolOptions;
    if (options.feather > 0) {
      this.selectionMask.applyFeather(options.feather);
    }
    
    if (options.antiAlias) {
      this.selectionMask.applyAntiAlias();
    }
    
    // Apply the selection
    this.applySelection();
    
    // Clear preview
    this.previewRect = null;
    this.clearSelectionPreview();
    
    this.setState(ToolState.ACTIVE);
    
    // Emit selection ended event
    this.dependencies.eventBus.emit('selection.interaction.ended', {
      toolId: this.id,
      bounds: this.selectionMask.getBounds(),
      mode: this.selectionMode,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get default tool options
   */
  protected getDefaultOptions(): MarqueeRectToolOptions {
    return {
      feather: 0,
      antiAlias: true,
      aspectRatio: 'free',
      fixedWidth: 100,
      fixedHeight: 100
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
    visible?: (options: Record<string, string | number | boolean>) => boolean;
  }> {
    return {
      feather: {
        type: 'number',
        defaultValue: 0,
        min: 0,
        max: 100,
        step: 1,
        label: 'Feather (px)'
      },
      antiAlias: {
        type: 'boolean',
        defaultValue: true,
        label: 'Anti-alias'
      },
      aspectRatio: {
        type: 'select',
        defaultValue: 'free',
        options: [
          { value: 'free', label: 'Free' },
          { value: '1:1', label: 'Square' },
          { value: '4:3', label: '4:3' },
          { value: '16:9', label: '16:9' },
          { value: 'fixed', label: 'Fixed Size' }
        ],
        label: 'Style'
      },
      fixedWidth: {
        type: 'number',
        defaultValue: 100,
        min: 1,
        max: 5000,
        step: 1,
        label: 'Fixed Width',
        visible: (options: Record<string, string | number | boolean>) => options.aspectRatio === 'fixed'
      },
      fixedHeight: {
        type: 'number',
        defaultValue: 100,
        min: 1,
        max: 5000,
        step: 1,
        label: 'Fixed Height',
        visible: (options: Record<string, string | number | boolean>) => options.aspectRatio === 'fixed'
      }
    };
  }
  
  /**
   * Update selection preview
   */
  protected updateSelectionPreview(current: Point): void {
    if (!this.selectionStart) return;
    
    const options = this.getAllOptions() as MarqueeRectToolOptions;
    
    // Calculate rectangle
    let rect = {
      x: Math.min(this.selectionStart.x, current.x),
      y: Math.min(this.selectionStart.y, current.y),
      width: Math.abs(current.x - this.selectionStart.x),
      height: Math.abs(current.y - this.selectionStart.y)
    };
    
    // Apply aspect ratio constraints
    if (options.aspectRatio !== 'free') {
      rect = this.constrainAspectRatio(rect, current, options);
    }
    
    this.previewRect = rect;
    
    // Update visual preview
    this.drawSelectionPreview();
  }
  
  /**
   * Update selection mode based on keyboard modifiers
   */
  private updateSelectionMode(event: ToolEvent): void {
    if (event.shiftKey && event.altKey) {
      this.selectionMode = 'intersect';
    } else if (event.shiftKey) {
      this.selectionMode = 'add';
    } else if (event.altKey) {
      this.selectionMode = 'subtract';
    } else {
      this.selectionMode = 'replace';
    }
    
    // Update cursor to indicate mode
    this.updateCursor();
  }
  
  /**
   * Update cursor based on selection mode
   */
  private updateCursor(): void {
    switch (this.selectionMode) {
      case 'add':
        this.cursor = 'crosshair'; // Could be custom cursor with +
        break;
      case 'subtract':
        this.cursor = 'crosshair'; // Could be custom cursor with -
        break;
      case 'intersect':
        this.cursor = 'crosshair'; // Could be custom cursor with ∩
        break;
      default:
        this.cursor = 'crosshair';
    }
  }
  
  /**
   * Constrain rectangle to aspect ratio
   */
  private constrainAspectRatio(rect: Rect, current: Point, options: MarqueeRectToolOptions): Rect {
    if (!this.selectionStart) return rect;
    
    switch (options.aspectRatio) {
      case '1:1': {
        // Square constraint
        const size = Math.min(rect.width, rect.height);
        const newRect = { ...rect, width: size, height: size };
        
        // Adjust position based on drag direction
        if (current.x < this.selectionStart.x) {
          newRect.x = this.selectionStart.x - size;
        }
        if (current.y < this.selectionStart.y) {
          newRect.y = this.selectionStart.y - size;
        }
        
        return newRect;
      }
      
      case '4:3':
        return this.applyRatio(rect, current, 4 / 3);
      
      case '16:9':
        return this.applyRatio(rect, current, 16 / 9);
      
      case 'fixed':
        return {
          x: Math.min(this.selectionStart.x, current.x),
          y: Math.min(this.selectionStart.y, current.y),
          width: options.fixedWidth,
          height: options.fixedHeight
        };
      
      default:
        return rect;
    }
  }
  
  /**
   * Apply aspect ratio to rectangle
   */
  private applyRatio(rect: Rect, current: Point, ratio: number): Rect {
    if (!this.selectionStart) return rect;
    
    const currentRatio = rect.width / rect.height;
    const newRect = { ...rect };
    
    if (currentRatio > ratio) {
      // Too wide, adjust width
      newRect.width = rect.height * ratio;
    } else {
      // Too tall, adjust height
      newRect.height = rect.width / ratio;
    }
    
    // Adjust position based on drag direction
    if (current.x < this.selectionStart.x) {
      newRect.x = this.selectionStart.x - newRect.width;
    }
    if (current.y < this.selectionStart.y) {
      newRect.y = this.selectionStart.y - newRect.height;
    }
    
    return newRect;
  }
  
  /**
   * Draw selection preview on overlay
   */
  private drawSelectionPreview(): void {
    if (!this.previewRect || !this.overlayGroup) return;
    
    // Clear previous preview
    this.clearSelectionPreview();
    
    // Create marching ants effect
    const rect = new Konva.Rect({
      x: this.previewRect.x,
      y: this.previewRect.y,
      width: this.previewRect.width,
      height: this.previewRect.height,
      stroke: '#000000',
      strokeWidth: 1,
      dash: [4, 4],
      fill: 'rgba(255, 255, 255, 0.2)'
    });
    
    // White outline for contrast
    const whiteRect = new Konva.Rect({
      x: this.previewRect.x,
      y: this.previewRect.y,
      width: this.previewRect.width,
      height: this.previewRect.height,
      stroke: '#FFFFFF',
      strokeWidth: 1,
      dash: [4, 4],
      dashOffset: 4
    });
    
    this.overlayGroup.add(whiteRect);
    this.overlayGroup.add(rect);
    
    // Add to canvas overlay
    this.dependencies.canvasManager.addToOverlay(this.overlayGroup);
    
    // Animate marching ants
    const anim = new Konva.Animation((frame) => {
      if (!frame) return;
      const offset = (frame.time / 50) % 8;
      rect.dashOffset(-offset);
      whiteRect.dashOffset(4 - offset);
    });
    
    anim.start();
    
    // Store animation for cleanup
    this.overlayGroup.setAttr('animation', anim);
  }
  
  /**
   * Clear selection preview
   */
  private clearSelectionPreview(): void {
    if (!this.overlayGroup) return;
    
    // Stop animation
    const anim = this.overlayGroup.getAttr('animation');
    if (anim) {
      anim.stop();
    }
    
    // Clear overlay
    this.overlayGroup.destroyChildren();
    this.dependencies.canvasManager.clearOverlay();
  }
  
  /**
   * Create rectangular selection mask
   */
  private createRectangularMask(rect: Rect): SelectionMask {
    const mask = new SelectionMask(rect.width, rect.height, rect.x, rect.y);
    
    // Fill the rectangle
    for (let y = 0; y < rect.height; y++) {
      for (let x = 0; x < rect.width; x++) {
        mask.setPixel(x, y, 255);
      }
    }
    
    return mask;
  }
  
  /**
   * Set up event subscriptions
   */
  private setupEventSubscriptions(): void {
    // Listen for keyboard events to update selection mode
    const keydownUnsubscribe = this.dependencies.eventBus.on('keyboard.keydown', (data) => {
      if (this.state === ToolState.ACTIVE && !this.isDragging) {
        this.updateSelectionMode({
          shiftKey: data.shiftKey,
          altKey: data.altKey,
          ctrlKey: data.ctrlKey,
          metaKey: data.metaKey
        } as ToolEvent);
      }
    });
    this.registerCleanup(keydownUnsubscribe);
    
    const keyupUnsubscribe = this.dependencies.eventBus.on('keyboard.keyup', (data) => {
      if (this.state === ToolState.ACTIVE && !this.isDragging) {
        this.updateSelectionMode({
          shiftKey: data.shiftKey,
          altKey: data.altKey,
          ctrlKey: data.ctrlKey,
          metaKey: data.metaKey
        } as ToolEvent);
      }
    });
    this.registerCleanup(keyupUnsubscribe);
  }
  
  /**
   * Override applySelection to use proper command
   */
  protected applySelection(): void {
    if (!this.selectionMask) return;
    
    // Create pixel selection from mask
    const pixelSelection = {
      type: 'pixels' as const,
      mask: this.selectionMask.toImageData(),
      bounds: this.selectionMask.getBounds()
    };
    
    // Create selection command
    const command = this.dependencies.commandFactory.createSelectionCommand(
      pixelSelection,
      this.selectionMode
    );
    
    // Execute command
    this.dependencies.commandManager.executeCommand(command);
    
    // Map SelectionMode to MaskMode for event
    const maskMode: MaskMode = this.selectionMode === 'replace' ? 'new' : this.selectionMode as MaskMode;
    
    // Emit selection mask created event
    this.dependencies.eventBus.emit('selection.mask.created', {
      canvasId: this.dependencies.canvasManager.id,
      mask: this.selectionMask,
      mode: maskMode,
      bounds: this.selectionMask.getBounds(),
      timestamp: Date.now()
    });
  }
  
  /**
   * Clean up tool state
   */
  private cleanup(): void {
    this.isSelecting = false;
    this.isDragging = false;
    this.selectionStart = null;
    this.previewRect = null;
    this.selectionMask = null;
    
    if (this.overlayGroup) {
      this.overlayGroup.destroy();
      this.overlayGroup = null;
    }
  }
  
  /**
   * High-level API for adapters: Create selection from bounds
   * Used by AI adapters to create selections programmatically
   */
  async createSelectionFromBounds(bounds: Rect, mode: SelectionMode = 'replace'): Promise<void> {
    // Set selection mode
    this.selectionMode = mode;
    
    // Create selection mask
    this.selectionMask = this.createRectangularMask(bounds);
    
    // Apply options
    const options = this.getAllOptions() as MarqueeRectToolOptions;
    if (options.feather > 0) {
      this.selectionMask.applyFeather(options.feather);
    }
    
    if (options.antiAlias) {
      this.selectionMask.applyAntiAlias();
    }
    
    // Apply the selection
    this.applySelection();
    
    // Clear the mask after applying
    this.selectionMask = null;
  }

  /**
   * High-level API for adapters: Create selection from area description
   * Used by AI adapters to create selections based on area names
   */
  async createSelectionFromArea(
    area: 'all' | 'center' | 'top' | 'bottom' | 'left' | 'right',
    canvasBounds: { width: number; height: number },
    mode: SelectionMode = 'replace'
  ): Promise<void> {
    let bounds: Rect;
    
    switch (area) {
      case 'all':
        bounds = { x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height };
        break;
        
      case 'center': {
        const size = Math.min(canvasBounds.width, canvasBounds.height) * 0.5;
        bounds = {
          x: (canvasBounds.width - size) / 2,
          y: (canvasBounds.height - size) / 2,
          width: size,
          height: size
        };
        break;
      }
        
      case 'top':
        bounds = { x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height / 2 };
        break;
        
      case 'bottom':
        bounds = { x: 0, y: canvasBounds.height / 2, width: canvasBounds.width, height: canvasBounds.height / 2 };
        break;
        
      case 'left':
        bounds = { x: 0, y: 0, width: canvasBounds.width / 2, height: canvasBounds.height };
        break;
        
      case 'right':
        bounds = { x: canvasBounds.width / 2, y: 0, width: canvasBounds.width / 2, height: canvasBounds.height };
        break;
    }
    
    await this.createSelectionFromBounds(bounds, mode);
  }

  /**
   * Tool metadata for registration
   */
  static getMetadata(): ToolMetadata {
    return {
      id: 'marquee-rect',
      name: 'Rectangular Marquee',
      description: 'Make rectangular selections',
      category: 'selection',
      groupId: 'marquee-group',
      icon: Square,
      cursor: 'crosshair',
      shortcut: 'M',
      priority: 1
    };
  }
}