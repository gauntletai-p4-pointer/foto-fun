# Epic 13: Plugin & Extension System

## Overview

This epic implements a streamlined plugin system for FotoFun that allows developers to extend functionality by adding new tools. Following our established architecture from Epic 5.25, plugins can add:
- **Canvas Tools** (`lib/editor/tools/`) - Tools that directly manipulate Fabric.js
- **AI-Native Tools** (`lib/ai/tools/`) - Tools that call external AI services (like Replicate)
- **Tool Adapters** (`lib/ai/adapters/tools/`) - Make any tool AI-compatible

Self-hosted users can install community plugins from GitHub, while cloud users get access to curated, tested plugins.

## Goals

1. **Canvas Tool Plugins** - Add tools like eraser, clone stamp, etc.
2. **AI-Native Tool Plugins** - Integrate any Replicate model as a tool
3. **Simple Management** - Toggle plugins on/off in settings
4. **GitHub Distribution** - Self-hosted users install from GitHub
5. **Curated Cloud Plugins** - Cloud users get tested, approved plugins

## Current State Analysis

### What We Have
- **Canvas Tools** (`lib/editor/tools/`) - Well-defined BaseTool architecture
- **AI-Native Tools** (`lib/ai/tools/`) - BaseAITool pattern from Epic 5.33
- **Tool Adapters** (`lib/ai/adapters/tools/`) - Unified adapter pattern for all tools
- **Adapter Registry** - Single registry for all tool adapters
- **Settings UI** - Existing feature toggle system

### What We Need
- Plugin loading from npm/GitHub
- Simple plugin manifest format
- Integration with settings UI
- Basic usage tracking

## Architecture Design

### Plugin Types (Following Epic 5.25 Terminology)

1. **Canvas Tool Plugins** - Add new Canvas Tools to `lib/editor/tools/`
   - Direct Fabric.js manipulation
   - Examples: eraser, clone stamp, healing brush
   - Naming: `[action]Tool` (camelCase singletons)

2. **AI-Native Tool Plugins** - Add new AI-Native Tools to `lib/ai/tools/`
   - Call external AI services (Replicate, etc.)
   - Examples: clothes try-on, style transfer, 3D effects
   - Naming: `[Action]Tool` (PascalCase classes)

3. **Hybrid Plugins** - Provide both Canvas and AI-Native Tools
   - Complete feature sets
   - Example: A drawing plugin with brush tool + AI colorization

### Plugin Structure

```typescript
// Canvas Tool Plugin manifest
{
  "name": "@fotofun/eraser-plugin",
  "version": "1.0.0",
  "description": "Eraser tool for FotoFun",
  "fotofun": {
    "type": "canvas-tool",
    "tools": [{
      "id": "eraser",
      "name": "Eraser Tool",
      "icon": "eraser",
      "category": "drawing",
      "requiresAdapter": true  // Will create adapter automatically
    }],
    "main": "dist/index.js"
  }
}

// AI-Native Tool Plugin manifest
{
  "name": "@fotofun/clothes-tryon-plugin",
  "version": "1.0.0",
  "description": "Virtual clothes try-on",
  "fotofun": {
    "type": "ai-tool",
    "tools": [{
      "id": "clothes-tryon",
      "name": "Clothes Try-On",
      "modelId": "viktorfa/clothes-virtual-try-on:...",
      "estimatedCost": 0.006,
      "requiresAdapter": true  // Will create adapter automatically
    }],
    "main": "dist/index.js"
  }
}
```

## Implementation Plan

### Phase 1: Plugin Loading System (Day 1-2)

