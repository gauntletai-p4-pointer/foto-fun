import { ServiceContainer } from './ServiceContainer'
import { ResourceManager } from './ResourceManager'

// Event System
import { EventStore } from '@/lib/events/core/EventStore'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'

// Stores
import { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { EventLayerStore } from '@/lib/store/layers/EventLayerStore'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { EventDocumentStore } from '@/lib/store/document/EventDocumentStore'
import { EventColorStore } from '@/lib/store/color/EventColorStore'
import { useEventHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'

// Canvas System
import { CanvasManagerFactory } from '@/lib/editor/canvas/CanvasManagerFactory'

// Managers
import { FontManager } from '@/lib/editor/fonts/FontManager'
import { WebGLFilterManager } from '@/lib/editor/filters/WebGLFilterManager'

// AI System
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'

/**
 * Application initializer
 * Sets up the dependency injection container with all services
 */
export class AppInitializer {
  static async initialize(): Promise<ServiceContainer> {
    const container = new ServiceContainer()
    
    // Core Services
    container.registerSingleton('ResourceManager', () => new ResourceManager())
    
    // Event System - Use singleton instance
    container.registerSingleton('EventStore', () => EventStore.getInstance())
    container.registerSingleton('TypedEventBus', () => getTypedEventBus())
    
    // Canvas System
    container.registerSingleton('CanvasManagerFactory', () => {
      return new CanvasManagerFactory(
        container.get('EventStore'),
        container.get('ResourceManager')
      )
    })
    
    // Stores
    container.registerSingleton('CanvasStore', () => 
      new TypedCanvasStore(container.get('TypedEventBus'))
    )
    
    container.registerSingleton('ToolStore', () => {
      return new EventToolStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
    })
    
    container.registerSingleton('LayerStore', () => {
      const store = new EventLayerStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    container.registerSingleton('SelectionStore', () => {
      const store = new EventSelectionStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    container.registerSingleton('DocumentStore', () => {
      const store = new EventDocumentStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    // Register ColorStore
    container.registerSingleton('ColorStore', () => {
      const store = new EventColorStore(
        container.get('EventStore')
      )
      return store
    })

    // Register EventBasedHistoryStore
    container.registerSingleton('HistoryStore', () => {
      return useEventHistoryStore
    })
    
    // Font System
    container.registerSingleton('FontManager', () => {
      return FontManager.getInstance()
    })
    
    // Filter System
    container.registerSingleton('WebGLFilterManager', () => {
      const manager = new WebGLFilterManager(
        container.get('EventStore'),
        container.get('TypedEventBus'),
        container.get('ResourceManager')
      )
      // Initialize asynchronously but don't block
      manager.initialize().catch((error: Error) => {
        console.error('[AppInitializer] Failed to initialize WebGLFilterManager:', error)
      })
      return manager
    })
    
    // AI System
    container.registerSingleton('ToolExecutor', () => {
      return ClientToolExecutor
    })
    
    return container
  }
}

// React integration
import { createContext, useContext } from 'react'

const ServiceContainerContext = createContext<ServiceContainer | null>(null)

export const ServiceContainerProvider = ServiceContainerContext.Provider

export function useService<T>(token: string): T {
  const container = useContext(ServiceContainerContext)
  if (!container) {
    throw new Error('useService must be used within ServiceContainerProvider')
  }
  return container.get<T>(token)
} 