import type { PixelSelection, SelectionMode } from '@/types'
import { Command, type CommandContext } from '../base/Command'

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

  async undo(): Promise<void> {
    if (this.previousSelection) {
      // Restore previous selection
      this.context.selectionManager.restoreSelection(
        this.previousSelection.mask,
        this.previousSelection.bounds
      )
    } else {
      // Clear selection if there was none before
      this.context.selectionManager.clear()
    }
  }

  canExecute(): boolean {
    return this.options.selection.mask !== undefined
  }

  canUndo(): boolean {
    return true // Selection changes can always be undone
  }
} 