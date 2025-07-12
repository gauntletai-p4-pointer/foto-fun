import { Command, type CommandContext } from '../base/Command';
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult';
import type { BrushStrokeData } from '../../tools/engines/BrushEngine';
import { isImageObject, type ImageData } from '../../objects/types';

export interface CreateBrushStrokeData {
  strokeData: BrushStrokeData;
  targetObjectId: string;
}

/**
 * CreateBrushStrokeCommand - Command for creating brush strokes
 * Handles undo/redo for brush painting operations
 * 
 * Note: This is a simplified implementation that works with the current architecture.
 * Full pixel-level brush painting will be implemented once the canvas system supports it.
 */
export class CreateBrushStrokeCommand extends Command {
  private strokeData: BrushStrokeData;
  private targetObjectId: string;
  private originalObjectData: ImageData | null = null;
  
  constructor(
    description: string,
    context: CommandContext,
    data: CreateBrushStrokeData
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: false
    });
    this.strokeData = data.strokeData;
    this.targetObjectId = data.targetObjectId;
  }
  
  protected async doExecute(): Promise<void> {
    // Get target object
    const targetObject = this.context.canvasManager.getObject(this.targetObjectId);
    if (!targetObject || !isImageObject(targetObject)) {
      throw new Error(`Target object ${this.targetObjectId} not found or not an image`);
    }
    
    // Store original data for undo
    this.originalObjectData = { ...targetObject.data };
    
    // For now, just mark the object as modified to indicate brush stroke was applied
    // TODO: Implement actual pixel manipulation when canvas system supports it
    await this.context.canvasManager.updateObject(this.targetObjectId, {
      metadata: {
        ...targetObject.metadata,
        lastBrushStroke: this.strokeData.id,
        lastModified: Date.now()
      }
    });
    
    // Emit command executed event
    this.context.eventBus.emit('command.completed', {
      commandId: this.id,
      commandType: 'CreateBrushStrokeCommand'
    });
  }
  
  async undo(): Promise<CommandResult<void>> {
    try {
      if (!this.originalObjectData) {
        return failure(
          new ExecutionError('No original object data available for undo', { commandId: this.id })
        );
      }
      
      // Get target object
      const targetObject = this.context.canvasManager.getObject(this.targetObjectId);
      if (!targetObject || !isImageObject(targetObject)) {
        return failure(
          new ExecutionError(`Target object ${this.targetObjectId} not found or not an image`, { commandId: this.id })
        );
      }
      
      // Restore original data
      await this.context.canvasManager.updateObject(this.targetObjectId, {
        data: this.originalObjectData
      });
      
      // Emit command undone event
      this.context.eventBus.emit('command.undone', {
        commandId: this.id,
        commandType: 'CreateBrushStrokeCommand'
      });
      
      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: [this.targetObjectId]
      });
      
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo brush stroke: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      );
    }
  }
  
  canExecute(): boolean {
    const targetObject = this.context.canvasManager.getObject(this.targetObjectId);
    return targetObject !== null && isImageObject(targetObject);
  }
  
  canUndo(): boolean {
    return this.originalObjectData !== null;
  }
  
  protected getAffectedObjects(): string[] {
    return [this.targetObjectId];
  }
} 