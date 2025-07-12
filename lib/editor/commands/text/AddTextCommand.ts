import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { TextData } from '@/lib/editor/objects/types'
import type { Point } from '@/types'
import { Command, type CommandContext } from '../base/Command'

export interface AddTextOptions {
  text: string
  position: Point
  style?: {
    fontSize?: number
    fontFamily?: string
    color?: string
    align?: 'left' | 'center' | 'right'
    lineHeight?: number
    letterSpacing?: number
  }
}

export class AddTextCommand extends Command {
  private objectId: string | null = null
  private readonly options: AddTextOptions

  constructor(
    description: string,
    context: CommandContext,
    options: AddTextOptions
  ) {
    super(description, context, {
      source: 'user',
      canMerge: false,
      affectsSelection: true
    })
    this.options = options
  }

  async doExecute(): Promise<void> {
    // Create text object with proper TextData structure
    const textData: TextData = {
      content: this.options.text,
      font: this.options.style?.fontFamily || 'Arial',
      fontSize: this.options.style?.fontSize || 16,
      color: this.options.style?.color || '#000000',
      align: this.options.style?.align || 'left',
      lineHeight: this.options.style?.lineHeight,
      letterSpacing: this.options.style?.letterSpacing
    }

    const textObject = {
      type: 'text' as const,
      name: 'Text',
      x: this.options.position.x,
      y: this.options.position.y,
      width: 200, // Default width, will be adjusted based on content
      height: 50, // Default height, will be adjusted based on content
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      opacity: 1,
      blendMode: 'normal' as const,
      visible: true,
      locked: false,
      filters: [],
      adjustments: [],
      data: textData
    }

    // Add object to canvas
    this.objectId = await this.context.canvasManager.addObject(textObject)
    
    // Select the newly created text object
    this.context.canvasManager.selectObject(this.objectId)
  }

  async undo(): Promise<void> {
    if (this.objectId) {
      await this.context.canvasManager.removeObject(this.objectId)
      this.objectId = null
    }
  }

  canExecute(): boolean {
    return this.options.text.length > 0
  }

  canUndo(): boolean {
    return this.objectId !== null
  }
} 