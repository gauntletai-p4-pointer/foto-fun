import { BaseTool, ToolDependencies } from './BaseTool';
import type { CanvasObject, Point, Rect } from '@/types';
import type { AddObjectCommand } from '@/lib/editor/commands/object/AddObjectCommand';

export abstract class ObjectCreationTool extends BaseTool {
  protected isCreating: boolean = false;
  protected creationStart: Point | null = null;
  protected previewObject: Partial<CanvasObject> | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  protected abstract getCreationCursor(): string;
  protected abstract createObjectData(bounds: Rect): Partial<CanvasObject>;
  
  protected async commitObject(): Promise<void> {
    if (!this.previewObject) return;
    
    const command = this.dependencies.commandFactory.createAddObjectCommand(
      this.previewObject
    );
    
    await this.dependencies.commandManager.executeCommand(command);
    
    // Get the created object ID from the command
    const addObjectCommand = command as AddObjectCommand;
    const newObjectId = addObjectCommand.getObjectId();
    if (newObjectId) {
        this.dependencies.canvasManager.selectObjects([newObjectId]);
    }
  }
} 