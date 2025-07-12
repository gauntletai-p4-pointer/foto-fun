import type { PixelSelection, SelectionMode } from '@/types'
import { Command, type CommandContext } from '../base/Command'
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult'

export interface CreateSelectionOptions {
  selection: PixelSelection
  mode?: SelectionMode
}

export class CreateSelectionCommand extends Command {
  private readonly options: CreateSelectionOptions
  private previousSelection: PixelSelection | null = null

  constructor(
    description: string,
    context: CommandContext,
    options: CreateSelectionOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: true
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Get current selection for undo
    this.previousSelection = this.context.selectionManager.getSelection()

    // Apply the new selection
    const mode = this.options.mode || 'replace'
    this.context.selectionManager.applySelection(this.options.selection.mask, mode)
  }

  async undo(): Promise<CommandResult<void>> {
    try {
             // Clear the selection
       this.context.selectionManager.clear()

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: []
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo create selection: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      )
    }
  }

  canExecute(): boolean {
    return this.options.selection.mask !== undefined
  }

  canUndo(): boolean {
    return true // Selection changes can always be undone
  }
} 