import { CanvasManager } from './CanvasManager'
import { EventStore } from '@/lib/events/core/EventStore'
import { ResourceManager } from '@/lib/core/ResourceManager'
import { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

/**
 * Factory for creating CanvasManager instances
 * Ensures proper dependency injection and initialization
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
    executionContext?: ExecutionContext
  ): CanvasManager {
    const canvas = new CanvasManager(
      container,
      this.eventStore,
      this.resourceManager,
      executionContext
    )
    
    // Register for cleanup
    this.resourceManager.register(`canvas-${canvas.konvaStage.id()}`, {
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