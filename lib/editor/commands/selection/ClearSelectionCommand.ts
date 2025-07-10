import { Command } from '../base'
import type { SelectionManager, PixelSelection } from '@/lib/editor/selection'

/**
 * Command to clear the current selection
 */
export class ClearSelectionCommand extends Command {
  private selectionManager: SelectionManager
  private previousSelection: PixelSelection | null = null
  
  constructor(selectionManager: SelectionManager) {
    super('Clear selection')
    this.selectionManager = selectionManager
  }
  
  async execute(): Promise<void> {
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
        mask: clonedMask,
        bounds: { ...current.bounds },
        shape: current.shape  // Preserve shape information
      }
    }
    
    // Clear the selection
    this.selectionManager.clear()
    
    // Stop the selection renderer
    const { useCanvasStore } = await import('@/store/canvasStore')
    const { selectionRenderer } = useCanvasStore.getState()
    if (selectionRenderer) {
      selectionRenderer.stopRendering()
    }
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection) {
      this.selectionManager.restoreSelection(this.previousSelection.mask, this.previousSelection.bounds, this.previousSelection.shape)
      
      // Start the selection renderer
      const { useCanvasStore } = await import('@/store/canvasStore')
      const { selectionRenderer } = useCanvasStore.getState()
      if (selectionRenderer) {
        selectionRenderer.startRendering()
      }
    }
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  canExecute(): boolean {
    return this.selectionManager.hasSelection()
  }
} 