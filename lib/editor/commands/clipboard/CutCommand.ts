import type { CanvasObject } from '@/lib/editor/objects/types'
import { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'
import { Command, type CommandContext } from '../base/Command'

export interface CutOptions {
  objects?: CanvasObject[]
}

export class CutCommand extends Command {
  private readonly options: CutOptions
  private clipboardManager: ClipboardManager
  private cutObjects: CanvasObject[] = []

  constructor(
    description: string,
    context: CommandContext,
    options: CutOptions = {}
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
    // Get objects to cut - use provided objects or selected objects
    const objectsToCut = this.options.objects || this.context.canvasManager.getSelectedObjects()
    
    if (objectsToCut.length === 0) {
      throw new Error('No objects to cut')
    }

    // Store objects for undo
    this.cutObjects = [...objectsToCut]

    // Copy objects to clipboard first
    await this.clipboardManager.copy(objectsToCut)

    // Remove objects from canvas
    for (const obj of objectsToCut) {
      await this.context.canvasManager.removeObject(obj.id)
    }

    // Clear selection since objects were removed
    this.context.canvasManager.deselectAll()
  }

  async undo(): Promise<void> {
    // Restore the cut objects
    for (const obj of this.cutObjects) {
      await this.context.canvasManager.addObject(obj)
    }

    // Select the restored objects
    const objectIds = this.cutObjects.map(obj => obj.id)
    this.context.canvasManager.selectMultiple(objectIds)
  }

  canExecute(): boolean {
    const objectsToCut = this.options.objects || this.context.canvasManager.getSelectedObjects()
    return objectsToCut.length > 0
  }

  canUndo(): boolean {
    return this.cutObjects.length > 0
  }
} 