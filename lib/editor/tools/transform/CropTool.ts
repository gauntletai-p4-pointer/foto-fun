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
    const selectedObjects = this.dependencies.canvasManager.getSelectedObjects();
    const imageObject = selectedObjects.find((obj) => obj.type === 'image');

    if (!imageObject) {
       this.dependencies.eventBus.emit('tool.error', {
        toolId: this.id,
        instanceId: this.instanceId,
        error: new Error('No image selected for cropping.'),
        operation: 'activate',
        timestamp: Date.now()
      });
      this.dependencies.eventBus.emit('tool.activation.requested', { toolId: 'move' });
      return;
    }
    
    if (selectedObjects.length > 1) {
      this.dependencies.canvasManager.selectObject(imageObject.id);
    }
    
    this.originalObjectState = JSON.parse(JSON.stringify(imageObject));
  }

  async onDeactivate(_canvas: CanvasManager): Promise<void> {
    this.cleanupTool();
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
    this.handleMouseDown(event);
  }

  onMouseMove(event: ToolEvent): void {
    this.handleMouseMove(event);
  }

  onMouseUp(event: ToolEvent): void {
    this.handleMouseUp(event);
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
      this.cleanupTool();
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
    
    this.cleanupTool();
  }

  protected canTransform(objects: CanvasObject[]): boolean {
    return objects.length === 1 && objects[0].type === 'image';
  }
}