import { Command } from '../base'
import type { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'
import type { CanvasObject } from '@/lib/editor/canvas/types'

/**
 * Command to copy selection or objects
 * Note: Copy doesn't modify the document, so undo/redo just tracks the operation
 */
export class CopyCommand extends Command {
  private clipboardManager: ClipboardManager
  private objectsToCopy: CanvasObject[]
  
  constructor(clipboardManager: ClipboardManager, objectsToCopy: CanvasObject[]) {
    super('Copy')
    this.clipboardManager = clipboardManager
    this.objectsToCopy = objectsToCopy
  }
  
  protected async doExecute(): Promise<void> {
    await this.clipboardManager.copy(this.objectsToCopy)
  }
  
  async undo(): Promise<void> {
    // Copy operation doesn't modify the document
    // Nothing to undo
  }
  
  async redo(): Promise<void> {
    // Re-execute the copy
    await this.execute()
  }
  
  canExecute(): boolean {
    // Can execute if there's a selection or active object
    return true
  }
} 