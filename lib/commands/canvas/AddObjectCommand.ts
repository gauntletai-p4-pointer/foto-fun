import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'

/**
 * Command to add an object to the canvas
 */
export class AddObjectCommand extends Command {
  private canvas: Canvas
  private object: FabricObject
  private layerId?: string
  
  constructor(canvas: Canvas, object: FabricObject, layerId?: string) {
    super(`Add ${object.type || 'object'}`)
    this.canvas = canvas
    this.object = object
    this.layerId = layerId
  }
  
  async execute(): Promise<void> {
    // TODO: When layer system is implemented, add to specific layer
    // For now, just add to canvas
    this.canvas.add(this.object)
    this.canvas.setActiveObject(this.object)
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    this.canvas.remove(this.object)
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    // Re-add the object
    this.canvas.add(this.object)
    this.canvas.setActiveObject(this.object)
    this.canvas.renderAll()
  }
} 