#### 1.1 Plugin Loader
```typescript
// lib/plugins/loader.ts
import { toolRegistry } from '@/lib/editor/tools/registry'
import { adapterRegistry } from '@/lib/ai/adapters/registry'

export class PluginLoader {
  private loadedPlugins = new Map<string, LoadedPlugin>()
  
  async loadFromPackage(packageName: string): Promise<void> {
    try {
      // For self-hosted: dynamic import from node_modules
      const module = await import(packageName)
      const manifest = await this.getManifest(packageName)
      
      if (!manifest.fotofun) {
        throw new Error(`${packageName} is not a valid FotoFun plugin`)
      }
      
      const plugin: LoadedPlugin = {
        id: packageName,
        manifest: manifest.fotofun,
        module,
        enabled: true
      }
      
      // Register tools based on type
      if (manifest.fotofun.type === 'canvas-tool') {
        await this.registerCanvasTools(plugin)
      } else if (manifest.fotofun.type === 'ai-tool') {
        await this.registerAITools(plugin)
      } else if (manifest.fotofun.type === 'hybrid') {
        await this.registerCanvasTools(plugin)
        await this.registerAITools(plugin)
      }
      
      this.loadedPlugins.set(packageName, plugin)
      
      // Save to settings
      this.savePluginState()
      
    } catch (error) {
      console.error(`Failed to load plugin ${packageName}:`, error)
      throw error
    }
  }
  
  private async registerCanvasTools(plugin: LoadedPlugin) {
    for (const toolDef of plugin.manifest.canvasTools || []) {
      // Get the tool instance/class
      const tool = plugin.module.canvasTools?.[toolDef.id]
      if (!tool) {
        console.warn(`Canvas tool ${toolDef.id} not found in plugin`)
        continue
      }
      
      // Register in canvas tool registry
      toolRegistry.register(tool)
      
      // If it needs an adapter, create one automatically
      if (toolDef.requiresAdapter) {
        const AdapterClass = plugin.module.adapters?.[`${toolDef.id}Adapter`]
        if (AdapterClass) {
          adapterRegistry.register(new AdapterClass())
        } else {
          // Create generic adapter
          const adapter = this.createGenericAdapter(tool, toolDef)
          adapterRegistry.register(adapter)
        }
      }
    }
  }
  
  private async registerAITools(plugin: LoadedPlugin) {
    for (const toolDef of plugin.manifest.aiTools || []) {
      // Get the AI-Native Tool class
      const ToolClass = plugin.module.aiTools?.[toolDef.id]
      if (!ToolClass) {
        console.warn(`AI tool ${toolDef.id} not found in plugin`)
        continue
      }
      
      // Instantiate the tool
      const tool = new ToolClass()
      
      // Create and register adapter
      const AdapterClass = plugin.module.adapters?.[`${toolDef.id}Adapter`]
      if (AdapterClass) {
        adapterRegistry.register(new AdapterClass())
      } else if (toolDef.requiresAdapter) {
        // Create generic Replicate adapter
        const adapter = this.createReplicateAdapter(tool, toolDef)
        adapterRegistry.register(adapter)
      }
    }
  }
}
```

#### 1.2 Plugin Management Store
```typescript
// store/pluginStore.ts
interface PluginState {
  installedPlugins: Map<string, PluginInfo>
  enabledPlugins: Set<string>
  
  // Actions
  installPlugin: (packageName: string) => Promise<void>
  togglePlugin: (pluginId: string, enabled: boolean) => void
  uninstallPlugin: (pluginId: string) => void
}

export const usePluginStore = create<PluginState>((set, get) => ({
  installedPlugins: new Map(),
  enabledPlugins: new Set(),
  
  installPlugin: async (packageName: string) => {
    const loader = PluginLoader.getInstance()
    await loader.loadFromPackage(packageName)
    
    // Update state
    set(state => ({
      installedPlugins: new Map(state.installedPlugins).set(packageName, {
        id: packageName,
        ...loader.getPluginInfo(packageName)
      }),
      enabledPlugins: new Set(state.enabledPlugins).add(packageName)
    }))
  },
  
  togglePlugin: (pluginId: string, enabled: boolean) => {
    set(state => {
      const newEnabled = new Set(state.enabledPlugins)
      if (enabled) {
        newEnabled.add(pluginId)
      } else {
        newEnabled.delete(pluginId)
      }
      
      // Enable/disable tools and adapters
      const plugin = state.installedPlugins.get(pluginId)
      if (plugin) {
        plugin.tools?.forEach(tool => {
          toolRegistry.setEnabled(tool.id, enabled)
        })
        plugin.models?.forEach(model => {
          adapterRegistry.setEnabled(model.id, enabled)
        })
      }
      
      return { enabledPlugins: newEnabled }
    })
  }
}))
```

### Phase 2: Example Plugins (Day 2-3)

