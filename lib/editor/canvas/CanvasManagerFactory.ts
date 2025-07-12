import { CanvasManager } from './CanvasManager'
import { EventStore } from '@/lib/events/core/EventStore'
import { ResourceManager } from '@/lib/core/ResourceManager'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
// ObjectManager is now created internally by CanvasManager
import { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import { ServiceContainer } from '@/lib/core/ServiceContainer'

/**
 * Factory for creating CanvasManager instances
 * Creates object-based CanvasManager implementation
 */
export class CanvasManagerFactory {
  constructor(
    private eventStore: EventStore,
    private resourceManager: ResourceManager,
    private serviceContainer: ServiceContainer
  ) {}

  /**
   * Create a new CanvasManager instance
   */
  create(
    container: HTMLDivElement,
    _executionContext?: ExecutionContext
  ): CanvasManager {
    // Get services from injected container (not singleton)
    const typedEventBus = this.serviceContainer.getSync<TypedEventBus>('TypedEventBus')
    
    // Create CanvasManager which implements our new object-based architecture
    // ObjectManager is now created internally by CanvasManager
    const canvas = new CanvasManager(
      container,
      typedEventBus,
      this.eventStore,
      this.resourceManager
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