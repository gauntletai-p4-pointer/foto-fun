import { Command } from '../base'
import type { SelectionManager } from '@/lib/editor/selection'

/**
 * Command to clear the current selection
 */
export class ClearSelectionCommand extends Command {
  private selectionManager: SelectionManager
  private previousSelection: ImageData | null = null
  private previousBounds: { x: number; y: number; width: number; height: number } | null = null
  
  constructor(selectionManager: SelectionManager) {
    super('Clear selection')
    this.selectionManager = selectionManager
  }
  
  async execute(): Promise<void> {
    // Save current selection
    const current = this.selectionManager.getSelection()
    if (current) {
      // Clone the selection mask
      const ctx = document.createElement('canvas').getContext('2d')!
      this.previousSelection = ctx.createImageData(current.mask.width, current.mask.height)
      this.previousSelection.data.set(current.mask.data)
      this.previousBounds = { ...current.bounds }
    }
    
    // Clear the selection
    this.selectionManager.clear()
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection && this.previousBounds) {
      // We need to add a method to SelectionManager to restore from ImageData
      // For now, this is a placeholder
      console.log('Restoring cleared selection')
    }
  }
  
  async redo(): Promise<void> {
    this.selectionManager.clear()
  }
  
  canExecute(): boolean {
    return this.selectionManager.hasSelection()
  }
} 