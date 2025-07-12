import { BaseTool, ToolDependencies } from './BaseTool';
import type { CanvasObject } from '@/lib/editor/objects/types';

export abstract class AdjustmentTool extends BaseTool {
  protected targetObjects: CanvasObject[] = [];
  protected originalImageData: Map<string, ImageData> = new Map();
  protected isAdjusting: boolean = false;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  protected abstract processImageData(imageData: ImageData, value: number): ImageData;
  protected abstract showAdjustmentUI(): void;
  protected abstract hideAdjustmentUI(): void;
} 