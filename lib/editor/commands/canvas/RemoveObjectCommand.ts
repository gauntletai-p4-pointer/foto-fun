import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'

/**
 * Command to remove an object from the canvas
 */
export class RemoveObjectCommand extends Command {
  private canvas: Canvas
  private object: FabricObject
  private index: number = -1
  
  constructor(canvas: Canvas, object: FabricObject) {
    super(`Remove ${object.type || 'object'}`)
    this.canvas = canvas
    this.object = object
  }
  
  async execute(): Promise<void> {
    // Store the index for redo
    const objects = this.canvas.getObjects()
    this.index = objects.indexOf(this.object)
    
    // Remove the object
    this.canvas.remove(this.object)
    this.canvas.discardActiveObject()
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    // Re-add the object at its original position
    if (this.index >= 0) {
      // Get current objects
      const objects = this.canvas.getObjects()
      // Remove all objects
      this.canvas.clear()
      // Re-add objects in order, inserting our object at the right position
      objects.forEach((obj, i) => {
        if (i === this.index) {
          this.canvas.add(this.object)
        }
        this.canvas.add(obj)
      })
      // If the object was at the end
      if (this.index >= objects.length) {
        this.canvas.add(this.object)
      }
    } else {
      this.canvas.add(this.object)
    }
    this.canvas.setActiveObject(this.object)
    this.canvas.renderAll()
  }
} 