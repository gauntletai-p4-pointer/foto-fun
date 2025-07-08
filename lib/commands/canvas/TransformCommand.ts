import { Command } from '../base'
import type { Canvas, FabricObject } from 'fabric'

interface TransformState {
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  skewX: number
  skewY: number
  flipX: boolean
  flipY: boolean
}

/**
 * Command to transform an object (move, scale, rotate, etc.)
 * This command can be merged with consecutive transform commands on the same object
 */
export class TransformCommand extends Command {
  private canvas: Canvas
  private object: FabricObject
  private oldState: TransformState
  private newState: TransformState
  
  constructor(canvas: Canvas, object: FabricObject, oldState: TransformState, newState: TransformState) {
    super(`Transform ${object.type || 'object'}`)
    this.canvas = canvas
    this.object = object
    this.oldState = { ...oldState }
    this.newState = { ...newState }
  }
  
  async execute(): Promise<void> {
    this.applyState(this.newState)
  }
  
  async undo(): Promise<void> {
    this.applyState(this.oldState)
  }
  
  async redo(): Promise<void> {
    this.applyState(this.newState)
  }
  
  private applyState(state: TransformState): void {
    this.object.set({
      left: state.left,
      top: state.top,
      scaleX: state.scaleX,
      scaleY: state.scaleY,
      angle: state.angle,
      skewX: state.skewX,
      skewY: state.skewY,
      flipX: state.flipX,
      flipY: state.flipY
    })
    this.object.setCoords()
    this.canvas.renderAll()
  }
  
  /**
   * Check if this command can be merged with another
   * We can merge consecutive transforms on the same object
   */
  canMergeWith(other: Command): boolean {
    return other instanceof TransformCommand && 
           other.object === this.object &&
           // Only merge if commands are close in time (within 500ms)
           Math.abs(other.timestamp - this.timestamp) < 500
  }
  
  /**
   * Merge with another transform command
   * Keep the old state from this command and new state from the other
   */
  mergeWith(other: Command): void {
    if (other instanceof TransformCommand) {
      this.newState = { ...other.newState }
    }
  }
  
  /**
   * Static helper to capture current transform state
   */
  static captureState(object: FabricObject): TransformState {
    return {
      left: object.left || 0,
      top: object.top || 0,
      scaleX: object.scaleX || 1,
      scaleY: object.scaleY || 1,
      angle: object.angle || 0,
      skewX: object.skewX || 0,
      skewY: object.skewY || 0,
      flipX: object.flipX || false,
      flipY: object.flipY || false
    }
  }
} 