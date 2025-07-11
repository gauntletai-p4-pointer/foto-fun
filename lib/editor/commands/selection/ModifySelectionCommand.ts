import { Command } from '../base'
import type { SelectionManager, SelectionModification, PixelSelection } from '@/lib/editor/selection'

/**
 * Command to modify an existing selection
 */
export class ModifySelectionCommand extends Command {
  private selectionManager: SelectionManager
  private modification: SelectionModification
  private amount: number
  private previousSelection: PixelSelection | null = null
  
  constructor(
    selectionManager: SelectionManager,
    modification: SelectionModification,
    amount: number = 0
  ) {
    super(`${modification} selection${amount > 0 ? ` by ${amount}px` : ''}`)
    this.selectionManager = selectionManager
    this.modification = modification
    this.amount = amount
  }
  
  protected async doExecute(): Promise<void> {
    // Save current selection
    const current = this.selectionManager.getSelection()
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
        this.selectionManager.expand(this.amount)
        break
      case 'contract':
        this.selectionManager.contract(this.amount)
        break
      case 'feather':
        this.selectionManager.feather(this.amount)
        break
      case 'invert':
        this.selectionManager.invert()
        break
    }
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection) {
      this.selectionManager.restoreSelection(this.previousSelection.mask, this.previousSelection.bounds)
    }
  }
  
  async redo(): Promise<void> {
    // We need to re-execute from the saved state
    if (this.previousSelection) {
      // First restore the previous state
      this.selectionManager.restoreSelection(this.previousSelection.mask, this.previousSelection.bounds)
      // Then apply the modification again
      switch (this.modification) {
        case 'expand':
          this.selectionManager.expand(this.amount)
          break
        case 'contract':
          this.selectionManager.contract(this.amount)
          break
        case 'feather':
          this.selectionManager.feather(this.amount)
          break
        case 'invert':
          this.selectionManager.invert()
          break
      }
    }
  }
  
  canExecute(): boolean {
    return this.selectionManager.hasSelection()
  }
} 