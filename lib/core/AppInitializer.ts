import { ServiceContainer } from './ServiceContainer'
import { ResourceManager } from './ResourceManager'

// Type imports for services
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { ProjectSerializer } from '@/lib/editor/persistence/ProjectSerializer'
import type { ExportManager } from '@/lib/editor/export/ExportManager'
// import type { ImageLoaderService } from '@/lib/editor/canvas/services/ImageLoaderService'
// import type { ObjectManager } from '@/lib/editor/canvas/services/ObjectManager'
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
import { EventBasedHistoryStore } from '@/lib/events/history/EventBasedHistoryStore'
import { ObjectManager } from '@/lib/editor/objects'
import { ObjectStore } from '@/lib/store/objects'
import { EventProjectStore } from '@/lib/store/project/EventProjectStore'
import { EventTextStore } from '@/lib/store/text/EventTextStore'

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
      
      container.registerSingleton('EventStore', () => {
        return new EventStore({
          persistence: true,
          indexing: true,
          compression: true,
          maxEvents: 10000,
          snapshotInterval: 1000,
          batchSize: 50
        })
      }, {
        dependencies: [],
        phase: 'core'
      })
      
      container.registerSingleton('TypedEventBus', () => {
        return new TypedEventBus({
          maxListeners: 1000,
          errorHandling: 'log',
          metrics: true,
          debugging: false
        })
      }, {
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
        const eventStore = container.getSync<EventStore>('EventStore')
        const eventBus = container.getSync<TypedEventBus>('TypedEventBus')
        const bridge = new EventStoreBridge(eventStore, eventBus, {
          debugging: false,
          errorHandling: 'log'
        })
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
        new TypedCanvasStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('ToolStore', () => {
        const store = new EventToolStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
        // Activate default tool immediately - no setTimeout hack needed
        store.activateTool('move')
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
        const store = new ObjectStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
        return store
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
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

      // Register ProjectStore
      container.registerSingleton('ProjectStore', () => {
        return new EventProjectStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { autoSave: true, versionControl: true, autoSaveInterval: 30000 }
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })

      // Register EventBasedHistoryStore
      container.registerSingleton('HistoryStore', () => {
        return new EventBasedHistoryStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })

      // Register TextStore
      container.registerSingleton('TextStore', () => {
        return new EventTextStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { persistence: true, validation: true, maxRecentFonts: 10 }
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // Font System
      container.registerSingleton('FontManager', () => {
        return new FontManager(
          container.getSync('TypedEventBus'),
          { preload: true, caching: true }
        )
      }, {
        dependencies: ['TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // AI Model Preferences
      container.registerSingleton('ModelPreferencesManager', () => {
        const { ModelPreferencesManager } = require('@/lib/settings/ModelPreferences')
        return new ModelPreferencesManager()
      }, {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      // Feature Management
      container.registerSingleton('FeatureManager', () => {
        const { FeatureManager } = require('@/lib/config/features')
        return new FeatureManager()
      }, {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      // Command System
      container.registerSingleton('CommandManager', () => {
        const { CommandManager } = require('@/lib/editor/commands/CommandManager')
        return new CommandManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          container.getSync('HistoryStore'),
          { validation: true, middleware: true, metrics: true }
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus', 'HistoryStore'],
        phase: 'infrastructure'
      })
      
      // Selection Context System
      container.registerSingleton('SelectionContextManager', () => {
        const { SelectionContextManager } = require('@/lib/editor/selection/SelectionContextManager')
        return new SelectionContextManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { persistence: true, optimization: true }
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // Clipboard System
      container.registerSingleton('ClipboardManager', () => {
        const { ClipboardManager } = require('@/lib/editor/clipboard/ClipboardManager')
        return new ClipboardManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { persistence: true, validation: true, systemClipboard: true }
        )
      }, {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // WebGL Filter System
      container.registerSingleton('WebGLFilterEngine', async () => {
        const { WebGLFilterEngine } = await import('@/lib/editor/filters/WebGLFilterEngine')
        const engine = new WebGLFilterEngine(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          container.getSync('ResourceManager'),
          { optimization: true, caching: true }
        )
        // Initialize asynchronously but don't block
        engine.initializeWebGL().catch((error: Error) => {
          console.error('[AppInitializer] Failed to initialize WebGLFilterEngine:', error)
        })
        return engine
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
      await container.get('ProjectStore')
      await container.get('HistoryStore')
      await container.get('FontManager')
      await container.get('ModelPreferencesManager')
      await container.get('FeatureManager')
      await container.get('CommandManager')
      await container.get('SelectionContextManager')
      await container.get('ClipboardManager')
      await container.get('WebGLFilterEngine')
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
      
              // Project services
        container.registerSingleton('ProjectSerializer', async () => {
          const { ProjectSerializer } = await import('@/lib/editor/persistence/ProjectSerializer')
          return new ProjectSerializer(
            container.getSync('TypedEventBus'),
            container.getSync('ProjectStore')
          )
        }, {
          dependencies: ['TypedEventBus', 'ProjectStore'],
          phase: 'application'
        })
      
      container.registerSingleton('AutoSaveManager', async () => {
        const { AutoSaveManager } = await import('@/lib/editor/autosave/AutoSaveManager')
        return new AutoSaveManager(
          container.getSync('TypedEventBus'),
          container.getSync('ProjectStore')
        )
      }, {
        dependencies: ['TypedEventBus', 'ProjectStore'],
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
        return new ShortcutManager(
          container.getSync('TypedEventBus'),
          container.getSync('ProjectStore'),
          container
        )
      }, {
        dependencies: ['TypedEventBus', 'ProjectStore'],
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