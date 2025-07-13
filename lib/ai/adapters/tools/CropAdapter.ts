import { z } from 'zod';
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';
import type { AdapterMetadata } from '../types/AdapterMetadata';
import type { CropTool } from '@/lib/editor/tools/transform/CropTool';
import type { EventToolStore } from '@/lib/store/tools/EventToolStore';

// Input schema for the AI
const CropInputSchema = z.object({
  aspectRatio: z.string().optional()
    .describe('Aspect ratio like "16:9", "4:3", "1:1" or "square"'),
  width: z.number().min(1).optional()
    .describe('Crop width in pixels'),
  height: z.number().min(1).optional()
    .describe('Crop height in pixels'),
  x: z.number().optional()
    .describe('Crop area X position'),
  y: z.number().optional()
    .describe('Crop area Y position'),
  position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional()
    .describe('Position of the crop area within the image'),
  preset: z.enum(['square', 'portrait', 'landscape', 'instagram', 'twitter', 'facebook']).optional()
    .describe('Predefined crop presets')
}).refine(
  (data) => {
    // Ensure at least one crop option is provided
    const hasAspectRatio = data.aspectRatio !== undefined;
    const hasDimensions = data.width !== undefined || data.height !== undefined;
    const hasAbsoluteBounds = data.x !== undefined && data.y !== undefined && 
                              data.width !== undefined && data.height !== undefined;
    const hasPreset = data.preset !== undefined;
    return hasAspectRatio || hasDimensions || hasAbsoluteBounds || hasPreset;
  },
  {
    message: 'Must provide either aspectRatio, dimensions (width/height), absolute bounds (x,y,width,height), or a preset'
  }
);

type CropInput = z.infer<typeof CropInputSchema>;

interface CropOutput {
  success: boolean;
  croppedObject: string;
  originalDimensions: { width: number; height: number };
  newDimensions: { width: number; height: number };
  operation: 'aspect-ratio' | 'dimensions' | 'absolute' | 'preset';
}

/**
 * AI Adapter for Crop Tool
 * Follows the correct pattern: Adapter → Tool → Command
 */
export class CropAdapter extends UnifiedToolAdapter<CropInput, CropOutput> {
  readonly toolId = 'crop';
  readonly aiName = 'cropImage';
  readonly description = 'Crop images to specific dimensions or aspect ratios. Supports presets like "square", "16:9", custom dimensions, and precise positioning.';
  readonly inputSchema = CropInputSchema;

  constructor(dependencies: AdapterDependencies) {
    super(dependencies);
  }

  /**
   * Get adapter metadata
   */
  protected getAdapterMetadata(): AdapterMetadata {
    return {
      category: 'canvas-tool',
      worksOn: 'existing',
      requiresSelection: true,
      isReadOnly: false,
      supportsBatch: false, // Crop works on single images only
      estimatedDuration: 800
    };
  }

  /**
   * Core execution method
   */
  protected async executeCore(params: CropInput, context: CanvasContext): Promise<CropOutput> {
    // Validate that we have an image object selected
    const imageObjects = context.targetObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length === 0) {
      throw new Error('No image objects selected. Please select an image to crop.');
    }
    
    if (imageObjects.length > 1) {
      throw new Error('Crop operation can only be applied to one image at a time.');
    }

    const imageObject = imageObjects[0];
    const originalDimensions = {
      width: imageObject.width,
      height: imageObject.height
    };

    // Get the tool store
    const toolStore = this.getToolStore();
    if (!toolStore) {
      throw new Error('Tool store not available');
    }

    // Activate the crop tool
    await this.activateCropTool(toolStore);
    
    // Get the active tool instance
    const cropTool = this.getActiveCropTool(toolStore);
    
