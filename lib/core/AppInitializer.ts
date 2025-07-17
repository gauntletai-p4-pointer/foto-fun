import { ServiceContainer } from './ServiceContainer'
import { ResourceManager } from './ResourceManager'

// Type imports for services
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { ToolRegistry } from '@/lib/editor/tools/base/ToolRegistry'

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
import { EventToolOptionsStore } from '@/lib/store/tools/EventToolOptionsStore'

// Managers
import { FontManager } from '@/lib/editor/fonts/FontManager'
import { CommandManager } from '@/lib/editor/commands/CommandManager'
import { ServiceCommandFactory } from '@/lib/editor/commands/base/CommandFactory'
import { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import { ToolFactory } from '@/lib/editor/tools/base/ToolFactory'
import { registerCoreTools } from '@/lib/editor/tools/registration'


// AI System
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
      
      // Command System
      container.registerSingleton('CommandFactory', () => 
        new ServiceCommandFactory(container), {
        dependencies: [], // Dependencies are resolved within the factory from the container
        phase: 'infrastructure'
      })

      container.registerSingleton('CommandManager', () => 
        new CommandManager(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus'),
          container.getSync('HistoryStore'),
          { validation: true, metrics: true }
        ), {
        dependencies: ['EventStore', 'TypedEventBus', 'HistoryStore'],
        phase: 'infrastructure'
      })

      container.registerSingleton('SelectionManager', () =>
        new SelectionManager(
          container.getSync('CanvasManager'),
          container.getSync('TypedEventBus')
        ), {
        dependencies: ['CanvasManager', 'TypedEventBus'],
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
        
        // Register all core tools
        registerCoreTools(registry)

        return registry
      }, {
        dependencies: [],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('ToolOptionsStore', () => 
        new EventToolOptionsStore(
          container.getSync('EventStore'),
          container.getSync('TypedEventBus')
        ), {
        dependencies: ['EventStore', 'TypedEventBus'],
        phase: 'infrastructure'
      })
      
      container.registerSingleton('ToolFactory', async () => {
        const registry = await container.get<ToolRegistry>('ToolRegistry');
        return new ToolFactory(container, registry);
      }, {
        dependencies: ['ToolRegistry'],
        phase: 'application'
      })
      
      container.registerSingleton('ToolStore', async () => {
        const eventBus = container.getSync<TypedEventBus>('TypedEventBus');
        const toolFactory = await container.get<ToolFactory>('ToolFactory');
        const toolRegistry = await container.get<ToolRegistry>('ToolRegistry');
        const canvasManager = container.getSync<CanvasManager>('CanvasManager'); // This might be null initially
        
        const store = new EventToolStore(
          container.getSync('EventStore'),
          eventBus,
          toolFactory,
          toolRegistry,
          canvasManager
        );
        
        // Listen for tool activation requests
        eventBus.on('tool.activation.requested', ({ toolId }) => {
          store.activateTool(toolId).catch(console.error);
        });
        
        return store;
      }, {
        dependencies: ['TypedEventBus', 'ToolFactory', 'ToolRegistry', 'CanvasManager'],
        phase: 'application'
      })

      // Phase 3: AI Services
      container.setInitializationPhase('application')
      console.log('[AppInitializer] Initializing AI services...')
      
      container.registerSingleton('ParameterConverter', () => new ParameterConverter(), {
        dependencies: [],
        phase: 'application'
      })
      
      container.registerSingleton('AdapterFactory', () => 
        new AdapterFactory(
          container
        ), {
        dependencies: [],
        phase: 'application'
      })

      container.registerSingleton('AdapterRegistry', () => 
        createAdapterRegistry(container), {
        dependencies: ['AdapterFactory'],
        phase: 'application'
      })
      
      // Initialize core services
      await container.get('ToolRegistry')
      await container.get('ToolFactory')
      await container.get('ToolStore')
      await container.get('AdapterRegistry')
      
      container.setInitializationPhase('complete')
      console.log('[AppInitializer] Initialization complete.')

    } catch (error) {
      console.error('Application initialization failed:', error)
      // Optionally re-throw or handle the error
      throw error
    }
    
    return container
  }
}

// React hooks for easy service access in components

import { createContext, useContext, useEffect, useState } from 'react'

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