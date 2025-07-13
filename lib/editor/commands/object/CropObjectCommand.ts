import { Command } from '../base/Command';
import type { CommandContext } from '../base/Command';
import { success, type CommandResult } from '../base/CommandResult';

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
}

export class CropObjectCommand extends Command {
  constructor(
    private objectId: string,
    private newCrop: Partial<CropData>,
    private oldCrop: Partial<CropData>,
    context: CommandContext,
  ) {
    super(`Crop Object ${objectId}`, context);
  }

  protected async doExecute(): Promise<void> {
    this.context.canvasManager.updateObject(this.objectId, this.newCrop);
  }

  public async undo(): Promise<CommandResult<void>> {
    await this.doUndo();
    return success(undefined);
  }

  protected async doUndo(): Promise<void> {
    this.context.canvasManager.updateObject(this.objectId, this.oldCrop);
  }
} 