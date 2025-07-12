import type { CanvasObject } from '@/lib/editor/objects/types'
import { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'
import { Command, type CommandContext } from '../base/Command'
import { CommandResult } from '../base/CommandResult'

export interface CopyOptions {
  objects?: CanvasObject[]
}

export class CopyCommand extends Command {
  private readonly options: CopyOptions
  private clipboardManager: ClipboardManager

  constructor(
    description: string,
    context: CommandContext,
    options: CopyOptions = {}
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: false
    })
    this.options = options
    // Get clipboard manager from service container or create one
    // Note: This should be injected through context in future iterations
    this.clipboardManager = new ClipboardManager(
      context.eventBus as any, // TODO: Fix EventStore dependency
      context.eventBus,
      { validation: true }
    )
  }

  async doExecute(): Promise<void> {
    // Get objects to copy - use provided objects or selected objects
    const objectsToCopy = this.options.objects || this.context.canvasManager.getSelectedObjects()
    
    if (objectsToCopy.length === 0) {
      throw new Error('No objects to copy')
    }

    // Copy objects to clipboard
    await this.clipboardManager.copy(objectsToCopy)
  }

  async undo(): Promise<CommandResult<void>> {
    // Copy operations can't be undone - they don't change canvas state
    return {
      success: true,
      data: undefined,
      events: [],
      metadata: {
        executionTime: 0,
        affectedObjects: []
      }
    }
  }

  canExecute(): boolean {
    const objectsToCopy = this.options.objects || this.context.canvasManager.getSelectedObjects()
    return objectsToCopy.length > 0
  }

  canUndo(): boolean {
    return false // Copy operations cannot be undone
  }
} 