#### 2.1 Canvas Tool Plugin (Eraser)
```typescript
// plugins/eraser-tool/src/index.ts
import { BaseTool } from '@fotofun/sdk'
import { BaseToolAdapter } from '@fotofun/sdk/adapters'
import { z } from 'zod'

// Canvas Tool implementation
class EraserTool extends BaseTool {
  id = 'eraser'
  name = 'Eraser'
  icon = 'Eraser'
  cursor = 'crosshair'
  shortcut = 'E'
  
  private isErasing = false
  private lastPoint: { x: number; y: number } | null = null
  private brushSize = 20
  
  protected setupTool(canvas: Canvas): void {
    this.addCanvasEvent('mouse:down', this.startErasing.bind(this))
    this.addCanvasEvent('mouse:move', this.continueErasing.bind(this))
    this.addCanvasEvent('mouse:up', this.stopErasing.bind(this))
    
    this.subscribeToToolOptions((options) => {
      this.brushSize = options.size || 20
    })
  }
  
  private startErasing(e: any) {
    this.isErasing = true
    const pointer = canvas.getPointer(e.e)
    this.lastPoint = { x: pointer.x, y: pointer.y }
  }
  
  private continueErasing(e: any) {
    if (!this.isErasing || !this.lastPoint) return
    
    const pointer = canvas.getPointer(e.e)
    const path = new fabric.Path(
      `M ${this.lastPoint.x} ${this.lastPoint.y} L ${pointer.x} ${pointer.y}`,
      {
        stroke: 'rgba(0,0,0,1)',
        strokeWidth: this.brushSize,
        globalCompositeOperation: 'destination-out',
        strokeLineCap: 'round'
      }
    )
    
    canvas.add(path)
    canvas.renderAll()
    this.lastPoint = { x: pointer.x, y: pointer.y }
  }
  
  private stopErasing() {
    this.isErasing = false
    this.lastPoint = null
  }
}

// Tool Adapter for AI compatibility (optional)
class EraserToolAdapter extends BaseToolAdapter<
  { size: number },
  { success: boolean }
> {
  tool = eraserTool
  aiName = 'erase'
  description = 'Erase parts of the image'
  
  inputSchema = z.object({
    size: z.number().min(1).max(100).describe('Eraser size in pixels')
  })
  
  async execute(params, context) {
    // For AI usage, would need to specify what to erase
    // This is mainly for UI tool
    return { success: true }
  }
}

// Export following our patterns
export const eraserTool = new EraserTool()  // Singleton instance

export const canvasTools = { 
  eraser: eraserTool 
}

export const adapters = {
  eraserAdapter: EraserToolAdapter
}
```

#### 2.2 AI-Native Tool Plugin (Clothes Try-On)
```typescript
// plugins/clothes-tryon/src/index.ts
import { BaseAITool } from '@fotofun/sdk/ai'
import { ReplicateToolAdapter } from '@fotofun/sdk/adapters'
import { z } from 'zod'

// AI-Native Tool implementation
class ClothesTryOnTool extends BaseAITool {
  id = 'clothes-tryon'
  name = 'Virtual Clothes Try-On'
  modelId = 'viktorfa/clothes-virtual-try-on:...'
  
  async execute(params: {
    personImage: string
    clothesImage: string
    category: 'upper' | 'lower' | 'dress'
  }): Promise<string> {
    const output = await this.client.run(this.modelId, {
      input: {
        human_img: params.personImage,
        cloth_img: params.clothesImage,
        category: params.category
      }
    })
    
    return output as string
  }
}

// Tool Adapter for AI chat integration
class ClothesTryOnAdapter extends ReplicateToolAdapter<
  z.infer<typeof inputSchema>,
  { success: boolean; cost: number }
> {
  protected aiNativeTool = new ClothesTryOnTool()
  
  aiName = 'clothesTryOn'
  description = 'Try on clothes virtually using AI'
  
  inputSchema = z.object({
    clothesImageUrl: z.string().describe('URL or path to clothing image'),
    category: z.enum(['upper', 'lower', 'dress'])
      .describe('Type of clothing')
  })
  
  protected async prepareToolParams(personImage: string, params: any) {
    return {
      personImage,
      clothesImage: await this.loadImage(params.clothesImageUrl),
      category: params.category
    }
  }
  
  protected async applyToCanvas(output: string, canvas: Canvas) {
    const img = await this.base64ToFabricImage(output)
    canvas.clear()
    canvas.add(img)
    canvas.renderAll()
  }
  
  protected formatOutput(output: any, cost: number) {
    return { success: true, cost }
  }
}

// Export following our patterns
export const aiTools = {
  'clothes-tryon': ClothesTryOnTool
}

export const adapters = {
  'clothes-tryon': ClothesTryOnAdapter
}
```

### Phase 3: Settings UI Integration (Day 3-4)

