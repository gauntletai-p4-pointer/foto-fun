import { Command, type ICommand } from './Command'
import type { Canvas } from 'fabric'
import { CommandExecutionError } from '@/lib/ai/errors'

/**
 * Canvas state snapshot for rollback
 */
export interface CanvasState {
  json: string
  viewport?: number[]
  zoom?: number
  selection?: string[]
}

/**
 * Transactional command with automatic rollback on error
 * 
 * Features:
 * - Automatic checkpoint before execution
 * - Rollback on error
 * - Nested transaction support
 * - Performance tracking
 */
export abstract class TransactionalCommand extends Command {
  private checkpoint: CanvasState | null = null
  private executionTime: number = 0
  protected canvas: Canvas | null = null
  
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
  async execute(): Promise<void> {
    const startTime = performance.now()
    
    try {
      // Save checkpoint before execution
      this.checkpoint = await this.saveCanvasState()
      
      // Execute the actual command
      await this.doExecute()
      
      this.executionTime = performance.now() - startTime
      console.log(`[Command] ${this.description} executed in ${this.executionTime.toFixed(2)}ms`)
      
    } catch (error) {
      // Automatic rollback on error
      console.error(`[Command] ${this.description} failed, rolling back...`, error)
      
      if (this.checkpoint) {
        try {
          await this.restoreCanvasState(this.checkpoint)
          console.log(`[Command] Rollback successful`)
        } catch (rollbackError) {
          console.error(`[Command] Rollback failed!`, rollbackError)
          // Throw a more serious error if rollback fails
          throw new CommandExecutionError(
            this.description,
            new Error(`Command failed and rollback also failed: ${rollbackError}`)
          )
        }
      }
      
      // Re-throw the original error wrapped in CommandExecutionError
      throw new CommandExecutionError(
        this.description,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }
  
  /**
   * Undo the command
   */
  async undo(): Promise<void> {
    try {
      await this.doUndo()
    } catch (error) {
      throw new CommandExecutionError(
        `Undo ${this.description}`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }
  
  /**
   * Save current canvas state
   */
  protected async saveCanvasState(): Promise<CanvasState | null> {
    const canvas = this.getCanvas()
    if (!canvas) return null
    
    return {
      json: JSON.stringify(canvas.toJSON()),
      viewport: canvas.viewportTransform ? [...canvas.viewportTransform] : undefined,
      zoom: canvas.getZoom(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selection: canvas.getActiveObjects().map(obj => obj.get('id' as any) || '')
    }
  }
  
  /**
   * Restore canvas state
   */
  protected async restoreCanvasState(state: CanvasState): Promise<void> {
    const canvas = this.getCanvas()
    if (!canvas) return
    
    return new Promise((resolve) => {
      canvas.loadFromJSON(state.json, () => {
        // Restore viewport
        if (state.viewport && state.viewport.length === 6) {
          canvas.setViewportTransform(state.viewport as [number, number, number, number, number, number])
        }
        
        // Restore zoom
        if (state.zoom) {
          canvas.setZoom(state.zoom)
        }
        
        // Restore selection
        if (state.selection && state.selection.length > 0) {
          const objects = canvas.getObjects()
          const toSelect = objects.filter(obj => 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            state.selection!.includes(obj.get('id' as any) || '')
          )
          if (toSelect.length > 0) {
            canvas.setActiveObject(
              toSelect.length === 1 
                ? toSelect[0]
                : new fabric.ActiveSelection(toSelect, { canvas })
            )
          }
        }
        
        canvas.renderAll()
        resolve()
      })
    })
  }
  
  /**
   * Get canvas instance
   * Override this if your command gets canvas differently
   */
  protected getCanvas(): Canvas | null {
    if (this.canvas) return this.canvas
    
    // Try to get from store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canvasStore = (window as any).useCanvasStore?.getState?.()
    return canvasStore?.fabricCanvas || null
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
  private commands: ICommand[] = []
  private executedCommands: ICommand[] = []
  
  constructor(description: string, commands: ICommand[] = []) {
    super(description)
    this.commands = commands
  }
  
  /**
   * Add a command to the composite
   */
  addCommand(command: ICommand): void {
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
  ...commands: ICommand[]
): CompositeTransactionalCommand {
  return new CompositeTransactionalCommand(description, commands)
}

// Re-export fabric for convenience
import { ActiveSelection } from 'fabric'
const fabric = { ActiveSelection } 