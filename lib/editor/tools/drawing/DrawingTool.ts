import { BaseTool, ToolDependencies } from '../base/BaseTool';
import type { PixelBuffer } from '../../pixel/PixelBuffer';
import type { CanvasObject } from '@/lib/editor/objects/types';
import { BrushOptions, BrushStrokePoint } from '../engines/BrushEngine';

// Default brush options for drawing tools
export const DEFAULT_BRUSH_OPTIONS: BrushOptions = {
  size: 20,
  opacity: 100,
  color: '#000000',
  blendMode: 'normal',
  pressure: true,
  flow: 100,
  hardness: 100,
  spacing: 25,
  roundness: 100,
  angle: 0,
};

// Import Brush type from PixelBuffer
import type { Brush } from '../../pixel/PixelBuffer';

export abstract class DrawingTool extends BaseTool {
  protected pixelBuffer: PixelBuffer | null = null;
  protected isDrawing: boolean = false;
  protected lastPoint: BrushStrokePoint | null = null;
  protected strokePath: BrushStrokePoint[] = [];
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  // Abstract methods agents will implement
  protected abstract createBrush(options: Record<string, string | number | boolean>): Brush;
  
  protected commitDrawing(): void {
    if (!this.pixelBuffer || this.strokePath.length === 0) return;
    
    const imageObject = this.getImageObjects()[0];
    if (!imageObject) return;

    // NOTE TO EXECUTOR: A 'createDrawCommand' method will need to be added to the CommandFactory.
    const command = this.dependencies.commandFactory.createDrawCommand(
      imageObject.id,
      this.strokePath,
      DEFAULT_BRUSH_OPTIONS
    );
    
    this.dependencies.commandManager.executeCommand(command);
    this.strokePath = [];
  }
  
  // Helper methods for pixel manipulation
  protected getImageObjects(): CanvasObject[] {
    // This should get all objects and filter, or use a more specific method from ObjectManager
    return this.dependencies.objectManager.getAllObjects().filter(obj => obj.type === 'image');
  }
} 