#### 3.1 Plugin Settings Tab
```typescript
// components/editor/MenuBar/SettingsDialog.tsx - Add to existing file
<TabsContent value="plugins" className="px-1">
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h4 className="text-sm font-medium">Installed Plugins</h4>
        <p className="text-xs text-muted-foreground">
          {isCloud ? 'Curated plugins for cloud users' : 'Community plugins from GitHub'}
        </p>
      </div>
      
      {!isCloud && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInstallDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Install Plugin
        </Button>
      )}
    </div>
    
    {/* Plugin List */}
    <div className="space-y-2">
      {Array.from(installedPlugins.values()).map(plugin => (
        <div key={plugin.id} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              {plugin.type === 'ai-model' ? (
                <Sparkles className="w-5 h-5" />
              ) : (
                <Wrench className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{plugin.name}</p>
              <p className="text-xs text-muted-foreground">{plugin.description}</p>
              {plugin.models && (
                <div className="flex gap-2 mt-1">
                  {plugin.models.map(model => (
                    <Badge key={model.id} variant="secondary" className="text-xs">
                      ~${model.estimatedCost}/use
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <Switch
            checked={enabledPlugins.has(plugin.id)}
            onCheckedChange={(checked) => togglePlugin(plugin.id, checked)}
          />
        </div>
      ))}
    </div>
    
    {installedPlugins.size === 0 && (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No plugins installed</p>
        {!isCloud && (
          <p className="text-xs mt-1">
            Install plugins from npm or GitHub
          </p>
        )}
      </div>
    )}
  </div>
</TabsContent>
```

#### 3.2 Install Plugin Dialog (Self-Hosted Only)
```typescript
// components/editor/PluginInstallDialog.tsx
export function PluginInstallDialog({ open, onOpenChange }: DialogProps) {
  const [packageName, setPackageName] = useState('')
  const [installing, setInstalling] = useState(false)
  const { installPlugin } = usePluginStore()
  
  const handleInstall = async () => {
    if (!packageName) return
    
    setInstalling(true)
    try {
      await installPlugin(packageName)
      showToast('Plugin installed successfully', { type: 'success' })
      onOpenChange(false)
      setPackageName('')
    } catch (error) {
      showToast('Failed to install plugin', { type: 'error' })
    } finally {
      setInstalling(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install Plugin</DialogTitle>
          <DialogDescription>
            Install a FotoFun plugin from npm or GitHub
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="package">Package Name</Label>
            <Input
              id="package"
              placeholder="@fotofun/eraser-plugin"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={installing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Examples: @fotofun/eraser-plugin, github:user/repo
            </p>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only install plugins from trusted sources. Plugins have access to your canvas data.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInstall} disabled={!packageName || installing}>
            {installing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Phase 4: Usage Tracking (Day 4)

#### 4.1 Simple Usage Tracker
```typescript
// lib/usage/tracker.ts
export class UsageTracker {
  private limits: UsageLimits = {
    daily: {
      openai: 10, // $10/day default
      replicate: 10 // $10/day default
    },
    monthly: {
      openai: 100, // $100/month default
      replicate: 200 // $200/month default
    }
  }
  
  async trackUsage(
    provider: 'openai' | 'replicate',
    cost: number,
    operation: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const month = new Date().toISOString().slice(0, 7)
    
    // Get current usage
    const dailyUsage = await this.getDailyUsage(provider, today)
    const monthlyUsage = await this.getMonthlyUsage(provider, month)
    
    // Check limits
    if (dailyUsage + cost > this.limits.daily[provider]) {
      throw new Error(`Daily ${provider} limit exceeded`)
    }
    
    if (monthlyUsage + cost > this.limits.monthly[provider]) {
      throw new Error(`Monthly ${provider} limit exceeded`)
    }
    
    // Log usage
    await db.insert(usageLog).values({
      provider,
      cost,
      operation,
      timestamp: new Date()
    })
  }
  
