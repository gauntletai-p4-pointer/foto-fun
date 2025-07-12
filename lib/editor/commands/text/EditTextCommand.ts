import type { CanvasObject, TextData } from '@/lib/editor/objects/types'
import { Command, type CommandContext } from '../base/Command'

export interface EditTextOptions {
  objectId: string
  newText: string
  newStyle?: Partial<TextData>
}

export class EditTextCommand extends Command {
  private readonly options: EditTextOptions
  private previousText: string = ''
  private previousStyle: TextData | null = null

  constructor(
    description: string,
    context: CommandContext,
    options: EditTextOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: true, // Text edits can be merged
      affectsSelection: false
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Get the text object
    const textObject = this.context.canvasManager.getObject(this.options.objectId)
    
    if (!textObject || textObject.type !== 'text') {
      throw new Error(`Text object with ID ${this.options.objectId} not found`)
    }

    const textData = textObject.data as TextData

    // Store previous state for undo
    this.previousText = textData.content
    this.previousStyle = { ...textData }

    // Create updated text data with proper structure
    const updatedTextData: TextData = {
      ...textData,
      content: this.options.newText,
      ...this.options.newStyle
    }

    // Prepare the updates
    const updates: Partial<CanvasObject> = {
      data: updatedTextData
    }

    // Apply the updates
    await this.context.canvasManager.updateObject(this.options.objectId, updates)
  }

  async undo(): Promise<void> {
    if (!this.previousStyle) return

    // Restore previous text and style
    const updates: Partial<CanvasObject> = {
      data: this.previousStyle
    }

    await this.context.canvasManager.updateObject(this.options.objectId, updates)
  }

  canExecute(): boolean {
    const textObject = this.context.canvasManager.getObject(this.options.objectId)
    return textObject !== null && textObject.type === 'text'
  }

  canUndo(): boolean {
    return this.previousStyle !== null
  }

  canMergeWith(other: Command): boolean {
    if (!(other instanceof EditTextCommand)) {
      return false
    }
    
    // Can merge if editing the same text object
    return this.options.objectId === other.options.objectId
  }

  mergeWith(other: Command): void {
    if (!(other instanceof EditTextCommand)) {
      return
    }

    // Update with the latest text and style
    this.options.newText = other.options.newText
    if (other.options.newStyle) {
      this.options.newStyle = { ...this.options.newStyle, ...other.options.newStyle }
    }
  }
} 