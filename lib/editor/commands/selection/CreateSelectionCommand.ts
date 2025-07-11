import { Command } from '../base'
import type { SelectionManager, SelectionMode, PixelSelection } from '@/lib/editor/selection'

/**
 * Command to create a selection
 */
export class CreateSelectionCommand extends Command {
  private selectionManager: SelectionManager
  private previousSelection: PixelSelection | null = null
  private newSelection: PixelSelection
  private mode: SelectionMode
  private finalSelection: PixelSelection | null = null
  
  constructor(
    selectionManager: SelectionManager, 
    selection: PixelSelection,
    mode: SelectionMode = 'replace'
  ) {
    super(`Create ${mode} selection`)
    this.selectionManager = selectionManager
    this.newSelection = {
      type: 'pixel',
      mask: selection.mask,
      bounds: { ...selection.bounds }
    }
    this.mode = mode
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
    
    // Apply the selection based on mode
    if (this.mode === 'replace' || !this.previousSelection) {
      // For replace mode or no existing selection, just set the new selection
      this.selectionManager.restoreSelection(this.newSelection.mask, this.newSelection.bounds)
      this.finalSelection = this.newSelection
    } else {
      // For other modes, we need to combine selections
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = this.newSelection.mask.width
      canvas.height = this.newSelection.mask.height
      
      const resultMask = ctx.createImageData(canvas.width, canvas.height)
      const currentMask = this.previousSelection.mask
      const newMask = this.newSelection.mask
      
      // Apply boolean operations pixel by pixel
      for (let i = 3; i < resultMask.data.length; i += 4) {
        const current = currentMask.data[i] || 0
        const new_ = newMask.data[i] || 0
        
        switch (this.mode) {
          case 'add':
            resultMask.data[i] = Math.max(current, new_)
            break
          case 'subtract':
            resultMask.data[i] = Math.max(0, current - new_)
            break
          case 'intersect':
            resultMask.data[i] = Math.min(current, new_)
            break
        }
      }
      
      // Calculate combined bounds
      let bounds = this.previousSelection.bounds
      switch (this.mode) {
        case 'add':
          bounds = {
            x: Math.min(this.previousSelection.bounds.x, this.newSelection.bounds.x),
            y: Math.min(this.previousSelection.bounds.y, this.newSelection.bounds.y),
            width: Math.max(
              this.previousSelection.bounds.x + this.previousSelection.bounds.width,
              this.newSelection.bounds.x + this.newSelection.bounds.width
            ) - Math.min(this.previousSelection.bounds.x, this.newSelection.bounds.x),
            height: Math.max(
              this.previousSelection.bounds.y + this.previousSelection.bounds.height,
              this.newSelection.bounds.y + this.newSelection.bounds.height
            ) - Math.min(this.previousSelection.bounds.y, this.newSelection.bounds.y)
          }
          break
        case 'subtract':
          // Keep original bounds for subtract
          bounds = this.previousSelection.bounds
          break
        case 'intersect':
          const x = Math.max(this.previousSelection.bounds.x, this.newSelection.bounds.x)
          const y = Math.max(this.previousSelection.bounds.y, this.newSelection.bounds.y)
          bounds = {
            x,
            y,
            width: Math.min(
              this.previousSelection.bounds.x + this.previousSelection.bounds.width,
              this.newSelection.bounds.x + this.newSelection.bounds.width
            ) - x,
            height: Math.min(
              this.previousSelection.bounds.y + this.previousSelection.bounds.height,
              this.newSelection.bounds.y + this.newSelection.bounds.height
            ) - y
          }
          break
      }
      
      this.finalSelection = { 
        type: 'pixel',
        mask: resultMask, 
        bounds 
      }
      this.selectionManager.restoreSelection(resultMask, bounds)
    }
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection) {
      // Restore previous selection
      this.selectionManager.restoreSelection(this.previousSelection.mask, this.previousSelection.bounds)
    } else {
      // Clear selection
      this.selectionManager.clear()
    }
  }
  
  async redo(): Promise<void> {
    if (this.finalSelection) {
      // Restore the final calculated selection
      this.selectionManager.restoreSelection(this.finalSelection.mask, this.finalSelection.bounds)
    } else {
      // Re-execute
      await this.execute()
    }
  }
  
  canExecute(): boolean {
    return true
  }
} 