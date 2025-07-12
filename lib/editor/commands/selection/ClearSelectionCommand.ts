import type { PixelSelection } from '@/types'
import { Command, type CommandContext } from '../base/Command'
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult'

export class ClearSelectionCommand extends Command {
  private previousSelection: PixelSelection | null = null

  constructor(
    description: string,
    context: CommandContext
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: true
    })
  }

  async doExecute(): Promise<void> {
    // Store current selection for undo
    this.previousSelection = this.context.selectionManager.getSelection()

    // Clear the selection
    this.context.selectionManager.clear()
  }

  async undo(): Promise<CommandResult<void>> {
    try {
             if (this.previousSelection) {
         // Restore the previous selection
         this.context.selectionManager.restoreSelection(
           this.previousSelection.mask,
           this.previousSelection.bounds
         )
       }

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: []
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo clear selection: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      )
    }
  }

  canExecute(): boolean {
    return this.context.selectionManager.hasSelection()
  }

  canUndo(): boolean {
    return this.previousSelection !== null
  }
} 