    try {
      // Execute the appropriate crop operation
      const result = await this.executeCropOperation(cropTool, params, imageObject);
      
      // Get the new dimensions after crop
      const croppedObject = this.dependencies.canvasManager.getObject(imageObject.id);
      const newDimensions = croppedObject ? {
        width: croppedObject.width,
        height: croppedObject.height
      } : originalDimensions;
      
      // Emit success event
      this.emitEvent('crop.completed', {
        objectId: imageObject.id,
        operation: result.operation,
        originalDimensions,
        newDimensions,
        params
      });
      
      return {
        ...result,
        originalDimensions,
        newDimensions
      };
      
    } catch (error) {
      // Emit failure event
      this.emitEvent('crop.failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        objectId: imageObject.id,
        params
      });
      throw error;
    }
  }

  /**
   * Activate the crop tool
   */
  private async activateCropTool(toolStore: EventToolStore): Promise<void> {
    await toolStore.activateTool(this.toolId);
    
    // Wait a frame to ensure activation is complete
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  /**
   * Get the active crop tool instance
   */
  private getActiveCropTool(toolStore: EventToolStore): CropTool {
    const activeTool = toolStore.getActiveTool();
    
    if (!activeTool) {
      throw new Error('Failed to activate crop tool');
    }
    
    return activeTool as CropTool;
  }

  /**
   * Execute the crop operation based on parameters
   */
  private async executeCropOperation(
    cropTool: CropTool,
    params: CropInput,
    imageObject: { id: string; width: number; height: number; x: number; y: number }
  ): Promise<Pick<CropOutput, 'success' | 'croppedObject' | 'operation'>> {
    // Handle preset crop
    if (params.preset) {
      const aspectRatio = this.getPresetAspectRatio(params.preset);
      await cropTool.applyCropWithAspectRatio(aspectRatio, params.position || 'center');
      
      return {
        success: true,
        croppedObject: imageObject.id,
        operation: 'preset'
      };
    }
    
    // Handle aspect ratio crop
    if (params.aspectRatio) {
      await cropTool.applyCropWithAspectRatio(params.aspectRatio, params.position || 'center');
      
      return {
        success: true,
        croppedObject: imageObject.id,
        operation: 'aspect-ratio'
      };
    }
    
    // Handle absolute bounds crop
    if (params.x !== undefined && params.y !== undefined && 
        params.width !== undefined && params.height !== undefined) {
      await cropTool.applyCrop({
        x: params.x,
        y: params.y,
        width: params.width,
        height: params.height
      });
      
      return {
        success: true,
        croppedObject: imageObject.id,
        operation: 'absolute'
      };
    }
    
    // Handle dimension-based crop (centered by default)
    if (params.width !== undefined && params.height !== undefined) {
      const cropBounds = this.calculateCenteredCrop(
        imageObject,
        params.width,
        params.height,
        params.position
      );
      
      await cropTool.applyCrop(cropBounds);
      
      return {
        success: true,
        croppedObject: imageObject.id,
        operation: 'dimensions'
      };
    }
    
    // This should never happen due to input validation
    throw new Error('Invalid crop parameters');
  }

  /**
   * Get aspect ratio for preset
   */
  private getPresetAspectRatio(preset: string): string {
    const presetMap: Record<string, string> = {
      'square': '1:1',
      'portrait': '9:16',
      'landscape': '16:9',
      'instagram': '1:1',
      'twitter': '16:9',
      'facebook': '1.91:1'
    };
    
    return presetMap[preset] || '1:1';
  }

  /**
   * Calculate centered crop bounds
   */
  private calculateCenteredCrop(
    imageObject: { x: number; y: number; width: number; height: number },
    cropWidth: number,
    cropHeight: number,
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  ): { x: number; y: number; width: number; height: number } {
    // Ensure crop dimensions don't exceed image dimensions
    cropWidth = Math.min(cropWidth, imageObject.width);
    cropHeight = Math.min(cropHeight, imageObject.height);
    
    let cropX = imageObject.x;
    let cropY = imageObject.y;
    
    switch (position) {
      case 'center':
      default:
        cropX = imageObject.x + (imageObject.width - cropWidth) / 2;
        cropY = imageObject.y + (imageObject.height - cropHeight) / 2;
        break;
      case 'top-right':
        cropX = imageObject.x + imageObject.width - cropWidth;
        cropY = imageObject.y;
        break;
      case 'bottom-left':
        cropX = imageObject.x;
        cropY = imageObject.y + imageObject.height - cropHeight;
        break;
      case 'bottom-right':
        cropX = imageObject.x + imageObject.width - cropWidth;
        cropY = imageObject.y + imageObject.height - cropHeight;
        break;
      // 'top-left' is default (no change needed)
    }
    
    return {
      x: Math.max(imageObject.x, cropX),
      y: Math.max(imageObject.y, cropY),
      width: cropWidth,
      height: cropHeight
    };
  }

  /**
   * Override to provide operation-specific description
   */
  protected getOperationDescription(params: CropInput): string {
    if (params.preset) {
      return `Crop image to ${params.preset} preset`;
    } else if (params.aspectRatio) {
      return `Crop image to ${params.aspectRatio} aspect ratio`;
    } else if (params.width && params.height) {
      return `Crop image to ${params.width}x${params.height}`;
    }
    return 'Crop image';
  }
}