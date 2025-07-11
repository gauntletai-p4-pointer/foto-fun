import { Command } from '../base/Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

export type ReorderDirection = 'front' | 'back' | 'forward' | 'backward'

export class ReorderObjectsCommand extends Command {
  private previousOrder: string[] = []
  
  constructor(
    private canvas: CanvasManager,
    private objectIds: string[],
    private direction: ReorderDirection
  ) {
    super(`Move ${objectIds.length} object(s) ${direction}`)
  }
  
  protected async doExecute(): Promise<void> {
    // Store current order for undo
    this.previousOrder = [...this.canvas.getObjectOrder()]
    
    // Apply reordering based on direction
    switch (this.direction) {
      case 'front':
        await this.bringToFront()
        break
      case 'back':
        await this.sendToBack()
        break
      case 'forward':
        await this.bringForward()
        break
      case 'backward':
        await this.sendBackward()
        break
    }
  }
  
  async undo(): Promise<void> {
    // Restore previous order
    await this.canvas.setObjectOrder(this.previousOrder)
  }
  
  private async bringToFront(): Promise<void> {
    for (const id of this.objectIds) {
      await this.canvas.bringObjectToFront(id)
    }
  }
  
  private async sendToBack(): Promise<void> {
    for (const id of this.objectIds) {
      await this.canvas.sendObjectToBack(id)
    }
  }
  
  private async bringForward(): Promise<void> {
    for (const id of this.objectIds) {
      await this.canvas.bringObjectForward(id)
    }
  }
  
  private async sendBackward(): Promise<void> {
    for (const id of this.objectIds) {
      await this.canvas.sendObjectBackward(id)
    }
  }
} 