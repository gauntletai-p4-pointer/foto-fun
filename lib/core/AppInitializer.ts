import { ServiceContainer } from './ServiceContainer'
import { ResourceManager } from './ResourceManager'

// Event System
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus, getTypedEventBus } from '@/lib/events/core/TypedEventBus'

// Stores
import { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'

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
      const CanvasManagerFactory = require('@/lib/editor/canvas/CanvasManagerFactory').CanvasManagerFactory
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
      const EventToolStore = require('@/lib/store/tools/EventToolStore').EventToolStore
      return new EventToolStore(container.get('EventStore'))
    })
    
    container.registerSingleton('LayerStore', () => {
      const EventLayerStore = require('@/lib/store/layers/EventLayerStore').EventLayerStore
      const store = new EventLayerStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    container.registerSingleton('SelectionStore', () => {
      const EventSelectionStore = require('@/lib/store/selection/EventSelectionStore').EventSelectionStore
      const store = new EventSelectionStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    container.registerSingleton('DocumentStore', () => {
      const EventDocumentStore = require('@/lib/store/document/EventDocumentStore').EventDocumentStore
      const store = new EventDocumentStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    // Register ColorStore
    container.registerSingleton('ColorStore', () => {
      const { EventColorStore } = require('@/lib/store/color/EventColorStore')
      const store = new EventColorStore(
        container.get('EventStore'),
        container.get('TypedEventBus')
      )
      store.initialize()
      return store
    })

    // Register EventBasedHistoryStore
    container.registerSingleton('HistoryStore', () => {
      const { EventBasedHistoryStore } = require('@/lib/events/history/EventBasedHistoryStore')
      const store = new EventBasedHistoryStore(
        container.get('EventStore')
      )
      return store
    })
    
    // Selection System
    container.registerSingleton('SelectionManager', () => {
      const SelectionManager = require('@/lib/editor/selection/SelectionManager').SelectionManager
      return new SelectionManager()
    })
    
    // Font System
    container.registerSingleton('FontManager', () => {
      const FontManager = require('@/lib/editor/fonts/FontManager').FontManager
      return FontManager.getInstance()
    })
    
    // Clipboard System
    container.registerSingleton('ClipboardManager', () => {
      const ClipboardManager = require('@/lib/editor/clipboard/ClipboardManager').ClipboardManager
      return new ClipboardManager()
    })
    
    // Filter System
    container.registerSingleton('WebGLFilterManager', () => {
      const WebGLFilterManager = require('@/lib/editor/filters/WebGLFilterManager').WebGLFilterManager
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
      const ToolExecutor = require('@/lib/ai/client/tool-executor').ToolExecutor
      return new ToolExecutor()
    })
    
    // Performance Monitoring
    container.registerSingleton('PerformanceMonitor', () => {
      const PerformanceMonitor = require('@/lib/editor/performance/PerformanceMonitor').PerformanceMonitor
      return PerformanceMonitor.getInstance()
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