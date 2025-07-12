import { BaseTool, ToolDependencies } from '../base/BaseTool';
import type { PixelBuffer } from '../../pixel/PixelBuffer';
import type { Point } from '@/types';
import type { CanvasObject } from '@/lib/editor/objects/types';

// Brush definition for drawing tools
interface Brush {
  type: 'round' | 'square' | 'custom';
  size: number;
  hardness: number;
  opacity: number;
}

export abstract class DrawingTool extends BaseTool {
  protected pixelBuffer: PixelBuffer | null = null;
  protected isDrawing: boolean = false;
  protected lastPoint: Point | null = null;
  protected strokePath: Point[] = [];
  
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
      this.pixelBuffer.getImageData(),
      this.strokePath
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