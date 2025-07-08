# Epic 13: Plugin & Extension System

## Overview
This epic implements a comprehensive plugin system for FotoFun, allowing developers to extend functionality through a well-defined API. The system will support both self-hosted and cloud deployments, with cloud users having access to a plugin marketplace.

## Goals
1. **Plugin architecture** - Secure, sandboxed plugin execution
2. **Plugin API** - Well-defined interfaces for canvas, tools, and UI
3. **Plugin management** - Install, update, remove plugins
4. **Developer tools** - Plugin development kit and documentation
5. **Marketplace** - Discovery and distribution (cloud version)

## Current State Analysis

### Existing Foundation
- **Tool System**: Adapter pattern in `lib/ai/adapters/` provides a model
- **Tool Registry**: `lib/ai/adapters/registry.ts` shows registration patterns
- **Canvas Tools**: Well-defined tool interfaces in `lib/editor/tools/`
- **UI Components**: Modular panel system in `components/editor/Panels/`
- **No plugin system** currently exists

### Leverageable Patterns
- Tool adapter pattern can be extended for plugin tools
- Registry pattern can manage plugin lifecycle
- Command pattern enables plugin actions to be undoable

## Technical Approach

### Phase 1: Plugin Architecture

#### Plugin Interface (following existing tool patterns):

```typescript
// lib/plugins/types.ts
import type { Tool } from '@/types'
import type { BaseToolAdapter } from '@/lib/ai/adapters/base'
import type { FC } from 'react'

export interface PluginManifest {
  // Metadata
  id: string
  name: string
  version: string
  author: string
  description: string
  homepage?: string
  repository?: string
  
  // Compatibility
  minAppVersion: string
  maxAppVersion?: string
  
  // Permissions required
  permissions: PluginPermission[]
  
  // Entry points
  main: string // Main plugin file
  icon?: string // Plugin icon
}

export interface PluginPermission {
  type: 'canvas' | 'file' | 'network' | 'storage' | 'ui'
  access: 'read' | 'write' | 'execute'
  scope?: string // Specific scope within type
}

export interface FotoFunPlugin {
  // Lifecycle hooks
  onLoad?: () => Promise<void>
  onUnload?: () => Promise<void>
  onActivate?: () => Promise<void>
  onDeactivate?: () => Promise<void>
  
  // Tool contributions (following existing patterns)
  tools?: PluginTool[]
  aiAdapters?: BaseToolAdapter[]
  
  // UI contributions
  panels?: PluginPanel[]
  menuItems?: PluginMenuItem[]
  statusBarItems?: PluginStatusBarItem[]
  
  // Event handlers
  eventHandlers?: PluginEventHandler[]
  
  // Commands (following command pattern)
  commands?: PluginCommand[]
}

export interface PluginTool extends Tool {
  pluginId: string
  // Additional plugin-specific properties
}

export interface PluginPanel {
  id: string
  title: string
  icon: string
  component: FC<PluginPanelProps>
  position?: 'left' | 'right' | 'bottom'
}
```

### Phase 2: Plugin Runtime

Create plugin runtime following existing patterns:

```typescript
// lib/plugins/runtime/PluginRuntime.ts
import { create } from 'zustand'
import type { FotoFunPlugin, PluginManifest } from '../types'

interface PluginRuntimeState {
  // Loaded plugins
  plugins: Map<string, LoadedPlugin>
  
  // Plugin states
  activePlugins: Set<string>
  
  // Actions
  loadPlugin: (manifest: PluginManifest, code: string) => Promise<void>
  unloadPlugin: (pluginId: string) => Promise<void>
  activatePlugin: (pluginId: string) => Promise<void>
  deactivatePlugin: (pluginId: string) => Promise<void>
  
  // Plugin API access
  getPluginApi: (pluginId: string) => PluginAPI
}

interface LoadedPlugin {
  manifest: PluginManifest
  instance: FotoFunPlugin
  sandbox: PluginSandbox
  status: 'loaded' | 'active' | 'error'
  error?: Error
}

// Plugin store following existing store patterns
export const usePluginStore = create<PluginRuntimeState>((set, get) => ({
  plugins: new Map(),
  activePlugins: new Set(),
  
  loadPlugin: async (manifest, code) => {
    // Create sandboxed environment
    const sandbox = new PluginSandbox(manifest)
    
    try {
      // Load plugin in sandbox
      const instance = await sandbox.loadPlugin(code)
      
      // Validate plugin
      validatePlugin(instance, manifest)
      
      // Register plugin
      const loadedPlugin: LoadedPlugin = {
        manifest,
        instance,
        sandbox,
        status: 'loaded'
      }
      
      set(state => ({
        plugins: new Map(state.plugins).set(manifest.id, loadedPlugin)
      }))
      
      // Call onLoad hook
      await instance.onLoad?.()
      
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error)
      throw error
    }
  },
  
  // ... other methods
}))
```

### Phase 3: Plugin Sandbox

Secure sandbox for plugin execution:

```typescript
// lib/plugins/runtime/PluginSandbox.ts
export class PluginSandbox {
  private worker: Worker | null = null
  private iframe: HTMLIFrameElement | null = null
  private permissions: Set<string>
  
  constructor(private manifest: PluginManifest) {
    this.permissions = new Set(
      manifest.permissions.map(p => `${p.type}:${p.access}`)
    )
  }
  
  async loadPlugin(code: string): Promise<FotoFunPlugin> {
    // Create isolated environment based on permissions
    if (this.requiresDOM()) {
      return this.loadInIframe(code)
    } else {
      return this.loadInWorker(code)
    }
  }
  
  private requiresDOM(): boolean {
    return this.permissions.has('ui:write') || 
           this.permissions.has('canvas:write')
  }
  
  // ... sandbox implementation
}
```

