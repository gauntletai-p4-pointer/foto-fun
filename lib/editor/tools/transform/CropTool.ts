import React from 'react';
import { TransformTool, type TransformData } from '../base/TransformTool';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';
import type { CanvasObject } from '@/lib/editor/objects/types';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolDependencies, ToolOptions } from '../base/BaseTool';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolState } from '../base/BaseTool';
import Konva from 'konva';

export interface CropToolOptions extends ToolOptions {
  aspectRatio: 'free' | '1:1' | '4:3' | '16:9' | '9:16' | 'custom';
  customRatio: string;
  deletePixels: boolean;
  showGrid: boolean;
  snapToEdges: boolean;
}

interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropState {
  originalBounds: CropBounds;
  currentBounds: CropBounds;
  isDragging: boolean;
  dragHandle: string | null;
  targetObjectId: string | null;
}

/**
 * CropTool - Non-destructive image cropping tool
 * Handles image object cropping with aspect ratio constraints and visual feedback
 */
export class CropTool extends TransformTool<CropToolOptions> {
  id = 'crop';
  name = 'Crop Tool';
  cursor = 'crosshair';
  
  private cropState: CropState | null = null;
  private cropOverlayGroup: Konva.Group | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
    /**
   * Required by BaseTool - called when tool is activated
   */
  async onActivate(_canvas: CanvasManager): Promise<void> {
    console.log('CropTool: Activating crop tool...');
    
    // Set cursor for crop tool
    this.cursor = 'crosshair';
    
    // Check if we have image objects selected
    const selectedObjects = this.dependencies.canvasManager.getSelectedObjects();
    const imageObjects = selectedObjects.filter((obj: CanvasObject) => obj.type === 'image');
    
    if (imageObjects.length > 0) {
      // Initialize crop state with first image
      this.initializeCropState(imageObjects[0]);
    } else {
      // Show message that user should select an image
      console.log('CropTool: No image selected, waiting for user to select an image');
      
      // Listen for selection changes
      this.registerCleanup(
        this.dependencies.eventBus.on('selection.changed', (data) => {
          if (data.selection?.type === 'objects' && data.selection.objectIds) {
            const selectedIds = data.selection.objectIds as string[];
            const objects = selectedIds
              .map(id => this.dependencies.canvasManager.getObject(id))
              .filter((obj): obj is CanvasObject => obj !== null);
            
            const images = objects.filter(obj => obj.type === 'image');
            
            if (images.length > 0 && !this.cropState) {
              // Initialize crop state with first selected image
              this.initializeCropState(images[0]);
            }
          }
        })
      );
    }
  }
  
  /**
   * Required by BaseTool - called when tool is deactivated
   */
  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    console.log('CropTool: Deactivating crop tool...');
    
    // Hide crop overlay
    this.destroyCropOverlay();
    
    // Clean up crop state
    this.cropState = null;
    
    // Complete any active transform
    if (this.currentTransform) {
      await this.cleanupTool();
    }
    
