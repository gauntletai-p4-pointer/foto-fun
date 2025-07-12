import type { PixelSelection } from '@/types'
import { Command, type CommandContext } from '../base/Command'

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

  async undo(): Promise<void> {
    if (this.previousSelection) {
      // Restore the previous selection
      this.context.selectionManager.restoreSelection(
        this.previousSelection.mask,
        this.previousSelection.bounds
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