### Phase 4: Plugin API

API exposed to plugins (following existing patterns):

```typescript
// lib/plugins/api/PluginAPI.ts
import type { Canvas } from 'fabric'
import type { Tool } from '@/types'

export class PluginAPI {
  constructor(
    private pluginId: string,
    private permissions: Set<string>
  ) {}
  
  // Canvas API (if permitted)
  get canvas() {
    this.checkPermission('canvas:read')
    return {
      getCanvas: () => useCanvasStore.getState().fabricCanvas,
      onSelectionChange: (callback: (selection: any) => void) => {
        // Subscribe to selection changes
      },
      executeCommand: (command: ICommand) => {
        this.checkPermission('canvas:write')
        return useHistoryStore.getState().executeCommand(command)
      }
    }
  }
  
  // Tool API
  get tools() {
    return {
      registerTool: (tool: Tool) => {
        this.checkPermission('canvas:write')
        // Register tool with plugin namespace
        const pluginTool = { ...tool, id: `${this.pluginId}:${tool.id}` }
        useToolStore.getState().registerTool(pluginTool)
      }
    }
  }
  
  // UI API
  get ui() {
    this.checkPermission('ui:write')
    return {
      showNotification: (message: string) => {
        // Show notification
      },
      registerPanel: (panel: PluginPanel) => {
        // Register panel in UI
      }
    }
  }
  
  // Storage API
  get storage() {
    this.checkPermission('storage:write')
    return {
      get: (key: string) => localStorage.getItem(`plugin:${this.pluginId}:${key}`),
      set: (key: string, value: string) => localStorage.setItem(`plugin:${this.pluginId}:${key}`, value)
    }
  }
  
  private checkPermission(permission: string) {
    if (!this.permissions.has(permission)) {
      throw new Error(`Plugin ${this.pluginId} does not have permission: ${permission}`)
    }
  }
}
```

### Phase 5: Plugin Management UI

Following existing UI patterns in `components/`:

```typescript
// components/editor/PluginManager/index.tsx
export function PluginManager() {
  const { plugins, activePlugins } = usePluginStore()
  
  return (
    <div className="plugin-manager">
      <PluginList 
        plugins={Array.from(plugins.values())}
        activePlugins={activePlugins}
      />
      <PluginMarketplace /> {/* Cloud only */}
      <PluginDevTools /> {/* Development mode */}
    </div>
  )
}
```

## Implementation Plan

### Week 1: Core Architecture
- [ ] Define plugin interfaces and types
- [ ] Implement plugin runtime store
- [ ] Create basic plugin loader
- [ ] Set up plugin registry

### Week 2: Sandbox & Security
- [ ] Implement iframe sandbox for UI plugins
- [ ] Implement worker sandbox for compute plugins
- [ ] Create permission system
- [ ] Add plugin validation

### Week 3: Plugin API
- [ ] Canvas API with permissions
- [ ] Tool registration API
- [ ] UI extension points
- [ ] Storage and settings API

### Week 4: Management & Developer Experience
- [ ] Plugin manager UI
- [ ] Plugin development kit
- [ ] Example plugins
- [ ] Documentation

### Week 5: Marketplace (Cloud)
- [ ] Plugin submission system
- [ ] Review process
- [ ] Installation from marketplace
- [ ] Update mechanism

## Example Plugin

Following existing tool patterns:

```typescript
// example-plugin/index.ts
import type { FotoFunPlugin } from '@fotofun/plugin-sdk'

const plugin: FotoFunPlugin = {
  async onLoad() {
    console.log('Vintage Effects plugin loaded')
  },
  
  tools: [{
    id: 'vintage-brush',
    name: 'Vintage Brush',
    icon: 'Brush',
    cursor: 'crosshair',
    
    onActivate(canvas) {
      // Tool activation logic
    },
    
    onDeactivate(canvas) {
      // Cleanup
    }
  }],
  
  aiAdapters: [{
    tool: vintageBrushTool,
    aiName: 'applyVintage',
    description: 'Apply vintage brush effects',
    inputSchema: z.object({
      intensity: z.number().min(0).max(100)
    }),
    
    async execute(params, context) {
      // Apply vintage effect
    }
  }],
  
  panels: [{
    id: 'vintage-presets',
    title: 'Vintage Presets',
    icon: 'Camera',
    component: VintagePresetsPanel
  }]
}

export default plugin
```

## Testing Strategy

1. **Security Testing**
   - Permission enforcement
   - Sandbox escape attempts
   - Resource usage limits

2. **Compatibility Testing**
   - Different plugin types
   - Version compatibility
   - Performance impact

3. **Developer Experience**
   - Plugin development workflow
   - Debugging capabilities
   - Documentation clarity

## Deployment Considerations

### Self-Hosted
- Local plugin installation
- No marketplace access
- Manual plugin management
- Full control over plugins

### Cloud Version
- Marketplace access
- Automatic updates
- Curated plugin collection
- Revenue sharing for developers

## Success Metrics
- < 100ms plugin load time
- Zero security vulnerabilities
- 50+ plugins in marketplace (6 months)
- Plugin crashes don't affect main app

## Risks & Mitigations
1. **Security vulnerabilities** → Strict sandboxing, code review
2. **Performance impact** → Resource limits, lazy loading
3. **API stability** → Versioned API, deprecation policy
4. **Quality control** → Review process, user ratings

---

**Status**: 📋 Planned
**Estimated Duration**: 5 weeks
**Dependencies**: None (builds on existing architecture) 