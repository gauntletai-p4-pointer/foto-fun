import { Command } from '../base'
import type { SelectionManager, SelectionMode, PixelSelection } from '@/lib/editor/selection'

/**
 * Command to create a rectangular selection
 * This command is responsible for creating the selection, not just recording it
 */
export class CreateRectangleSelectionCommand extends Command {
  private selectionManager: SelectionManager
  private x: number
  private y: number
  private width: number
  private height: number
  private mode: SelectionMode
  private previousSelection: PixelSelection | null = null
  private newSelection: PixelSelection | null = null
  
  constructor(
    selectionManager: SelectionManager,
    x: number,
    y: number,
    width: number,
    height: number,
    mode: SelectionMode = 'replace'
  ) {
    super(`Create ${mode} rectangle selection`)
    this.selectionManager = selectionManager
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.mode = mode
  }
  
  async execute(): Promise<void> {
    // Save current selection BEFORE creating the new one
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
        bounds: { ...current.bounds }
      }
    }
    
    // Create the new selection
    this.selectionManager.createRectangle(this.x, this.y, this.width, this.height, this.mode)
    
    // Save the new selection for redo
    const newSel = this.selectionManager.getSelection()
    
    if (newSel) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = newSel.mask.width
      canvas.height = newSel.mask.height
      const clonedMask = ctx.createImageData(newSel.mask.width, newSel.mask.height)
      clonedMask.data.set(newSel.mask.data)
      
      this.newSelection = {
        mask: clonedMask,
        bounds: { ...newSel.bounds }
      }
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
    if (this.newSelection) {
      // Restore the new selection
      this.selectionManager.restoreSelection(this.newSelection.mask, this.newSelection.bounds)
    } else {
      // Re-execute
      this.selectionManager.createRectangle(this.x, this.y, this.width, this.height, this.mode)
    }
  }
  
  canExecute(): boolean {
    return this.width > 0 && this.height > 0
  }
} 