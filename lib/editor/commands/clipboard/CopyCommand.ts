import { Command } from '../base'
import type { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'

/**
 * Command to copy selection or objects
 * Note: Copy doesn't modify the document, so undo/redo just tracks the operation
 */
export class CopyCommand extends Command {
  private clipboardManager: ClipboardManager
  private success: boolean = false
  
  constructor(clipboardManager: ClipboardManager) {
    super('Copy')
    this.clipboardManager = clipboardManager
  }
  
  async execute(): Promise<void> {
    this.success = await this.clipboardManager.copy()
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