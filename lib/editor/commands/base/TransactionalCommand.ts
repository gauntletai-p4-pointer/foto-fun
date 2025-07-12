import { Command, type CommandMetadata, type CommandContext } from './Command'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { BlendMode } from '@/lib/editor/canvas/types'
import type { ImageData, TextData, ShapeData } from '@/lib/editor/objects/types'
import type { CommandResult } from './CommandResult'

/**
 * Object data union type for snapshots
 */
export type SnapshotObjectData = ImageData | TextData | ShapeData | import('@/lib/editor/objects/types').GroupData | import('@/lib/editor/objects/types').FrameData

/**
 * Canvas state snapshot for rollback
 */
export interface CanvasStateSnapshot {
  objects: Array<{
    id: string
    type: 'image' | 'text' | 'shape' | 'group' | 'verticalText' | 'frame'
    name: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    scaleX: number
    scaleY: number
    zIndex: number
    opacity: number
    blendMode: BlendMode
    visible: boolean
    locked: boolean
    data: SnapshotObjectData
  }>
  selectedObjectIds: string[]
  backgroundColor: string
  viewport: { width: number; height: number }
  camera: { x: number; y: number; zoom: number }
}

/**
 * Abstract base class for transactional commands
 * Provides automatic state snapshots and rollback capabilities
 */
export abstract class TransactionalCommand extends Command {
  private checkpoint: CanvasStateSnapshot | null = null
  private executionTime: number = 0
  protected canvasManager: CanvasManager
  
  constructor(
    description: string,
    context: CommandContext,
    metadata?: Partial<CommandMetadata>
  ) {
    super(description, context, metadata)
    this.canvasManager = context.canvasManager
  }
  
  /**
   * The actual command implementation
   * Subclasses implement this instead of execute()
   */
  protected abstract doExecute(): Promise<void>
  
  /**
   * The actual undo implementation
   * Subclasses implement this instead of undo()
   */
  protected abstract doUndo(): Promise<void>
  
  /**
   * Execute with automatic checkpoint and rollback
   */
  async execute(): Promise<CommandResult<void>> {
    const startTime = performance.now()
    
    try {
      // Save checkpoint before execution
      this.checkpoint = await this.saveCanvasState()
      
      // Execute the actual command
      await this.doExecute()
      
      this.executionTime = performance.now() - startTime
      console.log(`[Command] ${this.description} executed in ${this.executionTime.toFixed(2)}ms`)
      
      return {
        success: true,
        data: undefined,
        events: [],
        metadata: {
          executionTime: this.executionTime,
          affectedObjects: []
        }
      }
      
    } catch (error) {
      // Automatic rollback on error
      console.error(`[Command] ${this.description} failed, rolling back...`, error)
      
      if (this.checkpoint) {
        try {
          await this.restoreCanvasState(this.checkpoint)
          console.log(`[Command] Rollback successful`)
        } catch (rollbackError) {
          console.error(`[Command] Rollback failed!`, rollbackError)
          // Return a more serious error if rollback fails
          return {
            success: false,
            error: new (await import('./CommandResult')).ExecutionError(
              `Command failed and rollback also failed: ${rollbackError}`,
              { commandId: this.id }
            )
          }
        }
      }
      
      // Return the original error wrapped in CommandExecutionError
      return {
        success: false,
        error: new (await import('./CommandResult')).ExecutionError(
          error instanceof Error ? error.message : String(error),
          { commandId: this.id }
        )
      }
    }
  }
  
  /**
   * Undo the command
   */
  async undo(): Promise<CommandResult<void>> {
    try {
      await this.doUndo()
      return {
        success: true,
        data: undefined,
        events: [],
        metadata: {
          executionTime: 0,
          affectedObjects: []
        }
      }
    } catch (error) {
      return {
        success: false,
        error: new (await import('./CommandResult')).ExecutionError(
          `Undo ${this.description}: ${error instanceof Error ? error.message : String(error)}`,
          { commandId: this.id }
        )
      }
    }
  }
  
