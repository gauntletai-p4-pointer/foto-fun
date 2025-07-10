import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'
import type { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'

/**
 * Command to paste from clipboard
 */
export class PasteCommand extends Command {
  private canvas: Canvas
  private clipboardManager: ClipboardManager
  private pastedObject: FabricObject | null = null
  
  constructor(canvas: Canvas, clipboardManager: ClipboardManager) {
    super('Paste')
    this.canvas = canvas
    this.clipboardManager = clipboardManager
  }
  
  async execute(): Promise<void> {
    // Store reference to current active object
    const previousActive = this.canvas.getActiveObject()
    
    // Paste from clipboard
    const success = await this.clipboardManager.paste()
    
    if (success) {
      // Get the newly pasted object (should be active)
      const newObject = this.canvas.getActiveObject()
      if (newObject && newObject !== previousActive) {
        this.pastedObject = newObject
      }
    }
  }
  
  async undo(): Promise<void> {
    if (this.pastedObject) {
      this.canvas.remove(this.pastedObject)
      
      // Clear selection
      this.canvas.discardActiveObject()
      
      this.canvas.renderAll()
    }
  }
  
  async redo(): Promise<void> {
    if (this.pastedObject) {
      // Add to canvas
      this.canvas.add(this.pastedObject)
      
      // Set as active object
      this.canvas.setActiveObject(this.pastedObject)
      
      this.canvas.renderAll()
    }
  }
  
  canExecute(): boolean {
    return this.clipboardManager.hasClipboardData()
  }
} 