import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'
import type { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'
import type { SelectionManager, PixelSelection } from '@/lib/editor/selection'

/**
 * Command to cut selection or objects
 */
export class CutCommand extends Command {
  private canvas: Canvas
  private clipboardManager: ClipboardManager
  private selectionManager: SelectionManager
  private deletedObject: FabricObject | null = null
  private previousSelection: PixelSelection | null = null
  
  constructor(
    canvas: Canvas,
    clipboardManager: ClipboardManager,
    selectionManager: SelectionManager
  ) {
    super('Cut')
    this.canvas = canvas
    this.clipboardManager = clipboardManager
    this.selectionManager = selectionManager
  }
  
  async execute(): Promise<void> {
    // First copy to clipboard
    const copied = await this.clipboardManager.copy()
    if (!copied) return
    
    // Then delete what was copied
    if (this.selectionManager.hasSelection()) {
      // Save selection for undo
      const selection = this.selectionManager.getSelection()
      if (selection) {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = selection.mask.width
        canvas.height = selection.mask.height
        const clonedMask = ctx.createImageData(selection.mask.width, selection.mask.height)
        clonedMask.data.set(selection.mask.data)
        
        this.previousSelection = {
          mask: clonedMask,
          bounds: { ...selection.bounds },
          shape: selection.shape  // Preserve shape information
        }
      }
      
      // Clear the selection
      this.selectionManager.clear()
    } else {
      // Delete the active object
      const activeObject = this.canvas.getActiveObject()
      if (activeObject) {
        this.deletedObject = activeObject
        this.canvas.remove(activeObject)
        this.canvas.discardActiveObject()
        this.canvas.renderAll()
      }
    }
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection) {
      // Restore the selection
      this.selectionManager.restoreSelection(
        this.previousSelection.mask, 
        this.previousSelection.bounds,
        this.previousSelection.shape
      )
    } else if (this.deletedObject) {
      // Restore the deleted object
      this.canvas.add(this.deletedObject)
      this.canvas.setActiveObject(this.deletedObject)
      this.canvas.renderAll()
    }
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
} 