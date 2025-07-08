import type { IText, Textbox } from 'fabric'
import { Command } from '../base/Command'

/**
 * Command to edit existing text content
 */
export class EditTextCommand extends Command {
  constructor(
    private textObject: IText | Textbox,
    private oldText: string,
    private newText: string
  ) {
    super('Edit text')
  }
  
  async execute(): Promise<void> {
    this.textObject.set('text', this.newText)
    this.textObject.canvas?.renderAll()
  }
  
  async undo(): Promise<void> {
    this.textObject.set('text', this.oldText)
    this.textObject.canvas?.renderAll()
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  /**
   * Allow merging of consecutive text edits within 1 second
   */
  canMergeWith(other: Command): boolean {
    return other instanceof EditTextCommand && 
           other.textObject === this.textObject &&
           Math.abs(other.timestamp - this.timestamp) < 1000
  }
} 