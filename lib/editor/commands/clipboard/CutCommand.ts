import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'
import type { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'
import type { SelectionManager } from '@/lib/editor/selection'

/**
 * Command to cut selection or objects
 */
export class CutCommand extends Command {
  private canvas: Canvas
  private clipboardManager: ClipboardManager
  private selectionManager: SelectionManager
  private deletedObject: FabricObject | null = null
  private previousSelection: ImageData | null = null
  private previousBounds: { x: number; y: number; width: number; height: number } | null = null
  
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
        const ctx = document.createElement('canvas').getContext('2d')!
        this.previousSelection = ctx.createImageData(selection.mask.width, selection.mask.height)
        this.previousSelection.data.set(selection.mask.data)
        this.previousBounds = { ...selection.bounds }
      }
      
      // Clear the selection
      this.selectionManager.clear()
    } else {
      // Delete the active object
      const activeObject = this.canvas.getActiveObject()
      if (activeObject) {
        this.deletedObject = activeObject
        this.canvas.remove(activeObject)
        
        // Only clear selection if not executing within a tool chain
        const { ToolChain } = await import('@/lib/ai/execution/ToolChain')
        if (!ToolChain.isExecutingChain) {
          this.canvas.discardActiveObject()
        }
        
        this.canvas.renderAll()
      }
    }
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection && this.previousBounds) {
      // Restore the selection
      this.selectionManager.restoreSelection(this.previousSelection, this.previousBounds)
    } else if (this.deletedObject) {
      // Restore the deleted object
      this.canvas.add(this.deletedObject)
      
      // Only restore selection if not executing within a tool chain
      const { ToolChain } = await import('@/lib/ai/execution/ToolChain')
      if (!ToolChain.isExecutingChain) {
        this.canvas.setActiveObject(this.deletedObject)
      }
      
      this.canvas.renderAll()
    }
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
} 