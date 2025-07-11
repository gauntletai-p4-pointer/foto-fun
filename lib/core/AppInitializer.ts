import { ServiceContainer } from './ServiceContainer'
import { ResourceManager } from './ResourceManager'

// Type imports for services
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { DocumentSerializer } from '@/lib/editor/persistence/DocumentSerializer'
import type { ExportManager } from '@/lib/editor/export/ExportManager'
// import type { ImageLoaderService } from '@/lib/editor/canvas/services/ImageLoaderService'
// import type { LayerManager } from '@/lib/editor/canvas/services/LayerManager'
// import type { RenderPipeline } from '@/lib/editor/canvas/services/RenderPipeline'

// Event System
import { EventStore } from '@/lib/events/core/EventStore'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import { EventStoreBridge } from '@/lib/events/core/EventStoreBridge'

// Stores
import { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { EventToolStore } from '@/lib/store/tools/EventToolStore'
import { EventLayerStore } from '@/lib/store/layers/EventLayerStore'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { EventColorStore } from '@/lib/store/color/EventColorStore'
import { getHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'
import { ObjectManager } from '@/lib/editor/objects'
import { ObjectStore } from '@/lib/store/objects'

// Managers
import { FontManager } from '@/lib/editor/fonts/FontManager'

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
    container.registerSingleton('TypedEventBus', () => new TypedEventBus())
    
    // Initialize the EventStoreBridge to connect EventStore to TypedEventBus
    container.registerSingleton('EventStoreBridge', () => {
      const bridge = EventStoreBridge.getInstance(
        container.getSync('EventStore'),
        container.getSync('TypedEventBus')
      )
      bridge.start()
      return bridge
    })
    
    // Canvas System - Use async factory for lazy loading
    container.registerSingleton('CanvasManagerFactory', async () => {
      const { CanvasManagerFactory } = await import('@/lib/editor/canvas/CanvasManagerFactory')
      return new CanvasManagerFactory(
        container.getSync('EventStore'),
        container.getSync('ResourceManager')
      )
    })
    
    // Register a placeholder for the active CanvasManager instance
    // This will be set by the Canvas component when it creates the manager
    container.registerSingleton('CanvasManager', () => null)
    
    // Image Loading Services
    container.registerSingleton('ImageLoaderService', async () => {
      const { ImageLoaderService } = await import('@/lib/editor/canvas/services/ImageLoaderService')
      const service = new ImageLoaderService()
      return service
    })
    
    // Layer Manager - Transient that requires CanvasManager
    container.registerTransient('LayerManager', async () => {
      const { LayerManager } = await import('@/lib/editor/canvas/services/LayerManager')
      // This will be called when needed, so CanvasManager should be available by then
      const canvasManager = container.getSync<CanvasManager>('CanvasManager')
      return new LayerManager(canvasManager)
    })
    
    // Render Pipeline - Transient that requires CanvasManager
    container.registerTransient('RenderPipeline', async () => {
      const { RenderPipeline } = await import('@/lib/editor/canvas/services/RenderPipeline')
      // This will be called when needed, so CanvasManager should be available by then
      const canvasManager = container.getSync<CanvasManager>('CanvasManager')
      return new RenderPipeline(canvasManager)
    })
    

    
    // Stores
    container.registerSingleton('CanvasStore', () => 
      new TypedCanvasStore(container.getSync('TypedEventBus'))
    )
    
    container.registerSingleton('ToolStore', () => {
      const store = new EventToolStore(
        container.getSync('EventStore'),
        container.getSync('TypedEventBus')
      )
      // Activate default tool after a short delay to ensure everything is initialized
      setTimeout(() => {
        store.activateTool('move')
      }, 100)
      return store
    })
    
    container.registerSingleton('LayerStore', () => {
      const store = new EventLayerStore(
        container.getSync('EventStore'),
        container.getSync('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    container.registerSingleton('SelectionStore', () => {
      const store = new EventSelectionStore(
        container.getSync('EventStore'),
        container.getSync('TypedEventBus')
      )
      store.initialize()
      return store
    })
    
    // Register ColorStore
    container.registerSingleton('ColorStore', () => {
      const store = new EventColorStore(
        container.getSync('EventStore')
      )
      return store
    })

    // Register ObjectStore
    container.registerSingleton('ObjectStore', () => {
      const store = new ObjectStore(container.getSync('TypedEventBus'))
      return store
    })

    // Register ObjectManager
    container.registerSingleton('ObjectManager', () => {
      return new ObjectManager(
        container.getSync('TypedEventBus'),
        container.getSync('EventStore')
      )
    })

    // Register EventBasedHistoryStore
    container.registerSingleton('HistoryStore', () => {
      return getHistoryStore(
        container.getSync('EventStore'),
        container.getSync('TypedEventBus')
      )
    })
    
    // Font System
    container.registerSingleton('FontManager', () => {
      return FontManager.getInstance()
    })
    
    // Filter System - Use async factory for lazy loading
    container.registerSingleton('WebGLFilterManager', async () => {
      const { WebGLFilterManager } = await import('@/lib/editor/filters/WebGLFilterManager')
      const manager = new WebGLFilterManager(
        container.getSync('EventStore'),
        container.getSync('TypedEventBus'),
        container.getSync('ResourceManager')
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
    
    // History services
    container.registerSingleton('SnapshotManager', async () => {
      const { SnapshotManager } = await import('@/lib/events/history/SnapshotManager')
      return new SnapshotManager(
        container.getSync('EventStore'),
        container.getSync('TypedEventBus')
      )
    })
    
    // Export services
    container.registerSingleton('ExportManager', async () => {
      const { ExportManager } = await import('@/lib/editor/export/ExportManager')
      const canvasManager = container.getSync<CanvasManager | null>('CanvasManager')
      if (!canvasManager) {
        throw new Error('CanvasManager not initialized')
      }
      return new ExportManager(
        canvasManager,
        container.getSync('TypedEventBus')
      )
    })
    
    // Document services
    container.registerSingleton('DocumentSerializer', async () => {
      const { DocumentSerializer } = await import('@/lib/editor/persistence/DocumentSerializer')
      return new DocumentSerializer(
        container.getSync('CanvasManager'),
        container.getSync('DocumentStore'),
        container.getSync('TypedEventBus')
      )
    })
    
    container.registerSingleton('AutoSaveManager', async () => {
      const { AutoSaveManager } = await import('@/lib/editor/autosave/AutoSaveManager')
      const documentSerializer = await container.get<DocumentSerializer>('DocumentSerializer')
      return new AutoSaveManager(
        documentSerializer,
        container.getSync('DocumentStore'),
        container.getSync('TypedEventBus')
      )
    })
    
    container.registerSingleton('RecentFilesManager', async () => {
      const { RecentFilesManager } = await import('@/lib/editor/persistence/RecentFilesManager')
      return new RecentFilesManager(container.getSync('TypedEventBus'))
    })
    
    container.registerSingleton('ShortcutManager', async () => {
      const { ShortcutManager } = await import('@/lib/editor/shortcuts/ShortcutManager')
      const exportManager = await container.get<ExportManager>('ExportManager')
      const documentSerializer = await container.get<DocumentSerializer>('DocumentSerializer')
      return new ShortcutManager(
        container.getSync('DocumentStore'),
        container.getSync('ToolStore'),
        container.getSync('HistoryStore'),
        container.getSync('CanvasManager'),
        exportManager,
        documentSerializer
      )
    })
    
    // Ensure EventStoreBridge is started
    container.getSync('EventStoreBridge')
    
    return container
  }
}

// React integration
import { createContext, useContext, useState, useEffect } from 'react'

export const ServiceContainerContext = createContext<ServiceContainer | null>(null)

export const ServiceContainerProvider = ServiceContainerContext.Provider

export function useService<T>(token: string): T {
  const container = useContext(ServiceContainerContext)
  if (!container) {
    throw new Error('useService must be used within ServiceContainerProvider')
  }
  return container.getSync<T>(token)
}

export function useServiceContainer(): ServiceContainer {
  const container = useContext(ServiceContainerContext)
  if (!container) {
    throw new Error('useServiceContainer must be used within ServiceContainerProvider')
  }
  return container
}

// Async service hook for components that need async services
export function useAsyncService<T>(token: string): { service: T | null; loading: boolean; error: Error | null } {
  const container = useContext(ServiceContainerContext)
  const [state, setState] = useState<{ service: T | null; loading: boolean; error: Error | null }>({
    service: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    if (!container) {
      setState({ service: null, loading: false, error: new Error('No service container') })
      return
    }

    container.get<T>(token)
      .then(service => setState({ service, loading: false, error: null }))
      .catch(error => setState({ service: null, loading: false, error }))
  }, [container, token])

  return state
} 