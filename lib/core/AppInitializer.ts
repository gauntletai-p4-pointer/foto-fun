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

import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { EventColorStore } from '@/lib/store/color/EventColorStore'
import { getHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'
import { ObjectManager } from '@/lib/editor/objects'
import { ObjectStore } from '@/lib/store/objects'
import { getEventDocumentStore } from '@/lib/store/document/EventDocumentStore'

// Managers
import { FontManager } from '@/lib/editor/fonts/FontManager'

// AI System
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'

/**
 * Application initializer
 * Sets up the dependency injection container with all services in proper phases
 */
export class AppInitializer {
  static async initialize(): Promise<ServiceContainer> {
    const container = new ServiceContainer()
    
    try {
      // Phase 1: Core Services (EventStore, TypedEventBus, ResourceManager)
      container.setInitializationPhase('core')
      console.log('[AppInitializer] Initializing core services...')
      
      container.registerSingleton('ResourceManager', () => new ResourceManager(), {
        dependencies: [],
        phase: 'core'
      })
      
      container.registerSingleton('EventStore', () => EventStore.getInstance(), {
        dependencies: [],
        phase: 'core'
      })
      
      container.registerSingleton('TypedEventBus', () => new TypedEventBus(), {
        dependencies: [],
        phase: 'core'
      })
      
      // Initialize core services immediately to ensure they're available
      await container.get('ResourceManager')
      await container.get('EventStore')
      await container.get('TypedEventBus')
      
      // Phase 2: Infrastructure Services (Bridges, Stores, Managers)
      container.setInitializationPhase('infrastructure')
      console.log('[AppInitializer] Initializing infrastructure services...')
      
      // Initialize the EventStoreBridge to connect EventStore to TypedEventBus
      container.registerSingleton('EventStoreBridge', () => {
        const bridge = EventStoreBridge.getInstance(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
        bridge.start()
        return bridge
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
             // Canvas System - Use async factory for lazy loading
       container.registerSingleton('CanvasManagerFactory', async () => {
         const { CanvasManagerFactory } = await import('@/lib/editor/canvas/CanvasManagerFactory')
         return new CanvasManagerFactory(
           container.getSync('EventStore'),
           container.getSync('ResourceManager'),
           container // Pass the service container for dependency injection
         )
       }, {
         dependencies: ['EventStore', 'ResourceManager'],
         phase: 'infrastructure'
       })
      
      // Register a placeholder for the active CanvasManager instance
      // This will be set by the Canvas component when it creates the manager
      container.registerSingleton('CanvasManager', () => null, {
        dependencies: [],
        phase: 'application'
      })
      
      // Image Loading Services
      container.registerSingleton('ImageLoaderService', async () => {
        const { ImageLoaderService } = await import('@/lib/editor/canvas/services/ImageLoaderService')
        const service = new ImageLoaderService()
        return service
      }, {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      // Stores
      container.registerSingleton('CanvasStore', () => 
        new TypedCanvasStore(container.getSync('TypedEventBus')), {
        dependencies: ['TypedEventBus'],
        phase: 'infrastructure'
      })
      
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
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('SelectionStore', () => {
        const store = new EventSelectionStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
        store.initialize()
        return store
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // Register ColorStore
      container.registerSingleton('ColorStore', () => {
        const store = new EventColorStore(
          container.getSync('EventStore')
        )
        return store
      }, {
        dependencies: ['EventStore'],
        phase: 'infrastructure'
      })

      // Register ObjectStore
      container.registerSingleton('ObjectStore', () => {
        const store = new ObjectStore(container.getSync('TypedEventBus'))
        return store
      }, {
        dependencies: ['TypedEventBus'],
        phase: 'infrastructure'
      })

      // Register ObjectManager
      container.registerSingleton('ObjectManager', () => {
        return new ObjectManager(
          container.getSync('TypedEventBus'),
          container.getSync('EventStore')
        )
      }, {
        dependencies: ['TypedEventBus', 'EventStore'],
        phase: 'infrastructure'
      })

      // Register DocumentStore
      container.registerSingleton('DocumentStore', () => {
        return getEventDocumentStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })

      // Register EventBasedHistoryStore
      container.registerSingleton('HistoryStore', () => {
        return getHistoryStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // Font System
      container.registerSingleton('FontManager', () => {
        return FontManager.getInstance()
      }, {
        dependencies: [],
        phase: 'infrastructure'
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
      }, {
        dependencies: ['EventStore', 'TypedEventBus', 'ResourceManager'],
        phase: 'infrastructure'
      })
      
      // AI System
      container.registerSingleton('ToolExecutor', () => {
        return ClientToolExecutor
      }, {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      // Initialize infrastructure services
      await container.get('EventStoreBridge')
      await container.get('CanvasStore')
      await container.get('ToolStore')
      await container.get('SelectionStore')
      await container.get('ColorStore')
      await container.get('ObjectStore')
      await container.get('ObjectManager')
      await container.get('DocumentStore')
      await container.get('HistoryStore')
      await container.get('FontManager')
      await container.get('ToolExecutor')
      
      // Phase 3: Application Services (Services that depend on canvas or user interaction)
      container.setInitializationPhase('application')
      console.log('[AppInitializer] Registering application services...')
      
      // History services
      container.registerSingleton('SnapshotManager', async () => {
        const { SnapshotManager } = await import('@/lib/events/history/SnapshotManager')
        return new SnapshotManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'application'
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
      }, {
        dependencies: ['CanvasManager', 'TypedEventBus'],
        phase: 'application'
      })
      
      // Document services
      container.registerSingleton('DocumentSerializer', async () => {
        const { DocumentSerializer } = await import('@/lib/editor/persistence/DocumentSerializer')
        return new DocumentSerializer(
          container.getSync('CanvasManager'),
          container.getSync('DocumentStore'),
          container.getSync('TypedEventBus')
        )
      }, {
        dependencies: ['CanvasManager', 'DocumentStore', 'TypedEventBus'],
        phase: 'application'
      })
      
      container.registerSingleton('AutoSaveManager', async () => {
        const { AutoSaveManager } = await import('@/lib/editor/autosave/AutoSaveManager')
        const documentSerializer = await container.get<DocumentSerializer>('DocumentSerializer')
        return new AutoSaveManager(
          documentSerializer,
          container.getSync('DocumentStore'),
          container.getSync('TypedEventBus')
        )
      }, {
        dependencies: ['DocumentSerializer', 'DocumentStore', 'TypedEventBus'],
        phase: 'application'
      })
      
      container.registerSingleton('RecentFilesManager', async () => {
        const { RecentFilesManager } = await import('@/lib/editor/persistence/RecentFilesManager')
        return new RecentFilesManager(container.getSync('TypedEventBus'))
      }, {
        dependencies: ['TypedEventBus'],
        phase: 'application'
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
      }, {
        dependencies: ['DocumentStore', 'ToolStore', 'HistoryStore', 'CanvasManager', 'ExportManager', 'DocumentSerializer'],
        phase: 'application'
      })
      
      // Mark initialization as complete
      container.setInitializationPhase('complete')
      console.log('[AppInitializer] Initialization complete')
      
      return container
    } catch (error) {
      console.error('[AppInitializer] Initialization failed:', error)
      throw error
    }
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