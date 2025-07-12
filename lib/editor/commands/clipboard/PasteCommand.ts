import type { CanvasObject } from '@/lib/editor/objects/types'
import { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'
import { Command, type CommandContext } from '../base/Command'
import { CommandResult, success, failure, ExecutionError } from '../base/CommandResult'

export interface PasteOptions {
  position?: { x: number; y: number }
  offset?: number
}

export class PasteCommand extends Command {
  private readonly options: PasteOptions
  private clipboardManager: ClipboardManager
  private pastedObjects: CanvasObject[] = []

  constructor(
    description: string,
    context: CommandContext,
    options: PasteOptions = {}
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: true
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
    // Check if clipboard has content
    if (!this.clipboardManager.hasContent()) {
      throw new Error('No content to paste')
    }

    // Paste objects from clipboard
    this.pastedObjects = await this.clipboardManager.paste(this.context.canvasManager)

    // Apply custom positioning if specified
    if (this.options.position && this.pastedObjects.length > 0) {
      const offset = this.options.offset || 0
      for (let i = 0; i < this.pastedObjects.length; i++) {
        const obj = this.pastedObjects[i]
        await this.context.canvasManager.updateObject(obj.id, {
          x: this.options.position.x + (i * offset),
          y: this.options.position.y + (i * offset)
        })
      }
    }

    // Select the pasted objects
    const objectIds = this.pastedObjects.map(obj => obj.id)
    this.context.canvasManager.selectMultiple(objectIds)
  }

  async undo(): Promise<CommandResult<void>> {
    try {
      // Remove the pasted objects
      for (const object of this.pastedObjects) {
        await this.context.canvasManager.removeObject(object.id)
      }

      return success(undefined, [], {
        executionTime: 0,
        affectedObjects: this.pastedObjects.map(obj => obj.id)
      })
    } catch (error) {
      return failure(
        new ExecutionError('Failed to undo paste operation', { commandId: this.id })
      )
    }
  }

  canExecute(): boolean {
    return this.clipboardManager.hasContent()
  }

  canUndo(): boolean {
    return this.pastedObjects.length > 0
  }
} 