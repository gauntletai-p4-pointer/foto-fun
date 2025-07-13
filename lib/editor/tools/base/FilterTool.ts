import { BaseTool, ToolDependencies, ToolState, ToolOptions } from './BaseTool';
import type { CanvasObject } from '@/lib/editor/objects/types';
import { isImageObject } from '@/lib/editor/objects/types';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { WebGLFilterEngine } from '@/lib/editor/filters/WebGLFilterEngine';

export interface FilterOptions extends ToolOptions {
  radius?: number;
  intensity?: number;
  type?: string;
  quality?: 'low' | 'medium' | 'high';
}

export interface FilterShader {
  vertex: string;
  fragment: string;
  uniforms: Record<string, number | { x: number; y: number } | number[]>;
}

/**
 * Base class for all filter tools that apply effects to existing image objects
 * Provides WebGL shader support, real-time preview, and proper state management
 */
export abstract class FilterTool<T extends FilterOptions = FilterOptions> extends BaseTool<T> {
  protected filterEngine: WebGLFilterEngine | null = null;
  protected targetObjects: CanvasObject[] = [];
  protected originalImageData: Map<string, ImageData> = new Map();
  protected isProcessing: boolean = false;
  protected previewActive: boolean = false;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Get selected image objects
    this.targetObjects = this.getImageObjects();
    
    if (this.targetObjects.length === 0) {
      this.showNoImageMessage();
      await this.switchToDefaultTool();
      return;
    }
    
    // Initialize WebGL filter engine
    await this.initializeFilterEngine();
    
    // Store original image data
    this.storeOriginalData();
    
    // Initialize filter-specific setup
    await this.initializeFilter();
    
    // Show filter options UI
    await this.showFilterOptions();
    
