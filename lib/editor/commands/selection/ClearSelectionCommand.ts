import { Command } from '../base'
import type { SelectionManager, PixelSelection } from '@/lib/editor/selection'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'

/**
 * Command to clear the current selection
 */
export class ClearSelectionCommand extends Command {
  private selectionManager: SelectionManager
  private previousSelection: PixelSelection | null = null
  
  constructor(
    eventBus: TypedEventBus,
    selectionManager: SelectionManager
  ) {
    super('Clear selection', eventBus)
    this.selectionManager = selectionManager
  }
  
  protected async doExecute(): Promise<void> {
    // Save current selection if any
    const current = this.selectionManager.getSelection()
    if (current) {
      // Clone the current selection
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
    }
    
    // Clear the selection
    this.selectionManager.clear()
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection) {
      this.selectionManager.restoreSelection(this.previousSelection.mask, this.previousSelection.bounds)
    }
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  canExecute(): boolean {
    return this.selectionManager.hasSelection()
  }
} 