  async getUsageSummary(): Promise<UsageSummary> {
    const today = new Date().toISOString().split('T')[0]
    const month = new Date().toISOString().slice(0, 7)
    
    return {
      daily: {
        openai: await this.getDailyUsage('openai', today),
        replicate: await this.getDailyUsage('replicate', today)
      },
      monthly: {
        openai: await this.getMonthlyUsage('openai', month),
        replicate: await this.getMonthlyUsage('replicate', month)
      },
      limits: this.limits
    }
  }
}
```

#### 4.2 Usage Display Component
```typescript
// components/editor/UsageDisplay.tsx
export function UsageDisplay() {
  const { summary } = useUsage()
  const isCloud = getDeploymentMode() === 'cloud'
  
  if (!isCloud) return null
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Activity className="w-4 h-4" />
          <span className="text-xs">
            ${(summary.daily.openai + summary.daily.replicate).toFixed(2)} today
          </span>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Usage Summary</h4>
          
          {/* Daily Usage */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Today</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>OpenAI (Chat)</span>
                <span>${summary.daily.openai.toFixed(2)} / ${summary.limits.daily.openai}</span>
              </div>
              <Progress value={(summary.daily.openai / summary.limits.daily.openai) * 100} className="h-2" />
              
              <div className="flex justify-between text-sm mt-2">
                <span>Replicate (Tools)</span>
                <span>${summary.daily.replicate.toFixed(2)} / ${summary.limits.daily.replicate}</span>
              </div>
              <Progress value={(summary.daily.replicate / summary.limits.daily.replicate) * 100} className="h-2" />
            </div>
          </div>
          
          {/* Monthly Usage */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">This Month</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>OpenAI Total</span>
                <span>${summary.monthly.openai.toFixed(2)} / ${summary.limits.monthly.openai}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Replicate Total</span>
                <span>${summary.monthly.replicate.toFixed(2)} / ${summary.limits.monthly.replicate}</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <Button variant="outline" size="sm" className="w-full">
            <CreditCard className="w-4 h-4 mr-2" />
            Add Credits
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### Phase 5: Curated Cloud Plugins (Day 5)

#### 5.1 Cloud Plugin Registry
```typescript
// For cloud deployment, maintain a curated list
export const CLOUD_PLUGINS = [
  // Canvas Tool Plugins
  {
    id: '@fotofun/eraser-plugin',
    name: 'Eraser Tool',
    description: 'Professional eraser with soft/hard edges',
    type: 'canvas-tool',
    verified: true,
    free: true
  },
  {
    id: '@fotofun/clone-stamp-plugin', 
    name: 'Clone Stamp',
    description: 'Clone areas of your image',
    type: 'canvas-tool',
    verified: true,
    free: true
  },
  {
    id: '@fotofun/healing-brush-plugin',
    name: 'Healing Brush',
    description: 'Remove blemishes and imperfections',
    type: 'canvas-tool',
    verified: true,
    free: true
  },
  
  // AI-Native Tool Plugins
  {
    id: '@fotofun/clothes-tryon-plugin',
    name: 'Virtual Try-On',
    description: 'Try on clothes with AI',
    type: 'ai-tool',
    verified: true,
    estimatedCost: 0.006,
    free: false
  },
  {
    id: '@fotofun/style-transfer-plugin',
    name: 'Style Transfer',
    description: 'Apply artistic styles to photos',
    type: 'ai-tool', 
    verified: true,
    estimatedCost: 0.003,
    free: false
  },
  {
    id: '@fotofun/3d-effect-plugin',
    name: '3D Photo Effect',
    description: 'Convert 2D photos to 3D',
    type: 'ai-tool',
    verified: true,
    estimatedCost: 0.008,
    free: false
  },
  
  // Hybrid Plugins
  {
    id: '@fotofun/advanced-drawing-plugin',
    name: 'Advanced Drawing Suite',
    description: 'Professional drawing tools + AI colorization',
    type: 'hybrid',
    verified: true,
    features: ['pen-tool', 'vector-shapes', 'ai-colorize'],
    estimatedCost: 0.002, // For AI features only
    free: false
  }
]

// Auto-load for cloud users
export async function loadCloudPlugins() {
  const loader = PluginLoader.getInstance()
  
  for (const plugin of CLOUD_PLUGINS) {
    try {
      await loader.loadFromPackage(plugin.id)
      console.log(`Loaded cloud plugin: ${plugin.name}`)
    } catch (error) {
      console.error(`Failed to load ${plugin.id}:`, error)
    }
  }
}
```

## Plugin Development Guide

### Creating a Canvas Tool Plugin

1. **Initialize project**
   ```bash
   npm init @fotofun/plugin my-canvas-tool
   cd my-canvas-tool
   ```

2. **Implement Canvas Tool**
   ```typescript
   // src/tools/myTool.ts
   import { BaseTool } from '@fotofun/sdk'
   
   export class MyTool extends BaseTool {
     id = 'my-tool'
     name = 'My Tool'
     icon = 'MyIcon'
     
     protected setupTool(canvas: Canvas): void {
       // Tool implementation
     }
   }
   
   // Export as singleton
   export const myTool = new MyTool()
   ```

3. **Optional: Add Tool Adapter for AI**
   ```typescript
   // src/adapters/myToolAdapter.ts
   import { BaseToolAdapter } from '@fotofun/sdk/adapters'
   import { myTool } from '../tools/myTool'
   
   export class MyToolAdapter extends BaseToolAdapter<Input, Output> {
     tool = myTool
     aiName = 'myTool'
     description = 'Description for AI to understand when to use this tool'
     
     inputSchema = z.object({
       // Parameters AI can provide
     })
     
     async execute(params, context) {
       // Implementation
     }
   }
   ```

4. **Export properly**
   ```typescript
   // src/index.ts
   export const canvasTools = {
     'my-tool': myTool
   }
   
   export const adapters = {
     'my-tool': MyToolAdapter  // If you created an adapter
   }
   ```

5. **Publish**
   ```bash
   npm publish
   ```

### Creating an AI-Native Tool Plugin

1. **Find model on Replicate**
   - Browse https://replicate.com/explore
   - Note the model ID and version

2. **Create AI-Native Tool**
   ```typescript
   // src/tools/MyAITool.ts
   import { BaseAITool } from '@fotofun/sdk/ai'
   
   export class MyAITool extends BaseAITool {
     id = 'my-ai-tool'
     name = 'My AI Tool'
     modelId = 'owner/model:version'
     
     async execute(params: MyParams): Promise<string> {
       const output = await this.client.run(this.modelId, {
         input: {
           // Map params to model inputs
         }
       })
       
       return output as string
     }
   }
   ```

3. **Create Tool Adapter**
   ```typescript
   // src/adapters/MyAIToolAdapter.ts
   import { ReplicateToolAdapter } from '@fotofun/sdk/adapters'
   import { MyAITool } from '../tools/MyAITool'
   
   export class MyAIToolAdapter extends ReplicateToolAdapter<Input, Output> {
     protected aiNativeTool = new MyAITool()
     
     aiName = 'myAITool'
     description = 'What this tool does for AI understanding'
     
     inputSchema = z.object({
       // Schema for AI parameters
     })
     
     protected async prepareToolParams(inputImage: string, params: Input) {
       // Convert adapter params to tool params
     }
     
     protected async applyToCanvas(output: string, canvas: Canvas) {
       // Apply AI output to canvas
     }
     
     protected formatOutput(output: any, cost: number): Output {
       // Format response
     }
   }
   ```

4. **Export properly**
   ```typescript
   // src/index.ts
   export const aiTools = {
     'my-ai-tool': MyAITool
   }
   
   export const adapters = {
     'my-ai-tool': MyAIToolAdapter
   }
   ```

### Plugin Manifest

```json
{
  "name": "@fotofun/my-plugin",
  "version": "1.0.0",
  "description": "My FotoFun plugin",
  "main": "dist/index.js",
  "fotofun": {
    "type": "canvas-tool" | "ai-tool" | "hybrid",
    "canvasTools": [
      {
        "id": "my-tool",
        "name": "My Tool",
        "icon": "MyIcon",
        "category": "drawing",
        "requiresAdapter": true
      }
    ],
    "aiTools": [
      {
        "id": "my-ai-tool", 
        "name": "My AI Tool",
        "modelId": "owner/model:version",
        "estimatedCost": 0.002,
        "requiresAdapter": true
      }
    ]
  }
}
```

## Success Metrics

1. **Adoption**
   - 5+ community plugins in first month
   - 50+ installs per plugin average
   - Active plugin developers

2. **Quality**
   - Simple, documented plugin API
   - No security incidents
   - Plugins don't affect core stability

3. **Performance**
   - Plugin load time < 100ms
   - No impact on app startup
   - Efficient memory usage

## Technical Decisions

1. **Why GitHub/npm?**
   - Developers already familiar
   - Built-in versioning
   - Easy distribution
   - No custom infrastructure

2. **Why No Sandboxing Initially?**
   - Complexity not justified yet
   - Trust model (curated for cloud)
   - Can add later if needed

3. **Why Simple Credit System?**
   - Easy to understand limits
   - Per-provider tracking
   - Manual top-ups to start

---

**Status**: 📋 Planned
**Estimated Duration**: 5 days
**Dependencies**: Epic 5.33 (Replicate integration) 