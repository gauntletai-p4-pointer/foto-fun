import type { ICommand } from '@/lib/editor/commands/base'
import { Event } from '../core/Event'
import { EventStore } from '../core/EventStore'
import { ExecutionContext } from '../execution/ExecutionContext'
import { 
  ObjectAddedEvent, 
  ObjectRemovedEvent, 
  ObjectModifiedEvent
} from '../canvas/CanvasEvents'
import type { CanvasManager, CanvasObject } from '@/lib/editor/canvas/types'

/**
 * @deprecated This adapter is being phased out as commands are migrated to event-driven architecture
 * 
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
  
  private createAddObjectEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager; layerId?: string }, metadata: Event['metadata']): Event | null {
    try {
      // Access private properties through type assertion
      const object = command.object
      const canvasManager = command.canvasManager
      const layerId = command.layerId
      
      if (!object || !canvasManager) return null
      
      // Create a compatible object for the legacy event
      const legacyObject = this.createLegacyObject(object)
      
      return new ObjectAddedEvent(
        'main', // Use default canvas ID
        legacyObject,
        layerId,
        metadata
      )
    } catch (error) {
      console.error('Failed to create AddObjectEvent:', error)
      return null
    }
  }
  
  private createRemoveObjectEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager }, metadata: Event['metadata']): Event | null {
    try {
      const object = command.object
      const canvasManager = command.canvasManager
      
      if (!object || !canvasManager) return null
      
      const legacyObject = this.createLegacyObject(object)
      
      return new ObjectRemovedEvent(
        'main',
        legacyObject,
        metadata
      )
    } catch (error) {
      console.error('Failed to create RemoveObjectEvent:', error)
      return null
    }
  }
  
  private createModifyEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): Event | null {
    try {
      const object = command.object
      const canvasManager = command.canvasManager
      const previousState = command.previousState || {}
      const newState = command.modifications || {}
      
      if (!object || !canvasManager) return null
      
      const legacyObject = this.createLegacyObject(object)
      
      return new ObjectModifiedEvent(
        'main',
        legacyObject,
        previousState,
        newState,
        metadata
      )
    } catch (error) {
      console.error('Failed to create ModifyEvent:', error)
      return null
    }
  }
  
  private createTransformEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): Event | null {
    // Transform is a type of modification
    return this.createModifyEvent(command, metadata)
  }
  
  private createCropEvent(command: ICommand & { object?: CanvasObject; canvasManager?: CanvasManager; previousState?: Record<string, unknown>; modifications?: Record<string, unknown> }, metadata: Event['metadata']): Event | null {
    // Crop modifies the object bounds
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
      id: obj.id,
      type: obj.type,
      name: obj.name,
      visible: obj.visible,
      locked: obj.locked,
      opacity: obj.opacity,
      blendMode: obj.blendMode,
      transform: obj.transform,
      left: obj.transform.x,
      top: obj.transform.y,
      angle: obj.transform.rotation,
      layerId: obj.layerId,
      node: obj.node,
      // Add any other properties that might be needed
      set: () => {},
      setCoords: () => {},
      getBoundingRect: () => ({
        left: obj.transform.x,
        top: obj.transform.y,
        width: 100,
        height: 100
      })
    }
  }

  /**
   * Convert KonvaEvents to Fabric-like format for compatibility
   */
  convertKonvaToFabric(obj: CanvasObject): CanvasObject & {
    left: number
    top: number
    angle: number
    set: () => void
    setCoords: () => void
    getBoundingRect: () => { left: number; top: number; width: number; height: number }
  } {
    return {
      ...obj,
      left: obj.transform.x,
      top: obj.transform.y,
      angle: obj.transform.rotation,
      // Remove scaleX as it doesn't exist in CanvasObject
      set: () => {},
      setCoords: () => {},
      getBoundingRect: () => ({
        left: obj.transform.x,
        top: obj.transform.y,
        width: 100, // Default values
        height: 100
      })
    }
  }
} 