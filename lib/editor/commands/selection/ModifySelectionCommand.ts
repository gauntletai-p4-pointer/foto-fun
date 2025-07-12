import { Command, type CommandContext } from '../base/Command'
import { success, failure, ExecutionError, type CommandResult } from '../base/CommandResult'
import type { SelectionModification, PixelSelection } from '@/lib/editor/selection'

/**
 * Command to modify an existing selection
 */
export class ModifySelectionCommand extends Command {
  private modification: SelectionModification
  private amount: number
  private previousSelection: PixelSelection | null = null
  
  constructor(
    modification: SelectionModification,
    amount: number = 0,
    context: CommandContext
  ) {
    super(`${modification} selection${amount > 0 ? ` by ${amount}px` : ''}`, context)
    this.modification = modification
    this.amount = amount
  }
  
  protected async doExecute(): Promise<void> {
    // Save current selection
    const current = this.context.selectionManager.getSelection()
    if (!current) {
      throw new Error('No selection to modify')
    }
    
    // Clone the current selection mask
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = current.mask.width
    canvas.height = current.mask.height
    const clonedMask = ctx.createImageData(current.mask.width, current.mask.height)
    clonedMask.data.set(current.mask.data)
    
    this.previousSelection = {
      type: 'pixel',
      mask: clonedMask,
      bounds: { ...current.bounds }
    }
    
    // Apply modification
    switch (this.modification) {
      case 'expand':
        this.context.selectionManager.expand(this.amount)
        break
      case 'contract':
        this.context.selectionManager.contract(this.amount)
        break
      case 'feather':
        this.context.selectionManager.feather(this.amount)
        break
      case 'invert':
        this.context.selectionManager.invert()
        break
    }
  }
  
  async undo(): Promise<CommandResult<void>> {
    try {
      if (this.previousSelection) {
        this.context.selectionManager.restoreSelection(this.previousSelection.mask, this.previousSelection.bounds)
      }
      
      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: []
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to undo selection modification: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      )
    }
  }
  
  async redo(): Promise<CommandResult<void>> {
    try {
      // We need to re-execute from the saved state
      if (this.previousSelection) {
        // First restore the previous state
        this.context.selectionManager.restoreSelection(this.previousSelection.mask, this.previousSelection.bounds)
        // Then apply the modification again
        switch (this.modification) {
          case 'expand':
            this.context.selectionManager.expand(this.amount)
            break
          case 'contract':
            this.context.selectionManager.contract(this.amount)
            break
          case 'feather':
            this.context.selectionManager.feather(this.amount)
            break
          case 'invert':
            this.context.selectionManager.invert()
            break
        }
      }
      
      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: []
      })
    } catch (error) {
      return failure(
        new ExecutionError(
          `Failed to redo selection modification: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { commandId: this.id }
        )
      )
    }
  }
  
  canExecute(): boolean {
    return this.context.selectionManager.hasSelection()
  }
} 