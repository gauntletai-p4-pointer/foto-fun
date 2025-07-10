import type { ICommand } from '@/lib/editor/commands/base'
import { Event } from '../core/Event'
import { EventStore } from '../core/EventStore'
import { ExecutionContext } from '../execution/ExecutionContext'
import { 
  ObjectAddedEvent, 
  ObjectRemovedEvent, 
  ObjectModifiedEvent
} from '../canvas/CanvasEvents'
import type { Canvas, FabricObject } from 'fabric'

/**
 * CommandAdapter - Temporary bridge during migration from Command pattern to Event Sourcing
 * 
 * This adapter intercepts command executions and converts them to events.
 * Once migration is complete, this adapter will be removed.
 */
export class CommandAdapter {
  private static instance: CommandAdapter
  private eventStore: EventStore
  private isEnabled = true
  
  private constructor() {
    this.eventStore = EventStore.getInstance()
  }
  
  static getInstance(): CommandAdapter {
    if (!CommandAdapter.instance) {
      CommandAdapter.instance = new CommandAdapter()
    }
    return CommandAdapter.instance
  }
  
  /**
   * Enable/disable the adapter
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }
  
  /**
   * Intercept command execution and convert to events
   */
  async interceptCommand(
    command: ICommand,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.isEnabled) {
      // Just execute the command normally
      await command.execute()
      return
    }
    
    // Convert command to event based on type
    const event = this.commandToEvent(command, context)
    
    if (event) {
      // Emit the event through the context
      await context.emit(event)
      
      // Execute the original command for backward compatibility
      // This ensures the canvas is updated immediately
      await command.execute()
    } else {
      // Unknown command type - just execute it
      console.warn(`Unknown command type: ${command.constructor.name}`)
      await command.execute()
    }
  }
  
  /**
   * Convert a command to an event
   */
  private commandToEvent(command: ICommand, context: ExecutionContext): Event | null {
    const metadata = context.getMetadata()
    
    // Use command description and constructor name to determine event type
    const commandName = command.constructor.name
    const description = command.description.toLowerCase()
    
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
  
  private createAddObjectEvent(command: ICommand & { object?: FabricObject; canvas?: Canvas; layerId?: string }, metadata: Event['metadata']): Event | null {
    try {
      // Access private properties through type assertion
      const object = command.object
      const canvas = command.canvas
      const layerId = command.layerId
      
      if (!object || !canvas) return null
      
      return new ObjectAddedEvent(
        canvas.toString(), // Use canvas instance as ID for now
        object,
        layerId,
        metadata
      )
    } catch (error) {
      console.error('Failed to create AddObjectEvent:', error)
      return null
    }
  }
  
  private createRemoveObjectEvent(command: ICommand & { object?: FabricObject; canvas?: Canvas }, metadata: Event['metadata']): Event | null {
    try {
      const object = command.object
      const canvas = command.canvas
      
      if (!object || !canvas) return null
      
      return new ObjectRemovedEvent(
        canvas.toString(),
        object,
        metadata
      )
    } catch (error) {
      console.error('Failed to create RemoveObjectEvent:', error)
      return null
    }
  }
  
  private createModifyEvent(command: ICommand & { object?: FabricObject; canvas?: Canvas; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): Event | null {
    try {
      const object = command.object
      const canvas = command.canvas
      const previousState = command.previousState || {}
      const newState = command.modifications || {}
      
      if (!object || !canvas) return null
      
      return new ObjectModifiedEvent(
        canvas.toString(),
        object,
        previousState,
        newState,
        metadata
      )
    } catch (error) {
      console.error('Failed to create ModifyEvent:', error)
      return null
    }
  }
  
  private createTransformEvent(command: ICommand & { object?: FabricObject; canvas?: Canvas; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): Event | null {
    // Transform is a type of modification
    return this.createModifyEvent(command, metadata)
  }
  
  private createCropEvent(command: ICommand & { object?: FabricObject; canvas?: Canvas; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): Event | null {
    // Crop modifies the object bounds
    return this.createModifyEvent(command, metadata)
  }
} 