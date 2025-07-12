import { ServiceContainer } from './ServiceContainer'
import { ResourceManager } from './ResourceManager'

// Type imports for services
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

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
import { ToolFactory } from '@/lib/editor/tools/base/ToolFactory'
import { ModelPreferencesManager } from '@/lib/settings/ModelPreferences'
import { FeatureManager } from '@/lib/config/features'
import { CommandManager } from '@/lib/editor/commands/CommandManager'
import { ServiceCommandFactory } from '@/lib/editor/commands/base/CommandFactory'
import { SelectionContextManager } from '@/lib/editor/selection/SelectionContextManager'
import { ClipboardManager } from '@/lib/editor/clipboard/ClipboardManager'

// Tools
// STUB: More tools to be registered here

// AI System
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import { AdapterFactory } from '@/lib/ai/adapters/base/AdapterFactory'
import { ParameterConverter } from '@/lib/ai/adapters/base/ParameterConverter'
import { createAdapterRegistry } from '@/lib/ai/adapters/registry'

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
      
      container.registerSingleton('SelectionStore', () => 
        new EventSelectionStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('ColorStore', () => 
        new EventColorStore(
          container.getSync('EventStore')
        ), {
        dependencies: ['EventStore'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('ObjectStore', () => 
        new ObjectStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('ObjectManager', () => 
        new ObjectManager(
          'default', // canvasId
          container.getSync('TypedEventBus'),
          container.getSync('EventStore')
        ), {
        dependencies: ['TypedEventBus', 'EventStore'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('ProjectStore', () => 
        new EventProjectStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { autoSave: true, versionControl: true, autoSaveInterval: 30000 }
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('HistoryStore', () => 
        new EventBasedHistoryStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('TextStore', () => 
        new EventTextStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { persistence: true, validation: true, maxRecentFonts: 10 }
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // Font System
      container.registerSingleton('FontManager', () => 
        new FontManager(
          container.getSync('TypedEventBus'),
          { preload: true, caching: true }
        ), {
        dependencies: ['TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // Tool System - ToolRegistry first
      container.registerSingleton('ToolRegistry', async () => {
        const { ToolRegistry } = await import('@/lib/editor/tools/base/ToolRegistry')
        const { registerUIToolGroups } = await import('@/lib/editor/tools/groups/toolGroups')
        
        const registry = new ToolRegistry()
        
        // Register UI tool groups
        registerUIToolGroups(registry)
        console.log('[AppInitializer] Registered UI tool groups')
        
        // Register individual tools
        // registry.registerToolClass(
        //   'move',
        //   MoveTool,
        //   {
        //     id: 'move',
        //     name: 'Move',
        //     description: 'Move, rotate, and scale objects',
        //     category: 'transform',
        //     groupId: 'selection',
        //     icon: require('@/components/editor/icons/MoveToolIcon').default,
        //     cursor: 'move',
        //     priority: 1
        //   }
        // )
        
        return registry
      }, {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      // Tool System - ToolFactory with pure DI
      container.registerSingleton('ToolFactory', () => 
        new ToolFactory(container, container.getSync('ToolRegistry')), {
        dependencies: ['ToolRegistry'], // ToolFactory gets container directly for service resolution
        phase: 'infrastructure'
      })
      
      // AI Model Preferences
      container.registerSingleton('ModelPreferencesManager', () => 
        new ModelPreferencesManager(), {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      // Feature Management
      container.registerSingleton('FeatureManager', () => 
        new FeatureManager(), {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      // Command System
      container.registerSingleton('CommandManager', () => 
        new CommandManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          container.getSync('HistoryStore')
        ), {
        dependencies: ['EventStore', 'TypedEventBus', 'HistoryStore'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('CommandFactory', () =>
        new ServiceCommandFactory(container), {
        dependencies: [], // Gets container directly
        phase: 'infrastructure'
      })

      // Selection Context System
      container.registerSingleton('SelectionContextManager', () => 
        new SelectionContextManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { persistence: true, optimization: true }
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      // Clipboard System
      container.registerSingleton('ClipboardManager', () => 
        new ClipboardManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          { persistence: true, validation: true, systemClipboard: true }
        ), {
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
      
      // AI Adapter System
      container.registerSingleton('ParameterConverter', () => 
        new ParameterConverter(), {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('AdapterFactory', () => 
        new AdapterFactory(container), {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('AdapterRegistry', () => 
        createAdapterRegistry(container), {
        dependencies: ['AdapterFactory'],
        phase: 'infrastructure'
      })
      
      // Initialize infrastructure services
      await container.get('EventStoreBridge')
      await container.get('CanvasStore')
      await container.get('SelectionStore')
      await container.get('ColorStore')
      await container.get('ObjectStore')
      await container.get('ObjectManager')
      await container.get('ProjectStore')
      await container.get('HistoryStore')
      await container.get('FontManager')
      await container.get('ToolFactory')
      await container.get('ModelPreferencesManager')
      await container.get('FeatureManager')
      await container.get('CommandManager')
      await container.get('CommandFactory')
      await container.get('SelectionContextManager')
      await container.get('ClipboardManager')
      await container.get('WebGLFilterEngine')
      await container.get('ToolExecutor')
      await container.get('ParameterConverter')
      await container.get('AdapterFactory')
      await container.get('AdapterRegistry')
      
      // Phase 3: Application Services (Services that depend on canvas or user interaction)
      container.setInitializationPhase('application')
      console.log('[AppInitializer] Registering application services...')
      
      // Tool Store - Now with proper dependencies (deferred to application phase)
      // Note: ToolStore requires CanvasManager which is set by Canvas component
      container.registerSingleton('ToolStore', async () => {
        console.log('[AppInitializer] Creating ToolStore with all dependencies...')
        const store = new EventToolStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          container.getSync('ToolFactory'),
          container.getSync('ToolRegistry'),
          container.getSync('CanvasManager') // This will be set by Canvas component
        )
        
        // Register core tools
        console.log('[AppInitializer] Registering core tools...')
        
        // Register Agent 1 tools (Transform & Navigation)
        const _toolRegistry = container.getSync<import('@/lib/editor/tools/base/ToolRegistry').ToolRegistry>('ToolRegistry');
        
        // Register tool groups first
        const { registerUIToolGroups } = await import('@/lib/editor/tools/groups/toolGroups')
        registerUIToolGroups(_toolRegistry)
        
        // Register MoveTool
        const { MoveTool, moveToolMetadata } = await import('@/lib/editor/tools/transform/MoveTool')
        _toolRegistry.registerToolClass('move', MoveTool, moveToolMetadata)
        
        console.log('[AppInitializer] Agent 1 tools registered successfully')
        
        // Activate default tool (MoveTool)
        try {
          await store.activateTool('move')
          console.log('[AppInitializer] MoveTool activated as default')
        } catch (error) {
          console.warn('[AppInitializer] Failed to activate default tool:', error)
        }
        
        return store
      }, {
        dependencies: ['EventStore', 'TypedEventBus', 'ToolFactory', 'ToolRegistry', 'CanvasManager'],
        phase: 'application'
      })
      
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