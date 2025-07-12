import type { ICommand } from '@/lib/editor/commands/base/Command'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { EventStore } from '@/lib/events/core/EventStore'
import { ObjectAddedEvent, ObjectRemovedEvent, ObjectModifiedEvent } from '@/lib/events/canvas/CanvasEvents'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { Event } from '@/lib/events/core/Event'

export interface CommandAdapterConfig {
  debugging?: boolean
  errorHandling?: 'log' | 'throw' | 'ignore'
  enabled?: boolean
}

/**
 * Adapter to bridge old command pattern with new event sourcing
 * 
 * This adapter intercepts command execution and converts them to events.
 * It provides backward compatibility while migrating to the new architecture.
 * 
 * Now uses dependency injection instead of singleton pattern.
 */
export class CommandAdapter {
  private eventStore: EventStore
  private config: CommandAdapterConfig
  private disposed = false
  
  constructor(eventStore: EventStore, config: CommandAdapterConfig = {}) {
    this.eventStore = eventStore
    this.config = {
      debugging: false,
      errorHandling: 'log',
      enabled: true,
      ...config
    }
    
    if (this.config.debugging) {
      console.log('[CommandAdapter] Initialized with config:', this.config)
    }
  }
  
  /**
   * Enable/disable the adapter
   */
  setEnabled(enabled: boolean): void {
    if (this.disposed) {
      throw new Error('CommandAdapter has been disposed')
    }
    
    this.config.enabled = enabled
    
    if (this.config.debugging) {
      console.log(`[CommandAdapter] ${enabled ? 'Enabled' : 'Disabled'}`)
    }
  }
  
  /**
   * Check if the adapter is enabled
   */
  isEnabled(): boolean {
    return !this.disposed && (this.config.enabled ?? true)
  }
  
  /**
   * Dispose of the adapter and clean up resources
   */
  dispose(): void {
    if (this.disposed) return
    
    this.disposed = true
    this.config.enabled = false
    
    console.log('[CommandAdapter] Disposed')
  }
  
  /**
   * Check if the adapter is disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
  
  /**
   * Intercept command execution and convert to events
   */
  async interceptCommand(
    command: ICommand,
    context: ExecutionContext
  ): Promise<void> {
    if (this.disposed) {
      throw new Error('CommandAdapter has been disposed')
    }
    
    if (!this.isEnabled()) {
      // Just execute the command normally
      await command.execute()
      return
    }
    
    if (this.config.debugging) {
      console.log(`[CommandAdapter] Intercepting command: ${command.constructor.name}`)
    }
    
    try {
      // Convert command to event based on type
      const event = this.commandToEvent(command, context)
      
      if (event) {
        // Emit the event through the context
        await context.emit(event)
        
        // Execute the original command for backward compatibility
        // This ensures the canvas is updated immediately
        await command.execute()
        
        if (this.config.debugging) {
          console.log(`[CommandAdapter] Successfully processed command: ${command.constructor.name}`)
        }
      } else {
        // Unknown command type - just execute it
        if (this.config.debugging) {
          console.warn(`[CommandAdapter] Unknown command type: ${command.constructor.name}`)
        }
        await command.execute()
      }
    } catch (error) {
      this.handleError(new Error(`Failed to intercept command ${command.constructor.name}: ${error}`))
      // Still try to execute the command
      await command.execute()
    }
  }
  
  /**
   * Convert a command to an event
   */
  private commandToEvent(command: ICommand, context: ExecutionContext): ObjectAddedEvent | ObjectRemovedEvent | ObjectModifiedEvent | null {
    const metadata = context.getMetadata()
    
    // Use command description and constructor name to determine event type
    const commandName = command.constructor.name
    const description = command.description.toLowerCase()
    
    if (this.config.debugging) {
      console.log(`[CommandAdapter] Converting command: ${commandName} (${description})`)
    }
    
    // Handle specific command types
    switch (commandName) {
      case 'AddObjectCommand':
        return this.createAddObjectEvent(command, metadata)
        
      case 'RemoveObjectCommand':
        return this.createRemoveObjectEvent(command, metadata)
        
      case 'ModifyCommand':
        return this.createModifyEvent(command, metadata)
        
      case 'TransformCommand':
        return this.createTransformEvent(command, metadata)
        
      case 'CropCommand':
        return this.createCropEvent(command, metadata)
        
      default:
        // Try to infer from description
        if (description.includes('add') && description.includes('object')) {
          return this.createAddObjectEvent(command, metadata)
        }
        if (description.includes('remove') && description.includes('object')) {
          return this.createRemoveObjectEvent(command, metadata)
        }
        if (description.includes('modify') || description.includes('change')) {
          return this.createModifyEvent(command, metadata)
        }
        
        return null
    }
  }
  
  private createAddObjectEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager }, metadata: Event['metadata']): ObjectAddedEvent | null {
    if (!command.object || !command.canvasManager) {
      return null
    }

    return new ObjectAddedEvent(
      'main', // Default canvas ID for infinite canvas
      command.object,
      metadata
    )
  }
  
  private createRemoveObjectEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager }, metadata: Event['metadata']): ObjectRemovedEvent | null {
    if (!command.object || !command.canvasManager) {
      return null
    }

    return new ObjectRemovedEvent(
      'main', // Default canvas ID for infinite canvas
      command.object,
      metadata
    )
  }
  
  private createModifyEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): ObjectModifiedEvent | null {
    if (!command.object || !command.canvasManager || !command.previousState || !command.modifications) {
      return null
    }

    return new ObjectModifiedEvent(
      'main', // Default canvas ID for infinite canvas
      command.object,
      command.previousState,
      command.modifications,
      metadata
    )
  }
  
  private createTransformEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): ObjectModifiedEvent | null {
    return this.createModifyEvent(command, metadata)
  }
  
  private createCropEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): ObjectModifiedEvent | null {
    return this.createModifyEvent(command, metadata)
  }
  
  /**
   * Create a legacy-compatible object for events that still expect old format
   */
  private createLegacyObject(obj: CanvasObject): CanvasObject & {
    left: number
    top: number
    angle: number
    set: () => void
    setCoords: () => void
    getBoundingRect: () => { left: number; top: number; width: number; height: number }
  } {
    return {
      ...obj,
      left: obj.x,
      top: obj.y,
      angle: obj.rotation,
      // Add any other properties that might be needed
      set: () => {},
      setCoords: () => {},
      getBoundingRect: () => ({
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height
      })
    }
  }
  
  /**
   * Convert Konva object to Fabric-like object for compatibility
   */
  convertKonvaToFabric(obj: CanvasObject): CanvasObject & {
    left: number
    top: number
    angle: number
    set: () => void
    setCoords: () => void
    getBoundingRect: () => { left: number; top: number; width: number; height: number }
  } {
    return this.createLegacyObject(obj)
  }
  
  private handleError(error: Error): void {
    switch (this.config.errorHandling) {
      case 'throw':
        throw error
      case 'log':
        console.error('[CommandAdapter]', error.message)
        break
      case 'ignore':
        // Do nothing
        break
    }
  }
} 