  /**
   * Save current canvas state
   */
  protected async saveCanvasState(): Promise<CanvasStateSnapshot | null> {
    const canvas = this.getCanvasManager()
    if (!canvas) return null
    
    const state = canvas.state
    
    // Deep clone the state to create a snapshot
    const allObjects = canvas.getAllObjects()
    const snapshot: CanvasStateSnapshot = {
      objects: allObjects.map(obj => ({
        id: obj.id,
        type: obj.type,
        name: obj.name,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        zIndex: obj.zIndex,
        opacity: obj.opacity,
        blendMode: obj.blendMode,
        visible: obj.visible,
        locked: obj.locked,
        data: structuredClone(obj.data)
      })),
      selectedObjectIds: Array.from(state.selectedObjectIds),
      backgroundColor: state.backgroundColor,
      viewport: { ...state.viewport },
      camera: { ...state.camera }
    }
    
    return snapshot
  }
  
  /**
   * Restore canvas state
   */
  protected async restoreCanvasState(snapshot: CanvasStateSnapshot): Promise<void> {
    const canvas = this.getCanvasManager()
    if (!canvas) return
    
    // Clear existing objects
    const currentObjects = canvas.getAllObjects()
    for (const obj of currentObjects) {
      await canvas.removeObject(obj.id)
    }
    
    // Restore objects
    for (const objData of snapshot.objects) {
      await canvas.addObject({
        ...objData
      })
    }
    
    // Restore camera properties (viewport is read-only, managed by container)
    canvas.setZoom(snapshot.camera.zoom)
    canvas.setPan({ x: snapshot.camera.x, y: snapshot.camera.y })
    
    // Restore selection
    if (snapshot.selectedObjectIds.length > 0) {
      // Select objects one by one
      canvas.clearSelection()
      for (const objectId of snapshot.selectedObjectIds) {
        const object = canvas.getObject(objectId)
        if (object) {
          canvas.selectObject(objectId)
        }
      }
    } else {
      canvas.clearSelection()
    }
    
    // Force redraw
    canvas.stage.batchDraw()
  }
  
  /**
   * Get canvas manager instance
   * Now returns the injected instance instead of using singleton
   */
  protected getCanvasManager(): CanvasManager {
    return this.canvasManager
  }
  
  /**
   * Get execution metrics
   */
  getMetrics() {
    return {
      executionTime: this.executionTime,
      hasCheckpoint: this.checkpoint !== null
    }
  }
}

/**
 * Composite transactional command that groups multiple commands
 * All commands execute in a single transaction with collective rollback
 */
export class CompositeTransactionalCommand extends TransactionalCommand {
  private commands: Command[] = []
  private executedCommands: Command[] = []
  
  constructor(
    description: string, 
    context: CommandContext,
    commands: Command[] = []
  ) {
    super(description, context, {
      source: 'system'
    })
    this.commands = commands
  }
  
  /**
   * Add a command to the composite
   */
  addCommand(command: Command): void {
    this.commands.push(command)
  }
  
  /**
   * Execute all commands in order
   */
  protected async doExecute(): Promise<void> {
    this.executedCommands = []
    
    for (const command of this.commands) {
      if (!command.canExecute()) {
        throw new Error(`Cannot execute command: ${command.description}`)
      }
      
      await command.execute()
      this.executedCommands.push(command)
    }
  }
  
  /**
   * Undo all executed commands in reverse order
   */
  protected async doUndo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.executedCommands.length - 1; i >= 0; i--) {
      const command = this.executedCommands[i]
      if (command.canUndo()) {
        await command.undo()
      }
    }
    this.executedCommands = []
  }
  
  /**
   * Check if all commands can be executed
   */
  canExecute(): boolean {
    return this.commands.length > 0 && this.commands.every(cmd => cmd.canExecute())
  }
  
  /**
   * Check if all executed commands can be undone
   */
  canUndo(): boolean {
    return this.executedCommands.length > 0 && 
           this.executedCommands.every(cmd => cmd.canUndo())
  }
}

/**
 * Create a transaction from multiple commands
 */
export function transaction(
  description: string,
  context: CommandContext,
  ...commands: Command[]
): CompositeTransactionalCommand {
  return new CompositeTransactionalCommand(description, context, commands)
} 