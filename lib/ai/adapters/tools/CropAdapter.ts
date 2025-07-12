import { z } from 'zod';
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';

/**
 * AI Adapter for CropTool - Image cropping with natural language
 * Enables intelligent cropping with aspect ratios, presets, and positioning
 */
export class CropAdapter extends UnifiedToolAdapter<CropInput, CropOutput> {
  readonly toolId = 'crop';
  readonly aiName = 'cropImage';
  readonly description = 'Crop images with natural language. Supports aspect ratios like "square", "16:9", positioning like "center", and presets like "Instagram", "Twitter".';
  
  readonly inputSchema = z.object({
    aspectRatio: z.enum(['free', '1:1', '4:3', '16:9', '9:16', 'custom']).optional(),
    customRatio: z.string().optional().describe('Custom aspect ratio like "3:2"'),
    preset: z.enum(['square', 'instagram', 'twitter', 'facebook', 'youtube', 'portrait', 'landscape']).optional(),
    position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right']).optional(),
    width: z.number().min(1).optional().describe('Specific crop width in pixels'),
    height: z.number().min(1).optional().describe('Specific crop height in pixels'),
    deletePixels: z.boolean().optional().describe('Whether to permanently delete cropped pixels'),
    bounds: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().min(1),
      height: z.number().min(1)
    }).optional().describe('Exact crop bounds')
  });
  
  constructor(dependencies: AdapterDependencies) {
    super(dependencies);
  }
  
  protected async executeCore(params: CropInput, context: CanvasContext): Promise<CropOutput> {
    // Get target image objects
    const imageObjects = context.targetObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length === 0) {
      throw new Error('No image objects selected for cropping. Please select an image first.');
    }
    
    // Use first image as primary target
    const targetImage = imageObjects[0];
    
    // Activate crop tool if available
    if (this.dependencies.toolStore) {
      await this.dependencies.toolStore.activateTool('crop');
    }
    
    // Calculate crop bounds based on parameters
    const cropBounds = this.calculateCropBounds(targetImage, params);
    
    // Validate crop bounds
    if (cropBounds.width < 1 || cropBounds.height < 1) {
      throw new Error('Invalid crop dimensions. Width and height must be at least 1 pixel.');
    }
    
    if (cropBounds.x < 0 || cropBounds.y < 0 || 
        cropBounds.x + cropBounds.width > targetImage.width ||
        cropBounds.y + cropBounds.height > targetImage.height) {
      throw new Error('Crop bounds exceed image boundaries. Please adjust crop parameters.');
    }
    
    // Apply crop using command factory
    const command = this.dependencies.commandFactory.createUpdateObjectCommand(
      targetImage.id,
      {
        x: targetImage.x + cropBounds.x,
        y: targetImage.y + cropBounds.y,
        width: cropBounds.width,
        height: cropBounds.height,
        metadata: {
          cropApplied: true,
          originalBounds: {
            x: targetImage.x,
            y: targetImage.y,
            width: targetImage.width,
            height: targetImage.height
          },
          cropBounds: cropBounds,
          deletePixels: params.deletePixels || false,
          aspectRatio: params.aspectRatio || 'free',
          timestamp: Date.now()
        }
      }
    );
    
    await this.dependencies.commandManager.executeCommand(command);
    
    return {
      success: true,
      croppedObjects: [targetImage.id],
      objectCount: 1,
      originalDimensions: {
        width: targetImage.width,
        height: targetImage.height
      },
      newDimensions: {
        width: cropBounds.width,
        height: cropBounds.height
      },
      cropBounds: cropBounds,
      aspectRatio: params.aspectRatio || 'free',
      deletePixels: params.deletePixels || false
    };
  }
  
  /**
   * Calculate crop bounds based on input parameters
   */
  private calculateCropBounds(image: { width: number; height: number }, params: CropInput): CropBounds {
    // If exact bounds provided, use them
    if (params.bounds) {
      return params.bounds;
    }
    
    // If specific width/height provided, center by default
    if (params.width && params.height) {
      const x = Math.max(0, (image.width - params.width) / 2);
      const y = Math.max(0, (image.height - params.height) / 2);
      return { x, y, width: params.width, height: params.height };
    }
    
    // Handle presets
    if (params.preset) {
      return this.calculatePresetBounds(image, params.preset, params.position);
    }
    
    // Handle aspect ratio
    if (params.aspectRatio) {
      return this.calculateAspectRatioBounds(image, params.aspectRatio, params.customRatio, params.position);
    }
    
    // Default to full image
    return { x: 0, y: 0, width: image.width, height: image.height };
  }
  
  /**
   * Calculate bounds for preset crops
   */
  private calculatePresetBounds(image: { width: number; height: number }, preset: string, position?: string): CropBounds {
    let aspectRatio: number;
    
    switch (preset) {
      case 'square':
      case 'instagram':
        aspectRatio = 1;
        break;
      case 'twitter':
        aspectRatio = 16 / 9;
        break;
      case 'facebook':
        aspectRatio = 1.91;
        break;
      case 'youtube':
        aspectRatio = 16 / 9;
        break;
      case 'portrait':
        aspectRatio = 9 / 16;
        break;
      case 'landscape':
        aspectRatio = 16 / 9;
        break;
      default:
        aspectRatio = 1;
    }
    
    return this.calculateBoundsForRatio(image, aspectRatio, position);
  }
  
  /**
   * Calculate bounds for aspect ratio
   */
  private calculateAspectRatioBounds(image: { width: number; height: number }, aspectRatio: string, customRatio?: string, position?: string): CropBounds {
    let ratio: number;
    
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
        if (customRatio) {
          const parts = customRatio.split(':');
          if (parts.length === 2) {
            ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
          } else {
            ratio = 1; // Default to square
          }
        } else {
          ratio = 1;
        }
        break;
      case 'free':
      default:
        return { x: 0, y: 0, width: image.width, height: image.height };
    }
    
    return this.calculateBoundsForRatio(image, ratio, position);
  }
  
  /**
   * Calculate bounds for a specific ratio and position
   */
  private calculateBoundsForRatio(image: { width: number; height: number }, ratio: number, position?: string): CropBounds {
    const imageRatio = image.width / image.height;
    
    let width: number;
    let height: number;
    
    if (imageRatio > ratio) {
      // Image is wider than target ratio, constrain by height
      height = image.height;
      width = height * ratio;
    } else {
      // Image is taller than target ratio, constrain by width
      width = image.width;
      height = width / ratio;
    }
    
    // Calculate position
    let x: number;
    let y: number;
    
    switch (position) {
      case 'top-left':
        x = 0;
        y = 0;
        break;
      case 'top-right':
        x = image.width - width;
        y = 0;
        break;
      case 'bottom-left':
        x = 0;
        y = image.height - height;
        break;
      case 'bottom-right':
        x = image.width - width;
        y = image.height - height;
        break;
      case 'top':
        x = (image.width - width) / 2;
        y = 0;
        break;
      case 'bottom':
        x = (image.width - width) / 2;
        y = image.height - height;
        break;
      case 'left':
        x = 0;
        y = (image.height - height) / 2;
        break;
      case 'right':
        x = image.width - width;
        y = (image.height - height) / 2;
        break;
      case 'center':
      default:
        x = (image.width - width) / 2;
        y = (image.height - height) / 2;
        break;
    }
    
    return {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
      width: Math.round(width),
      height: Math.round(height)
    };
  }
}

// Type definitions
interface CropInput {
  aspectRatio?: 'free' | '1:1' | '4:3' | '16:9' | '9:16' | 'custom';
  customRatio?: string;
  preset?: 'square' | 'instagram' | 'twitter' | 'facebook' | 'youtube' | 'portrait' | 'landscape';
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
  width?: number;
  height?: number;
  deletePixels?: boolean;
  bounds?: CropBounds;
}

interface CropOutput {
  success: boolean;
  croppedObjects: string[];
  objectCount: number;
  originalDimensions: {
    width: number;
    height: number;
  };
  newDimensions: {
    width: number;
    height: number;
  };
  cropBounds: CropBounds;
  aspectRatio: string;
  deletePixels: boolean;
}

interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
} 