    this.setState(ToolState.ACTIVE);
  }

  async onDeactivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Clear any active preview
    if (this.previewActive) {
      await this.clearPreview();
    }
    
    // Hide filter options UI
    await this.hideFilterOptions();
    
    // Cleanup filter resources
    await this.cleanupFilter();
    
    // Clear stored data
    this.originalImageData.clear();
    this.targetObjects = [];
    this.isProcessing = false;
    this.previewActive = false;
    this.filterEngine = null;
    
    this.setState(ToolState.INACTIVE);
  }

  /**
   * Get image objects from current selection
   */
  protected getImageObjects(): CanvasObject[] {
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
   * Initialize WebGL filter engine
   */
  protected async initializeFilterEngine(): Promise<void> {
    try {
      // Get filter engine from dependencies - this will be updated when WebGLFilterEngine is properly injected
      // For now, create a minimal interface
             this.filterEngine = {
         initializeWebGL: async () => { /* placeholder */ },
         applyFilter: async (source: HTMLImageElement | HTMLCanvasElement) => {
           // Fallback to canvas copy
           const canvas = document.createElement('canvas');
           canvas.width = source.width;
           canvas.height = source.height;
           const ctx = canvas.getContext('2d');
           if (ctx) {
             ctx.drawImage(source, 0, 0);
           }
           return canvas;
         }
       } as any;
       
       if (this.filterEngine) {
         await this.filterEngine.initializeWebGL();
       }
    } catch (error) {
      console.warn('[FilterTool] WebGL not available, using fallback rendering');
      this.filterEngine = null;
    }
  }

  /**
   * Apply filter with real-time preview
   */
  protected async applyFilterPreview(options: Record<string, any>): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.previewActive = true;
    this.setState(ToolState.WORKING);
    
    try {
      for (const obj of this.targetObjects) {
        if (!isImageObject(obj)) continue;
        
        const original = this.originalImageData.get(obj.id);
        if (!original) continue;
        
        // Create canvas from original image data
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = original.width;
        sourceCanvas.height = original.height;
        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) continue;
        
        sourceCtx.putImageData(original, 0, 0);
        
        // Apply filter
        const filtered = await this.processWithFilter(sourceCanvas, options);
        
        // Update object with filtered result
        const imageData = obj.data as import('@/lib/editor/objects/types').ImageData;
        await this.dependencies.canvasManager.updateObject(obj.id, {
          data: {
            ...imageData,
            element: filtered
          }
        });
      }
    } finally {
      this.isProcessing = false;
      this.setState(ToolState.ACTIVE);
    }
  }

  /**
   * Commit filter by creating and executing a command
   */
  public async applyFilter(options: Record<string, any>): Promise<void> {
    if (this.isProcessing) return;
    
    this.setState(ToolState.WORKING);
    
    const commands = [];
    
    for (const obj of this.targetObjects) {
      if (!isImageObject(obj)) continue;
      
      const original = this.originalImageData.get(obj.id);
      if (!original) continue;
      
      // Create canvas from original image data
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = original.width;
      sourceCanvas.height = original.height;
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) continue;
      
      sourceCtx.putImageData(original, 0, 0);
      
      // Apply filter
      const filtered = await this.processWithFilter(sourceCanvas, options);
      
      // Get filtered image data
      const filteredCtx = filtered.getContext('2d');
      if (!filteredCtx) continue;
      
      const filteredImageData = filteredCtx.getImageData(0, 0, filtered.width, filtered.height);
      
      // Create command for this filter
      const command = this.dependencies.commandFactory.createUpdateImageDataCommand({
        objectId: obj.id,
        imageData: filteredImageData,
        preserveOriginal: true
      });
      
      commands.push(command);
    }
    
    if (commands.length > 0) {
      // Create composite command for batch operation
      const batchCommand = this.dependencies.commandFactory.createCompositeCommand(
        `Apply ${this.id} filter`,
        commands
      );
      
      await this.dependencies.commandManager.executeCommand(batchCommand);
    }
    
    // Clear preview state
    this.previewActive = false;
    this.setState(ToolState.ACTIVE);
  }

  /**
   * Cancel filter and restore original state
   */
  public async cancelFilter(): Promise<void> {
    if (!this.previewActive) return;
    
    await this.clearPreview();
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
        
        // Restore original image data
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
   * Process image with filter - can use WebGL or fallback
   */
  protected async processWithFilter(
    source: HTMLCanvasElement,
    options: Record<string, any>
  ): Promise<HTMLCanvasElement> {
    if (this.filterEngine) {
      // Use WebGL filtering
      try {
        return await this.filterEngine.applyFilter(source, {
          id: `${this.id}-${Date.now()}`,
          name: `${this.id} filter`,
          type: this.id as any,
          params: options
        });
      } catch (error) {
        console.warn('[FilterTool] WebGL filter failed, using fallback');
      }
    }
    
    // Fallback to custom filter implementation
    return this.processWithCustomFilter(source, options);
  }

  /**
   * Process image with custom filter implementation
   */
  protected async processWithCustomFilter(
    source: HTMLCanvasElement,
    options: Record<string, any>
  ): Promise<HTMLCanvasElement> {
    // Default implementation - just copy the source
    const result = document.createElement('canvas');
    result.width = source.width;
    result.height = source.height;
    const ctx = result.getContext('2d');
    if (ctx) {
      ctx.drawImage(source, 0, 0);
    }
    return result;
  }

  /**
   * Switch to default tool (move tool)
   */
  protected async switchToDefaultTool(): Promise<void> {
    console.warn('Switching to default tool - implementation pending EventToolStore integration');
  }

  /**
   * Show message when no image objects are selected
   */
  protected showNoImageMessage(): void {
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      type: 'warning',
      message: 'Please select an image object to apply filters'
    });
  }

  // Abstract methods that subclasses must implement
  protected abstract initializeFilter(): Promise<void>;
  protected abstract createFilterShader(): FilterShader;
  protected abstract showFilterOptions(): Promise<void>;
  protected abstract hideFilterOptions(): Promise<void>;
  protected abstract cleanupFilter(): Promise<void>;
} 