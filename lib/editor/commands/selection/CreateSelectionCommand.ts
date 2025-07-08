import { Command } from '../base'
import type { SelectionManager, SelectionMode } from '@/lib/editor/selection'

/**
 * Command to create a selection
 */
export class CreateSelectionCommand extends Command {
  private selectionManager: SelectionManager
  private previousSelection: ImageData | null = null
  private newSelection: ImageData
  private mode: SelectionMode
  
  constructor(
    selectionManager: SelectionManager, 
    selection: ImageData,
    mode: SelectionMode = 'replace'
  ) {
    super(`Create ${mode} selection`)
    this.selectionManager = selectionManager
    this.newSelection = selection
    this.mode = mode
  }
  
  async execute(): Promise<void> {
    // Save current selection if any
    const current = this.selectionManager.getSelection()
    if (current) {
      this.previousSelection = current.mask
    }
    
    // Apply new selection based on mode
    // For now, we'll need to enhance SelectionManager to accept ImageData directly
    // This is a simplified version
    console.log('Creating selection with mode:', this.mode)
  }
  
  async undo(): Promise<void> {
    if (this.previousSelection) {
      // Restore previous selection
      console.log('Restoring previous selection')
    } else {
      // Clear selection
      this.selectionManager.clear()
    }
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
} 