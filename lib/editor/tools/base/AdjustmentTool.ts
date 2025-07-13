import { BaseTool, ToolDependencies, ToolState, ToolOptions } from './BaseTool';
import type { CanvasObject } from '@/lib/editor/objects/types';
import { isImageObject } from '@/lib/editor/objects/types';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';

export interface AdjustmentOptions extends ToolOptions {
  value: number;
  preserveColors?: boolean;
  previewMode?: boolean;
}

/**
 * Base class for all adjustment tools that modify pixel data within existing image objects
 * Provides real-time preview, command integration, and proper state management
 */
export abstract class AdjustmentTool<T extends AdjustmentOptions = AdjustmentOptions> extends BaseTool<T> {
  protected targetObjects: CanvasObject[] = [];
  protected originalImageData: Map<string, ImageData> = new Map();
  protected isAdjusting: boolean = false;
  protected previewActive: boolean = false;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Get selected image objects
    this.targetObjects = this.getImageObjects();
    
    if (this.targetObjects.length === 0) {
      this.showNoImageMessage();
      await this.switchToDefaultTool();
      return;
    }
    
    // Store original image data for real-time preview
    this.storeOriginalData();
    
    // Show adjustment UI
    await this.showAdjustmentUI();
    
    this.setState(ToolState.ACTIVE);
  }

  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Clear any active preview
    if (this.previewActive) {
      await this.clearPreview();
    }
    
    // Hide adjustment UI
    await this.hideAdjustmentUI();
    
    // Clear stored data
    this.originalImageData.clear();
    this.targetObjects = [];
    this.isAdjusting = false;
    this.previewActive = false;
    
    this.setState(ToolState.INACTIVE);
  }

  /**
   * Get image objects from current selection
   */
  protected getImageObjects(): CanvasObject[] {
    // Get selected objects from canvas manager
    const selectedObjects = this.dependencies.canvasManager.getSelectedObjects() as CanvasObject[];
    return selectedObjects.filter((obj: CanvasObject) => obj.type === 'image');
  }

  /**
   * Store original image data for preview and undo
   */
  protected storeOriginalData(): void {
    this.targetObjects.forEach(obj => {
      if (isImageObject(obj)) {
        const imageData = obj.data;
        // Create ImageData from the image element
        const canvas = document.createElement('canvas');
        canvas.width = imageData.naturalWidth;
        canvas.height = imageData.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx && imageData.element) {
          ctx.drawImage(imageData.element, 0, 0);
          const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
          this.originalImageData.set(obj.id, original);
        }
      }
    });
  }

  /**
   * Apply adjustment with real-time preview
   */
  protected async applyAdjustment(value: number): Promise<void> {
    if (!this.isAdjusting) {
      this.isAdjusting = true;
      this.setState(ToolState.WORKING);
    }
    
    this.previewActive = true;
    
    for (const obj of this.targetObjects) {
      if (!isImageObject(obj)) continue;
      
      const original = this.originalImageData.get(obj.id);
      if (!original) continue;
      
      // Process image data with adjustment
      const adjusted = await this.processImageData(original, value);
      
      // Create canvas from adjusted image data
      const canvas = document.createElement('canvas');
      canvas.width = adjusted.width;
      canvas.height = adjusted.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(adjusted, 0, 0);
        
        // Update object with new canvas element - cast to ImageData type
        const imageData = obj.data as import('@/lib/editor/objects/types').ImageData;
        await this.dependencies.canvasManager.updateObject(obj.id, {
          data: {
            ...imageData,
            element: canvas
          }
        });
      }
    }
  }

  /**
   * Commit adjustment by creating and executing a command
   */
  public async commitAdjustment(value: number): Promise<void> {
    if (!this.isAdjusting && !this.previewActive) return;
    
    this.setState(ToolState.WORKING);
    
    const commands = [];
    
    for (const obj of this.targetObjects) {
      if (!isImageObject(obj)) continue;
      
      const original = this.originalImageData.get(obj.id);
      if (!original) continue;
      
      const adjusted = await this.processImageData(original, value);
      
      // Create command for this adjustment
      const command = this.dependencies.commandFactory.createUpdateImageDataCommand({
        objectId: obj.id,
        imageData: adjusted,
        preserveOriginal: true
      });
      
      commands.push(command);
    }
    
    if (commands.length > 0) {
      // Create composite command for batch operation
      const batchCommand = this.dependencies.commandFactory.createCompositeCommand(
        `Apply ${this.id} adjustment`,
        commands
      );
      
      await this.dependencies.commandManager.executeCommand(batchCommand);
    }
    
    // Clear preview state
    this.isAdjusting = false;
    this.previewActive = false;
    this.setState(ToolState.ACTIVE);
  }

  /**
   * Cancel adjustment and restore original state
   */
  public async cancelAdjustment(): Promise<void> {
    if (!this.previewActive) return;
    
    await this.clearPreview();
    this.isAdjusting = false;
    this.previewActive = false;
    this.setState(ToolState.ACTIVE);
  }

  /**
   * Clear preview and restore original image data
   */
  protected async clearPreview(): Promise<void> {
    for (const obj of this.targetObjects) {
      if (!isImageObject(obj)) continue;
      
      const original = this.originalImageData.get(obj.id);
      if (!original) continue;
      
      // Create canvas from original image data
      const canvas = document.createElement('canvas');
      canvas.width = original.width;
      canvas.height = original.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(original, 0, 0);
        
        // Restore original image data - cast to ImageData type
        const imageData = obj.data as import('@/lib/editor/objects/types').ImageData;
        await this.dependencies.canvasManager.updateObject(obj.id, {
          data: {
            ...imageData,
            element: canvas
          }
        });
      }
    }
  }

  /**
   * Switch to default tool (move tool)
   */
  protected async switchToDefaultTool(): Promise<void> {
    // For now, just log - this will be implemented when EventToolStore is available
    console.warn('Switching to default tool - implementation pending EventToolStore integration');
  }

  /**
   * Show message when no image objects are selected
   */
  protected showNoImageMessage(): void {
    // Emit event for UI to show message
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      type: 'warning',
      message: 'Please select an image object to apply adjustments'
    });
  }

  // Abstract methods that subclasses must implement
  protected abstract processImageData(imageData: ImageData, value: number): Promise<ImageData>;
  protected abstract showAdjustmentUI(): Promise<void>;
  protected abstract hideAdjustmentUI(): Promise<void>;

  // Helper methods for color space conversions
  protected rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    if (max === min) {
      return { h: 0, s: 0, l };
    }
    
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    let h;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        h = 0;
    }
    
    return { h, s, l };
  }

  protected hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
} 