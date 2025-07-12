import { CanvasManager } from './CanvasManager'
import { EventStore } from '@/lib/events/core/EventStore'
import { ResourceManager } from '@/lib/core/ResourceManager'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { ObjectManager } from '@/lib/editor/objects/ObjectManager'
import { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { ServiceContainer } from '@/lib/core/ServiceContainer'

/**
 * Factory for creating CanvasManager instances
 * Creates object-based CanvasManager implementation
 */
export class CanvasManagerFactory {
  constructor(
    private eventStore: EventStore,
    private resourceManager: ResourceManager
  ) {}

  /**
   * Create a new CanvasManager instance
   */
  create(
    container: HTMLDivElement,
    _executionContext?: ExecutionContext
  ): CanvasManager {
    // Get services from container
    const serviceContainer = ServiceContainer.getInstance()
    const typedEventBus = serviceContainer.getSync<TypedEventBus>('TypedEventBus')
    const objectManager = serviceContainer.getSync<ObjectManager>('ObjectManager')
    
    // Create CanvasManager which implements our new object-based architecture
    const canvas = new CanvasManager(
      container,
      typedEventBus,
      objectManager
    )
    
    // Register for cleanup
    this.resourceManager.register(`canvas-${canvas.stage.id()}`, {
      dispose: () => canvas.destroy()
    })
    
    return canvas
  }
  
  /**
   * Create a canvas manager with a new execution context
   */
  createWithContext(
    container: HTMLDivElement,
    _metadata: Record<string, unknown>
  ): { canvas: CanvasManager; context: ExecutionContext | null } {
    // Note: ExecutionContext requires a canvas and selection snapshot
    // For now, we'll create the canvas first, then the context can be created separately
    // This is because ExecutionContext needs to be refactored for the new architecture
    const canvas = this.create(container)
    
    // ExecutionContext will need to be refactored to work with Konva
    // For now, return null context
    return { canvas, context: null }
  }
} 