import { ToolState } from '../base/BaseTool';
import { TransformTool, type TransformData } from '../base/TransformTool';
import type { ToolDependencies } from '../base/BaseTool';
import type { ToolMetadata } from '../base/ToolRegistry';
import { ToolGroupIcons } from '@/components/editor/icons/ToolGroupIcons';
import type { CanvasObject, ImageData } from '@/lib/editor/objects/types';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';

export class CropTool extends TransformTool {
  private originalObjectState: Partial<CanvasObject> | null = null;

  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }

  static getMetadata(): ToolMetadata {
    return {
      id: 'crop',
      name: 'Crop Tool',
      description: 'Crops images to a new size',
      category: 'transform',
      groupId: 'transform-group',
      icon: ToolGroupIcons.crop,
      cursor: 'crosshair',
      shortcut: 'C',
      priority: 2,
    };
  }
  
  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVE);
    this.cursor = 'crosshair';
  }

  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    // No specific cleanup needed now, handled by TransformTool
  }

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
        ],
        label: 'Aspect Ratio',
      },
    };
  }
  
  onMouseDown(event: ToolEvent): void {
    const selectedObjects = this.dependencies.canvasManager.getSelectedObjects();
    const imageObject = selectedObjects.find((obj: CanvasObject) => obj.type === 'image');

    if (!imageObject) {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        message: 'Please select an image layer to crop.',
        type: 'info',
      });
      return; // Stop if no image is selected
    }
    
    // If multiple objects are selected, but one is an image, we can proceed.
    // The base TransformTool logic will handle transforming the selected objects.
    this.originalObjectState = JSON.parse(JSON.stringify(imageObject));
    
    super.handleMouseDown(event);
  }

  onMouseMove(event: ToolEvent): void {
    super.handleMouseMove(event);
  }

  onMouseUp(event: ToolEvent): void {
    super.handleMouseUp(event);
    this.endTransform();
  }

  calculateTransform(event: ToolEvent): Partial<TransformData> {
    if (!this.currentTransform) return {};
    
    const { startPosition } = this.currentTransform;
    const currentPosition = { x: event.canvasX, y: event.canvasY };
    
    const newBounds = {
      x: Math.min(startPosition.x, currentPosition.x),
      y: Math.min(startPosition.y, currentPosition.y),
      width: Math.abs(currentPosition.x - startPosition.x),
      height: Math.abs(currentPosition.y - startPosition.y),
    };

    return { transformParams: { ...newBounds } };
  }

  protected getTransformOperation(): string {
    return 'crop';
  }

  protected async endTransform(): Promise<void> {
    if (!this.currentTransform || !this.originalObjectState) {
      return;
    }

    const { objectIds, transformParams } = this.currentTransform;
    const objectId = objectIds[0];
    
    const originalImageData = this.originalObjectState.data as ImageData;
    
    const newCrop = {
      x: transformParams?.x as number,
      y: transformParams?.y as number,
      width: transformParams?.width as number,
      height: transformParams?.height as number,
      cropX: (originalImageData.cropX || 0) + ((transformParams?.x as number) - this.originalObjectState.x!),
      cropY: (originalImageData.cropY || 0) + ((transformParams?.y as number) - this.originalObjectState.y!),
    };

    const oldCrop = {
      x: this.originalObjectState.x!,
      y: this.originalObjectState.y!,
      width: this.originalObjectState.width!,
      height: this.originalObjectState.height!,
      cropX: originalImageData.cropX,
      cropY: originalImageData.cropY,
    };

    const command = this.dependencies.commandFactory.createCropObjectCommand(
      objectId,
      newCrop,
      oldCrop,
    );

    await this.dependencies.commandManager.executeCommand(command);
    
    this.originalObjectState = null;
  }

  protected canTransform(objects: CanvasObject[]): boolean {
    return objects.length === 1 && objects[0].type === 'image';
  }

  /**
   * Public method for adapter integration - Apply crop to selected image
   */
  async applyCrop(cropBounds: { x: number; y: number; width: number; height: number }): Promise<void> {
    const selectedObjects = this.getSelectedObjects();
    const imageObject = selectedObjects.find((obj: CanvasObject) => obj.type === 'image');
    
    if (!imageObject) {
      throw new Error('No image object selected to crop');
    }

    const originalImageData = imageObject.data as ImageData;
    
    // Calculate the new crop data
    const newCrop = {
      x: cropBounds.x,
      y: cropBounds.y,
      width: cropBounds.width,
      height: cropBounds.height,
      cropX: (originalImageData.cropX || 0) + (cropBounds.x - imageObject.x),
      cropY: (originalImageData.cropY || 0) + (cropBounds.y - imageObject.y),
    };

    const oldCrop = {
      x: imageObject.x,
      y: imageObject.y,
      width: imageObject.width,
      height: imageObject.height,
      cropX: originalImageData.cropX || 0,
      cropY: originalImageData.cropY || 0,
    };

    // Create and execute the crop command
    const command = this.dependencies.commandFactory.createCropObjectCommand(
      imageObject.id,
      newCrop,
      oldCrop,
    );

    await this.dependencies.commandManager.executeCommand(command);
  }

  /**
   * Public method for adapter integration - Apply crop with aspect ratio
   */
  async applyCropWithAspectRatio(aspectRatio: string, position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): Promise<void> {
    const selectedObjects = this.getSelectedObjects();
    const imageObject = selectedObjects.find((obj: CanvasObject) => obj.type === 'image');
    
    if (!imageObject) {
      throw new Error('No image object selected to crop');
    }

    // Parse aspect ratio
    let ratio = 1;
    if (aspectRatio === 'square' || aspectRatio === '1:1') {
      ratio = 1;
    } else if (aspectRatio === '16:9') {
      ratio = 16 / 9;
    } else if (aspectRatio === '4:3') {
      ratio = 4 / 3;
    } else if (aspectRatio === '9:16') {
      ratio = 9 / 16;
    } else if (aspectRatio === '3:4') {
      ratio = 3 / 4;
    } else if (aspectRatio.includes(':')) {
      const [w, h] = aspectRatio.split(':').map(Number);
      ratio = w / h;
    }

    // Calculate crop dimensions
    let cropWidth: number;
    let cropHeight: number;
    
    if (imageObject.width / imageObject.height > ratio) {
      // Image is wider than target ratio
      cropHeight = imageObject.height;
      cropWidth = cropHeight * ratio;
    } else {
      // Image is taller than target ratio
      cropWidth = imageObject.width;
      cropHeight = cropWidth / ratio;
    }

    // Calculate position
    let cropX = imageObject.x;
    let cropY = imageObject.y;

    switch (position) {
      case 'center':
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

    await this.applyCrop({
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    });
  }
}