import { Command } from '../base'
import type { SelectionManager } from '@/lib/editor/selection'

export type SelectionModification = 'expand' | 'contract' | 'feather' | 'invert'

/**
 * Command to modify an existing selection
 */
export class ModifySelectionCommand extends Command {
  private selectionManager: SelectionManager
  private modification: SelectionModification
  private amount: number
  private previousSelection: ImageData | null = null
  
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
  
  async execute(): Promise<void> {
    // Save current selection
    const current = this.selectionManager.getSelection()
    if (!current) {
      throw new Error('No selection to modify')
    }
    
    // Clone the current selection mask
    const ctx = document.createElement('canvas').getContext('2d')!
    this.previousSelection = ctx.createImageData(current.mask.width, current.mask.height)
    this.previousSelection.data.set(current.mask.data)
    
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
      // We need to add a method to SelectionManager to restore from ImageData
      // For now, this is a placeholder
      console.log('Restoring previous selection state')
    }
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  canExecute(): boolean {
    return this.selectionManager.hasSelection()
  }
} 