    this.cursor = 'crosshair';
  }

  /**
   * Initialize crop state for a target image
   */
  private initializeCropState(targetImage: CanvasObject): void {
    console.log('CropTool: Initializing crop state for image:', targetImage.id);
    
    this.cropState = {
      originalBounds: {
        x: targetImage.x,
        y: targetImage.y,
        width: targetImage.width,
        height: targetImage.height
      },
      currentBounds: {
        x: targetImage.x,
        y: targetImage.y,
        width: targetImage.width,
        height: targetImage.height
      },
      isDragging: false,
      dragHandle: null,
      targetObjectId: targetImage.id
    };
    
    // Show crop overlay
    this.showCropOverlay();
    
    // Set cursor to indicate crop mode is active
    this.cursor = 'crosshair';
  }
  
  // Tool icon component using Lucide React
  icon = () => React.createElement('div', {
    className: 'w-4 h-4 flex items-center justify-center'
  }, React.createElement('svg', {
    width: '16',
    height: '16',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }, [
    React.createElement('path', {
      key: 'path1',
      d: 'M6 2v6h6m-6 8v6h6m8-14v6h6m-6 8v6h6'
    }),
    React.createElement('path', {
      key: 'path2', 
      d: 'M6 18h12'
    }),
    React.createElement('path', {
      key: 'path3',
      d: 'M18 6v12'
    })
  ]));
  
  /**
   * Handle mouse down events
   */
  onMouseDown(event: ToolEvent): void {
    if (this.getState() !== ToolState.ACTIVE || !this.cropState) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    
    // Check if clicking on crop handle
    const handle = this.getCropHandleAtPoint(point);
    if (handle) {
      this.cropState.isDragging = true;
      this.cropState.dragHandle = handle;
      this.setState(ToolState.WORKING);
      
      // Emit crop start operation
      this.emitOperation('crop.start', {
        objectId: this.cropState.targetObjectId,
        originalBounds: this.cropState.originalBounds,
        currentBounds: this.cropState.currentBounds,
        handle: handle
      });
    }
  }
  
  /**
   * Handle mouse move events
   */
  onMouseMove(event: ToolEvent): void {
    if (!this.cropState) return;
    
    const point = { x: event.canvasX, y: event.canvasY };
    
    if (this.cropState.isDragging && this.cropState.dragHandle) {
      // Update crop bounds based on handle
      const newBounds = this.calculateNewCropBounds(
        this.cropState.dragHandle,
        point,
        this.cropState.currentBounds
      );
      
      // Apply aspect ratio constraint
      const options = this.getAllOptions();
      const constrainedBounds = this.constrainAspectRatio(newBounds, options.aspectRatio);
      
      this.cropState.currentBounds = constrainedBounds;
      this.updateCropOverlay();
      
      // Emit crop update operation
      this.emitOperation('crop.update', {
        objectId: this.cropState.targetObjectId,
        currentBounds: this.cropState.currentBounds,
        handle: this.cropState.dragHandle
      });
    } else {
      // Update cursor based on hover
      const handle = this.getCropHandleAtPoint(point);
      this.cursor = handle ? this.getCursorForHandle(handle) : 'crosshair';
    }
  }
  
  /**
   * Handle mouse up events
   */
  onMouseUp(_event: ToolEvent): void {
    if (!this.cropState || !this.cropState.isDragging) return;
    
    this.cropState.isDragging = false;
    this.cropState.dragHandle = null;
    this.setState(ToolState.ACTIVE);
    
    // Emit crop complete operation
    this.emitOperation('crop.complete', {
      objectId: this.cropState.targetObjectId,
      finalBounds: this.cropState.currentBounds
    });
  }
  
  /**
   * Handle keyboard events
   */
  onKeyDown(event: KeyboardEvent): void {
    if (!this.cropState) return;
    
    if (event.key === 'Enter') {
      this.applyCrop();
    } else if (event.key === 'Escape') {
      this.cancelCrop();
    }
  }
  
  /**
   * Get default options for crop tool
   */
  protected getDefaultOptions(): CropToolOptions {
    return {
      aspectRatio: 'free',
      customRatio: '1:1',
      deletePixels: false,
      showGrid: true,
      snapToEdges: false
    };
  }
  
  /**
   * Get option definitions for crop tool
   */
  getOptionDefinitions() {
    return {
      aspectRatio: {
        type: 'select' as const,
        default: 'free',
        options: [
          { value: 'free', label: 'Free' },
          { value: '1:1', label: 'Square (1:1)' },
          { value: '4:3', label: 'Standard (4:3)' },
          { value: '16:9', label: 'Widescreen (16:9)' },
          { value: '9:16', label: 'Portrait (9:16)' },
          { value: 'custom', label: 'Custom' }
        ],
        label: 'Aspect Ratio'
      },
      customRatio: {
        type: 'string' as const,
        default: '1:1',
        label: 'Custom Ratio',
        visible: (options: CropToolOptions) => options.aspectRatio === 'custom'
      },
      deletePixels: {
        type: 'boolean' as const,
        default: false,
        label: 'Delete Cropped Pixels'
      },
      showGrid: {
        type: 'boolean' as const,
        default: true,
        label: 'Show Grid'
      },
      snapToEdges: {
        type: 'boolean' as const,
        default: false,
        label: 'Snap to Edges'
      }
    };
  }
  
  /**
   * TransformTool implementation - get transform operation name
   */
  protected getTransformOperation(): string {
    return 'crop';
  }
  
  /**
   * TransformTool implementation - calculate transform data
   */
  protected calculateTransform(event: ToolEvent): Partial<TransformData> {
    if (!this.cropState) return {};
    
    return {
      objectIds: [this.cropState.targetObjectId!],
      startPosition: { x: event.canvasX, y: event.canvasY },
      currentPosition: { x: event.canvasX, y: event.canvasY },
      modifiers: {
        duplicate: false,
        constrain: this.getAllOptions().aspectRatio !== 'free',
        center: false
      },
      transformType: 'crop',
      transformParams: {
        bounds: this.cropState.currentBounds,
        aspectRatio: this.getAllOptions().aspectRatio
      }
    };
  }
  
  /**
   * TransformTool implementation - check if transform can be applied
   */
  protected canTransform(objects: CanvasObject[]): boolean {
    return objects.some(obj => obj.type === 'image');
  }
  
  /**
   * Apply the crop to the selected image
   */
  private applyCrop(): void {
    if (!this.cropState) return;

    const cropOptions = {
      x: this.cropState.currentBounds.x,
      y: this.cropState.currentBounds.y,
      width: this.cropState.currentBounds.width,
      height: this.cropState.currentBounds.height
    };

    const command = this.dependencies.commandFactory.createCropCommand(cropOptions);
    this.dependencies.commandManager.executeCommand(command);

    // Deactivate tool after applying
    this.dependencies.eventBus.emit('tool.deactivated', { toolId: this.id });
    this.cancelCrop();
  }
  
  /**
   * Cancel the crop operation
   */
  private cancelCrop(): void {
    if (!this.cropState) return;
    
    // No need to revert visual state if we are just destroying the overlay
    this.destroyCropOverlay();
    this.cropState = null;
    
    // Deactivate self
    this.dependencies.eventBus.emit('tool.deactivated', { toolId: this.id });
  }

  private showCropOverlay(): void {
    if (!this.cropState) return;

    // Ensure old overlay is gone
    this.destroyCropOverlay();

    this.cropOverlayGroup = new Konva.Group();

    // Create a semi-transparent overlay for the entire canvas
    const overlayRect = new Konva.Rect({
      x: -10000, // A large area to cover the viewport
      y: -10000,
      width: 20000,
      height: 20000,
      fill: 'rgba(0, 0, 0, 0.5)',
      listening: false,
    });

    this.cropOverlayGroup.add(overlayRect);

    // Create the "clear" area for the crop bounds
    const clearRect = new Konva.Rect({
      ...this.cropState.currentBounds,
      fill: 'transparent', // This will be effectively "cut out"
      listening: false,
    });
    
    // Use composite operation to cut out the crop area
    this.cropOverlayGroup.add(clearRect);
    this.cropOverlayGroup.cache();
    this.cropOverlayGroup.globalCompositeOperation('destination-out');


    this.dependencies.canvasManager.addToOverlay(this.cropOverlayGroup);
  }

  private destroyCropOverlay(): void {
    if (this.cropOverlayGroup) {
      this.cropOverlayGroup.destroy();
      this.cropOverlayGroup = null;
      this.dependencies.canvasManager.clearOverlay();
    }
  }

  private updateCropOverlay(): void {
    if (!this.cropOverlayGroup || !this.cropState) return;
    
    // For this implementation, we destroy and recreate.
    // A more optimized version could update the node properties.
    this.showCropOverlay();
  }
  
  /**
   * Get crop handle at point
   */
  private getCropHandleAtPoint(point: { x: number; y: number }): string | null {
    if (!this.cropState) return null;
    
    const bounds = this.cropState.currentBounds;
    const handleSize = 8;
    
    // Check corner handles
    const handles = [
      { id: 'nw', x: bounds.x, y: bounds.y },
      { id: 'ne', x: bounds.x + bounds.width, y: bounds.y },
      { id: 'sw', x: bounds.x, y: bounds.y + bounds.height },
      { id: 'se', x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      { id: 'n', x: bounds.x + bounds.width / 2, y: bounds.y },
      { id: 's', x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      { id: 'w', x: bounds.x, y: bounds.y + bounds.height / 2 },
      { id: 'e', x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 }
    ];
    
    for (const handle of handles) {
      if (Math.abs(point.x - handle.x) <= handleSize && 
          Math.abs(point.y - handle.y) <= handleSize) {
        return handle.id;
      }
    }
    
    return null;
  }
  
  /**
   * Calculate new crop bounds based on handle drag
   */
  private calculateNewCropBounds(
    handle: string,
    point: { x: number; y: number },
    currentBounds: CropBounds
  ): CropBounds {
    const newBounds = { ...currentBounds };
    
    switch (handle) {
      case 'nw':
        newBounds.width += newBounds.x - point.x;
        newBounds.height += newBounds.y - point.y;
        newBounds.x = point.x;
        newBounds.y = point.y;
        break;
      case 'ne':
        newBounds.width = point.x - newBounds.x;
        newBounds.height += newBounds.y - point.y;
        newBounds.y = point.y;
        break;
      case 'sw':
        newBounds.width += newBounds.x - point.x;
        newBounds.height = point.y - newBounds.y;
        newBounds.x = point.x;
        break;
      case 'se':
        newBounds.width = point.x - newBounds.x;
        newBounds.height = point.y - newBounds.y;
        break;
      case 'n':
        newBounds.height += newBounds.y - point.y;
        newBounds.y = point.y;
        break;
      case 's':
        newBounds.height = point.y - newBounds.y;
        break;
      case 'w':
        newBounds.width += newBounds.x - point.x;
        newBounds.x = point.x;
        break;
      case 'e':
        newBounds.width = point.x - newBounds.x;
        break;
    }
    
    // Ensure minimum size
    newBounds.width = Math.max(newBounds.width, 10);
    newBounds.height = Math.max(newBounds.height, 10);
    
    return newBounds;
  }
  
  /**
   * Constrain bounds to aspect ratio
   */
  private constrainAspectRatio(bounds: CropBounds, aspectRatio: string): CropBounds {
    if (aspectRatio === 'free') return bounds;
    
    let ratio = 1;
    switch (aspectRatio) {
      case '1:1':
        ratio = 1;
        break;
      case '4:3':
        ratio = 4 / 3;
        break;
      case '16:9':
        ratio = 16 / 9;
        break;
      case '9:16':
        ratio = 9 / 16;
        break;
      case 'custom':
        const customRatio = this.getAllOptions().customRatio;
        const parts = customRatio.split(':');
        if (parts.length === 2) {
          ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
        }
        break;
    }
    
    const constrainedBounds = { ...bounds };
    
    // Adjust height to match aspect ratio
    if (bounds.width / bounds.height > ratio) {
      constrainedBounds.height = bounds.width / ratio;
    } else {
      constrainedBounds.width = bounds.height * ratio;
    }
    
    return constrainedBounds;
  }
  
  /**
   * Get cursor for handle
   */
  private getCursorForHandle(handle: string): string {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nw-resize';
      case 'ne':
      case 'sw':
        return 'ne-resize';
      case 'n':
      case 's':
        return 'n-resize';
      case 'w':
      case 'e':
        return 'w-resize';
      default:
        return 'crosshair';
    }
  }
  
  /**
   * Cycle through crop presets
   */
  private cycleCropPresets(): void {
    const presets = ['free', '1:1', '4:3', '16:9', '9:16'];
    const currentOptions = this.getAllOptions();
    const currentIndex = presets.indexOf(currentOptions.aspectRatio);
    const nextIndex = (currentIndex + 1) % presets.length;
    
    // Update aspect ratio option
    this.setOption('aspectRatio', presets[nextIndex]);
    
    // Re-constrain current bounds
    if (this.cropState) {
      this.cropState.currentBounds = this.constrainAspectRatio(
        this.cropState.currentBounds,
        presets[nextIndex]
      );
      this.updateCropOverlay();
    }
  }
}

// Tool metadata for registration
export const cropToolMetadata: ToolMetadata = {
  id: 'crop',
  name: 'Crop Tool',
  description: 'Crop images with aspect ratio constraints',
  category: 'transform',
  groupId: 'transform-group',
  icon: () => React.createElement('div', {
    className: 'w-4 h-4 flex items-center justify-center'
  }, React.createElement('svg', {
    width: '16',
    height: '16',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  }, [
    React.createElement('path', {
      key: 'path1',
      d: 'M6 2v6h6m-6 8v6h6m8-14v6h6m-6 8v6h6'
    }),
    React.createElement('path', {
      key: 'path2', 
      d: 'M6 18h12'
    }),
    React.createElement('path', {
      key: 'path3',
      d: 'M18 6v12'
    })
  ])),
  cursor: 'crosshair',
  shortcut: 'C',
  priority: 2
}; 