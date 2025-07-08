}

// Example plugin - Glitch Effect
class GlitchEffectPlugin {
  private params = {
    intensity: 50,
    channelShift: true,
    scanlines: true,
    noise: true
  }
  
  async apply(layer: Layer) {
    const pixels = await layer.getPixels()
    
    // RGB channel shift
    if (this.params.channelShift) {
      this.shiftChannels(pixels, this.params.intensity)
    }
    
    // Add scan lines
    if (this.params.scanlines) {
      this.addScanlines(pixels, this.params.intensity)
    }
    
    // Add noise
    if (this.params.noise) {
      this.addNoise(pixels, this.params.intensity)
    }
    
    await layer.setPixels(pixels)
  }
}
```

### 4.3 Workspace Customization

#### Workspace System
```typescript
interface Workspace {
  id: string
  name: string
  isDefault: boolean
  
  layout: {
    panels: PanelLayout[]
    toolbar: ToolbarLayout
    menubar: MenubarLayout
    statusbar: boolean
  }
  
  shortcuts: KeyboardShortcut[]
  preferences: WorkspacePreferences
}

interface PanelLayout {
  id: string            // Panel type ID
  position: DockPosition
  size: { width: number; height: number }
  collapsed: boolean
  tabGroup?: string     // For grouped panels
}

type DockPosition = {
  zone: 'left' | 'right' | 'top' | 'bottom' | 'float'
  order: number         // Order within zone
  x?: number           // For floating panels
  y?: number
}

class WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map()
  private activeWorkspace: string
  
  // Default workspaces
  private defaults = {
    essentials: this.createEssentialsWorkspace(),
    photography: this.createPhotographyWorkspace(),
    design: this.createDesignWorkspace(),
    painting: this.createPaintingWorkspace(),
    minimal: this.createMinimalWorkspace()
  }
  
  saveWorkspace(name: string): Workspace {
    const workspace: Workspace = {
      id: generateId(),
      name,
      isDefault: false,
      layout: this.captureCurrentLayout(),
      shortcuts: this.captureCustomShortcuts(),
      preferences: this.capturePreferences()
    }
    
    this.workspaces.set(workspace.id, workspace)
    return workspace
  }
  
  private captureCurrentLayout(): WorkspaceLayout {
    // Capture all panel positions
    const panels = Array.from(document.querySelectorAll('[data-panel]'))
      .map(panel => ({
        id: panel.getAttribute('data-panel'),
        position: this.getPanelPosition(panel),
        size: this.getPanelSize(panel),
        collapsed: panel.classList.contains('collapsed'),
        tabGroup: panel.getAttribute('data-tab-group')
      }))
    
    return {
      panels,
      toolbar: this.getToolbarLayout(),
      menubar: this.getMenubarLayout(),
      statusbar: this.isStatusBarVisible()
    }
  }
  
  switchWorkspace(workspaceId: string) {
    const workspace = this.workspaces.get(workspaceId)
    if (!workspace) return
    
    // Save current workspace state
    if (this.activeWorkspace) {
      this.saveWorkspaceState(this.activeWorkspace)
    }
    
    // Apply new workspace
    this.applyWorkspace(workspace)
    this.activeWorkspace = workspaceId
  }
}

// Keyboard shortcut customization
interface KeyboardShortcut {
  command: string
  keys: string[]        // e.g., ['Ctrl', 'Shift', 'S']
  context?: string      // Tool-specific shortcuts
}

class ShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private conflicts: Map<string, string[]> = new Map()
  
  registerShortcut(shortcut: KeyboardShortcut) {
    const key = this.getShortcutKey(shortcut.keys)
    
    // Check for conflicts
    const existing = this.shortcuts.get(key)
    if (existing && existing.command !== shortcut.command) {
      this.conflicts.set(key, [existing.command, shortcut.command])
      throw new ShortcutConflictError(key, existing.command, shortcut.command)
    }
    
    this.shortcuts.set(key, shortcut)
  }
  
  async recordShortcut(command: string): Promise<KeyboardShortcut> {
    return new Promise((resolve) => {
      const handler = (e: KeyboardEvent) => {
        e.preventDefault()
        
        const keys = this.getKeysFromEvent(e)
        if (keys.length > 0) {
          document.removeEventListener('keydown', handler)
          
          resolve({
            command,
            keys,
            context: this.getCurrentContext()
          })
        }
      }
      
      document.addEventListener('keydown', handler)
    })
  }
}
```

### 4.4 Advanced Export Options

#### Export Personas
```typescript
interface ExportPersona {
  id: string
  name: string
  icon: string
  
  formats: ExportFormat[]
  
  settings: {
    scale: number[]     // e.g., [1, 2, 3] for @1x, @2x, @3x
    suffix: string[]    // e.g., ['', '@2x', '@3x']
    
    preprocessing: {
      resize?: { width: number; height: number; method: ResizeMethod }
      sharpen?: { amount: number; radius: number }
      convertColorSpace?: ColorSpace
    }
    
    format: {
      [key: string]: FormatSettings
    }
  }
}

interface FormatSettings {
  quality?: number      // JPEG/WebP
  compression?: number  // PNG
  progressive?: boolean // JPEG
  lossless?: boolean   // WebP
  metadata?: {
    preserve: boolean
    copyright?: string
    author?: string
  }
}

class ExportManager {
  private personas: Map<string, ExportPersona> = new Map()
  
  // Built-in personas
  constructor() {
    this.registerPersona({
      id: 'web-standard',
      name: 'Web (Standard)',
      icon: 'web',
      formats: ['png', 'jpg', 'webp'],
      settings: {
        scale: [1, 2],
        suffix: ['', '@2x'],
        format: {
          jpg: { quality: 85, progressive: true },
          png: { compression: 9 },
          webp: { quality: 85 }
        }
      }
    })
    
    this.registerPersona({
      id: 'ios-assets',
      name: 'iOS App Assets',
      icon: 'apple',
      formats: ['png'],
      settings: {
        scale: [1, 2, 3],
        suffix: ['', '@2x', '@3x'],
        format: {
          png: { compression: 9, metadata: { preserve: false } }
        }
      }
    })
  }
  
  async exportWithPersona(
    document: Document, 
    persona: ExportPersona,
    baseFilename: string
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = []
    
    for (const format of persona.formats) {
      for (let i = 0; i < persona.settings.scale.length; i++) {
        const scale = persona.settings.scale[i]
        const suffix = persona.settings.suffix[i]
        
        // Preprocess
        let processed = await this.preprocess(
          document, 
          persona.settings.preprocessing,
          scale
        )
        
        // Export
        const filename = `${baseFilename}${suffix}.${format}`
        const blob = await this.exportFormat(
          processed,
          format,
          persona.settings.format[format]
        )
        
        results.push({ filename, blob, format, scale })
      }
    }
    
    return results
  }
  
  // Quick Export
  async quickExport(document: Document) {
    const lastUsedPersona = this.getLastUsedPersona()
    const baseFilename = document.name.replace(/\.[^.]+$/, '')
    
    return this.exportWithPersona(document, lastUsedPersona, baseFilename)
  }
}

// Asset Generator
interface AssetGenerator {
  slices: Slice[]
  
  generate(): Promise<Asset[]>
}

interface Slice {
  name: string
  bounds: Rect
  layers?: string[]     // Specific layers to include
  
  export: {
    formats: ExportFormat[]
    scales: number[]
    suffix: string[]
  }
}
```

### 4.5 Performance Optimizations

#### GPU Pipeline
```typescript
class GPUPipeline {
  private device: GPUDevice
  private context: GPUCanvasContext
  private commandEncoder: GPUCommandEncoder
  
  async initialize() {
    const adapter = await navigator.gpu.requestAdapter()
    this.device = await adapter.requestDevice()
    
    const canvas = document.createElement('canvas')
    this.context = canvas.getContext('webgpu')
    
    this.context.configure({
      device: this.device,
      format: 'bgra8unorm',
      alphaMode: 'premultiplied'
    })
  }
  
  createFilterPipeline(shader: string): GPURenderPipeline {
    const shaderModule = this.device.createShaderModule({ code: shader })
    
    return this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [this.vertexBufferLayout]
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{
          format: 'bgra8unorm',
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha'
            }
          }
        }]
      }
    })
  }
  
  // Example shader for brightness/contrast
  brightnessContrastShader = `
    struct Uniforms {
      brightness: f32,
      contrast: f32,
    }
    
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    @group(0) @binding(1) var inputTexture: texture_2d<f32>;
    @group(0) @binding(2) var inputSampler: sampler;
    
    @fragment
    fn fragmentMain(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
      var color = textureSample(inputTexture, inputSampler, uv);
      
      // Apply contrast
      let factor = (259.0 * (uniforms.contrast + 255.0)) / (255.0 * (259.0 - uniforms.contrast));
      color.rgb = factor * (color.rgb - 0.5) + 0.5;
      
      // Apply brightness
      color.rgb = color.rgb + uniforms.brightness;
      
      return color;
    }
  `
}

// Tile-based rendering for large images
class TileRenderer {
  private tileSize = 512  // Optimal for GPU cache
  private tiles: Map<string, Tile> = new Map()
  
  async renderLargeImage(
    image: ImageData, 
    operation: (tile: ImageData) => Promise<ImageData>
  ): Promise<ImageData> {
    const tiles = this.createTiles(image)
    const results = await Promise.all(
      tiles.map(tile => this.processTile(tile, operation))
    )
    
    return this.stitchTiles(results, image.width, image.height)
  }
  
  private createTiles(image: ImageData): Tile[] {
    const tiles: Tile[] = []
    const { width, height } = image
    
    for (let y = 0; y < height; y += this.tileSize) {
      for (let x = 0; x < width; x += this.tileSize) {
        const tileWidth = Math.min(this.tileSize, width - x)
        const tileHeight = Math.min(this.tileSize, height - y)
        
        tiles.push({
          x, y,
          width: tileWidth,
          height: tileHeight,
          data: this.extractTile(image, x, y, tileWidth, tileHeight)
        })
      }
    }
    
    return tiles
  }
}

// Memory management
class MemoryManager {
  private cache: LRUCache<string, ImageData>
  private maxMemory: number
  private currentMemory: number = 0
  
  constructor(maxMemoryMB: number = 1024) {
    this.maxMemory = maxMemoryMB * 1024 * 1024
    this.cache = new LRUCache({ 
      max: 100,
      maxSize: this.maxMemory,
      sizeCalculation: (value) => value.data.length
    })
  }
  
  async allocate(size: number): Promise<boolean> {
    if (this.currentMemory + size > this.maxMemory) {
      // Try to free memory
      await this.gc()
      
      if (this.currentMemory + size > this.maxMemory) {
        return false
      }
    }
    
    this.currentMemory += size
    return true
  }
  
  private async gc() {
    // Clear caches
    this.cache.clear()
    
    // Force browser GC
    if (global.gc) {
      global.gc()
    }
    
    // Update memory usage
    if (performance.memory) {
      this.currentMemory = performance.memory.usedJSHeapSize
    }
  }
}
```

### 4.6 Collaboration Features

#### Version History
```typescript
interface Version {
  id: string
  timestamp: number
  author: string
  description?: string
  thumbnail: Blob
  
  snapshot: DocumentSnapshot
  size: number
}

interface DocumentSnapshot {
  layers: LayerSnapshot[]
  metadata: DocumentMetadata
  compressed: boolean
}

class VersionControl {
  private versions: Map<string, Version> = new Map()
  private currentVersion: string
  private maxVersions = 50
  
  async createVersion(description?: string): Promise<Version> {
    const snapshot = await this.captureSnapshot()
    const thumbnail = await this.generateThumbnail()
    
    const version: Version = {
      id: generateId(),
      timestamp: Date.now(),
      author: this.getCurrentUser(),
      description,
      thumbnail,
      snapshot,
      size: this.calculateSize(snapshot)
    }
    
    this.versions.set(version.id, version)
    this.pruneOldVersions()
    
    return version
  }
  
  async compareVersions(versionA: string, versionB: string) {
    const a = this.versions.get(versionA)
    const b = this.versions.get(versionB)
    
    if (!a || !b) throw new Error('Version not found')
    
    const diff = this.calculateDiff(a.snapshot, b.snapshot)
    
    return {
      added: diff.addedLayers,
      removed: diff.removedLayers,
      modified: diff.modifiedLayers,
      metadata: diff.metadataChanges
    }
  }
  
  async restoreVersion(versionId: string) {
    const version = this.versions.get(versionId)
    if (!version) throw new Error('Version not found')
    
    // Create restore point
    await this.createVersion('Before restore')
    
    // Restore snapshot
    await this.applySnapshot(version.snapshot)
    
    this.currentVersion = versionId
  }
}

// Auto-save system
class AutoSave {
  private interval: number = 5 * 60 * 1000  // 5 minutes
  private timer: NodeJS.Timer
  private lastSaveHash: string
  
  start() {
    this.timer = setInterval(() => {
      this.autoSave()
    }, this.interval)
  }
  
  private async autoSave() {
    const currentHash = await this.calculateDocumentHash()
    
    if (currentHash !== this.lastSaveHash) {
      await this.versionControl.createVersion('Auto-save')
      this.lastSaveHash = currentHash
    }
  }
}
```

#### Comments & Annotations
```typescript
interface Comment {
  id: string
  author: User
  timestamp: number
  
  position: {
    x: number
    y: number
    layer?: string      // Attached to specific layer
  }
  
  content: string
  thread: Comment[]     // Replies
  resolved: boolean
  
  mentions: string[]    // User IDs
}

class AnnotationSystem {
  private comments: Map<string, Comment> = new Map()
  private activeComment: string | null = null
  
  addComment(position: Point, content: string): Comment {
    const comment: Comment = {
      id: generateId(),
      author: this.getCurrentUser(),
      timestamp: Date.now(),
      position: {
        x: position.x,
        y: position.y,
        layer: this.getActiveLayerId()
      },
      content,
      thread: [],
      resolved: false,
      mentions: this.extractMentions(content)
    }
    
    this.comments.set(comment.id, comment)
    this.notifyMentionedUsers(comment.mentions)
    
    return comment
  }
  
  renderAnnotations(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    
    this.comments.forEach(comment => {
      if (comment.resolved) return
      
      // Draw comment marker
      this.drawCommentMarker(ctx, comment.position, comment.id)
      
      // Draw comment popup if active
      if (this.activeComment === comment.id) {
        this.drawCommentPopup(ctx, comment)
      }
    })
  }
  
  private drawCommentMarker(ctx: CanvasRenderingContext2D, pos: Point, id: string) {
    const size = 24
    
    // Yellow circle with number
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    
    // Number
    ctx.fillStyle = '#000'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.getCommentNumber(id).toString(), pos.x, pos.y)
  }
}
```

### 4.7 AI Assistant Evolution

#### Advanced AI Capabilities
```typescript
const phase4AITools = {
  // Workflow automation
  automateWorkflow: {
    name: 'automateWorkflow',
    description: 'Create and execute multi-step workflows',
    parameters: z.object({
      steps: z.array(z.object({
        tool: z.string(),
        parameters: z.any(),
        condition: z.string().optional()
      })),
      saveAsAction: z.boolean()
    })
  },
  
  // Intelligent suggestions
  suggestNextStep: {
    name: 'suggestNextStep',
    description: 'AI suggests next editing steps',
    parameters: z.object({
      analysisDepth: z.enum(['quick', 'detailed']),
      goalDescription: z.string().optional()
    })
  },
  
  // Batch operations
  batchProcess: {
    name: 'batchProcess',
    description: 'Apply operations to multiple images',
    parameters: z.object({
      operation: z.string(),
      files: z.array(z.string()),
      variations: z.boolean(),
      exportSettings: z.object({
        format: z.string(),
        quality: z.number(),
        naming: z.string()
      })
    })
  },
  
  // Advanced generation
  generateVariations: {
    name: 'generateVariations',
    description: 'Create variations of current design',
    parameters: z.object({
      count: z.number().min(1).max(10),
      variationType: z.enum(['color', 'composition', 'style', 'all']),
      strength: z.number().min(0).max(100)
    })
  },
  
  // Style learning
  learnStyle: {
    name: 'learnStyle',
    description: 'Learn style from reference images',
    parameters: z.object({
      referenceImages: z.array(z.string()),
      styleName: z.string(),
      aspects: z.array(z.enum(['color', 'texture', 'composition', 'lighting']))
    })
  },
  
  // Plugin creation
  generatePlugin: {
    name: 'generatePlugin',
    description: 'AI helps create custom plugin',
    parameters: z.object({
      description: z.string(),
      pluginType: z.enum(['filter', 'tool', 'panel', 'automation']),
      complexity: z.enum(['simple', 'moderate', 'advanced'])
    })
  }
}

// Context-aware AI
class ContextAwareAI {
  private context: EditingContext
  private userPatterns: UserPattern[]
  
  async analyzeContext(): Promise<EditingContext> {
    return {
      documentType: await this.detectDocumentType(),
      currentTask: await this.inferCurrentTask(),
      recentActions: this.getRecentActions(),
      selection: this.getSelectionContext(),
      layers: this.getLayerContext(),
      colors: this.getColorContext()
    }
  }
  
  async suggestActions(): Promise<Suggestion[]> {
    const context = await this.analyzeContext()
    const patterns = this.findMatchingPatterns(context)
    
    const suggestions: Suggestion[] = []
    
    // Task-specific suggestions
    switch (context.currentTask) {
      case 'retouching':
        suggestions.push(
          { action: 'healingBrush', reason: 'Remove blemishes' },
          { action: 'frequencySeparation', reason: 'Advanced skin retouching' }
        )
        break
        
      case 'compositing':
        suggestions.push(
          { action: 'refineEdge', reason: 'Improve selection edges' },
          { action: 'matchColor', reason: 'Match colors between layers' }
        )
        break
    }
    
    // Pattern-based suggestions
    patterns.forEach(pattern => {
      suggestions.push(...pattern.suggestions)
    })
    
    return this.rankSuggestions(suggestions, context)
  }
}
```

## Implementation Guidelines

### State Management Architecture
```typescript
// Global state structure
interface OpenShopState {
  // Document state
  documents: Map<string, DocumentState>
  activeDocument: string | null
  
  // UI state
  ui: {
    theme: 'light' | 'dark'
    workspace: string
    panels: PanelState[]
    zoom: number
    activeToolId: string
  }
  
  // Tool state
  tools: Map<string, ToolState>
  
  // History
  history: {
    past: HistoryEntry[]
    future: HistoryEntry[]
    maxSize: number
  }
  
  // AI Assistant
  ai: {
    messages: Message[]
    context: AIContext
    processing: boolean
  }
  
  // Preferences
  preferences: UserPreferences
}

// Zustand store setup
const useOpenShopStore = create<OpenShopState>((set, get) => ({
  // ... store implementation
}))
```

### Performance Best Practices

1. **Image Processing**
   - Use WebGL/WebGPU for all filters
   - Implement tile-based rendering for images > 4K
   - Cache processed results
   - Use Web Workers for CPU-intensive tasks

2. **Memory Management**
   - Implement aggressive garbage collection
   - Use virtual scrolling for large layer lists
   - Compress undo history states
   - Limit cache sizes based on available memory

3. **UI Responsiveness**
   - Debounce slider inputs
   - Use requestAnimationFrame for animations
   - Implement progressive rendering
   - Lazy load panels and tools

4. **File Handling**
   - Stream large files instead of loading entirely
   - Use IndexedDB for temporary storage
   - Implement chunked uploads/downloads
   - Support partial file loading

### Testing Strategy

```typescript
// Unit tests for each tool
describe('BrushTool', () => {
  it('should apply pressure sensitivity', () => {
    const brush = new BrushTool()
    brush.setPressureSensitivity({ size: true })
    
    const stroke = brush.createStroke(point, 0.5) // 50% pressure
    expect(stroke.size).toBe(brush.size * 0.5)
  })
})

// Integration tests
describe('Layer System', () => {
  it('should correctly blend layers', () => {
    const base = createTestLayer()
    const overlay = createTestLayer()
    overlay.blendMode = 'multiply'
    
    const result = blendLayers(base, overlay)
    // Assert blending results
  })
})

// E2E tests
describe('AI Assistant', () => {
  it('should execute brightness adjustment from natural language', async () => {
    await aiAssistant.sendMessage('Make the image brighter')
    
    const brightness = getBrightnessAdjustment()
    expect(brightness).toBeGreaterThan(0)
  })
})
```

## Conclusion

This roadmap provides a comprehensive path from MVP to a professional-grade image editor. Each phase builds upon the previous, ensuring a stable foundation while progressively adding advanced features. The architecture is designed to be modular, allowing teams to work on different components in parallel while maintaining consistency through the shared state management and plugin system.

Key success factors:
- Start with solid foundations (canvas, tools, state management)
- Prioritize performance from the beginning
- Build with extensibility in mind
- Maintain feature parity with professional tools
- Focus on AI integration as a differentiator
- Create a robust plugin ecosystem
- Ensure cross-browser compatibility
- Optimize for both desktop and tablet use cases# OpenShop Post-MVP Development Roadmap

## Overview

This document details all functionality to be implemented after the MVP phase, organized into three logical development phases. Each tool and feature includes implementation details, technical considerations, and AI integration specifications.

## Phase 2: Enhanced Editing Tools (2-3 months)

### 2.1 Drawing Tools Implementation

#### Brush Tool [B]
```typescript
interface BrushTool {
  size: number           // 1-5000px
  hardness: number       // 0-100%
  opacity: number        // 0-100%
  flow: number          // 0-100%
  smoothing: number     // 0-100%
  pressureSensitivity: {
    size: boolean
    opacity: boolean
    flow: boolean
  }
  blendMode: BlendMode
}

class BrushEngine {
  private points: Point[] = []
  private lastPoint: Point | null = null
  
  startStroke(point: Point, pressure: number) {
    this.points = [point]
    this.lastPoint = point
    this.drawDab(point, pressure)
  }
  
  continueStroke(point: Point, pressure: number) {
    // Smooth curve interpolation
    const distance = this.getDistance(this.lastPoint, point)
    const steps = Math.ceil(distance / (this.size * 0.25))
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const interpolated = this.catmullRom(this.points, t)
      this.drawDab(interpolated, pressure)
    }
    
    this.points.push(point)
    if (this.points.length > 4) this.points.shift()
    this.lastPoint = point
  }
  
  private drawDab(point: Point, pressure: number) {
    const size = this.size * (this.pressureSensitivity.size ? pressure : 1)
    const opacity = this.opacity * (this.pressureSensitivity.opacity ? pressure : 1)
    
    // GPU-accelerated dab rendering
    this.gpu.createKernel(function(x, y, size, hardness, color) {
      const dist = Math.sqrt((this.thread.x - x) ** 2 + (this.thread.y - y) ** 2)
      const normalized = dist / size
      
      if (normalized <= 1) {
        let alpha = 1
        if (normalized > hardness / 100) {
          alpha = 1 - (normalized - hardness / 100) / (1 - hardness / 100)
        }
        return [color[0], color[1], color[2], alpha]
      }
      return [0, 0, 0, 0]
    })
  }
}
```

**Brush Presets System**:
```typescript
interface BrushPreset {
  id: string
  name: string
  icon: string
  settings: BrushSettings
  customShape?: ImageData
}

const defaultBrushPresets = [
  { name: 'Hard Round', hardness: 100, spacing: 25 },
  { name: 'Soft Round', hardness: 0, spacing: 25 },
  { name: 'Airbrush', hardness: 0, flow: 10, buildUp: true },
  { name: 'Watercolor', wetEdges: true, scattering: 15 },
  { name: 'Oil Paint', mixerBrush: true, wetness: 50 },
]
```

#### Pencil Tool [B]
- Similar to brush but always 100% hardness
- No anti-aliasing
- Pixel-perfect lines for pixel art
- Auto-erase mode (drawing over same color erases)

#### Color Replacement Tool [B]
```typescript
interface ColorReplacementTool {
  size: number
  tolerance: number      // 0-255
  mode: 'hue' | 'saturation' | 'color' | 'luminosity'
  sampling: 'continuous' | 'once' | 'background'
  limits: 'contiguous' | 'discontiguous'
  antiAlias: boolean
}

function replaceColor(pixel: RGBA, target: RGBA, replacement: RGBA, tolerance: number) {
  const distance = colorDistance(pixel, target)
  if (distance <= tolerance) {
    switch (this.mode) {
      case 'hue':
        return {...pixel, h: replacement.h}
      case 'color':
        return {...pixel, h: replacement.h, s: replacement.s}
      // etc...
    }
  }
  return pixel
}
```

#### Mixer Brush Tool [B]
```typescript
interface MixerBrush {
  wetness: number        // 0-100% (paint pickup)
  load: number          // 0-100% (paint amount)
  mix: number           // 0-100% (blend with canvas)
  flow: number          // 0-100%
  
  paintReservoir: Color[]  // Current paint on brush
  cleanAfterStroke: boolean
  loadSolidColors: boolean
}
```

### 2.2 Clone & Healing Tools

#### Clone Stamp Tool [S]
```typescript
interface CloneStampTool {
  size: number
  hardness: number
  opacity: number
  aligned: boolean      // Source moves with cursor
  sampleLayer: 'current' | 'currentAndBelow' | 'all'
  sourcePoint: Point | null
  offset: Point
}

class CloneStampEngine {
  setSource(point: Point) {
    this.sourcePoint = point
    this.offset = { x: 0, y: 0 }
  }
  
  clone(targetPoint: Point) {
    const sourceX = this.aligned 
      ? this.sourcePoint.x + (targetPoint.x - this.firstTarget.x)
      : this.sourcePoint.x + this.offset.x
    
    const sourceData = this.samplePixels(sourceX, sourceY, this.size)
    this.applyStamp(targetPoint, sourceData)
  }
}
```

#### Healing Brush Tool [J]
```typescript
interface HealingBrush extends CloneStampTool {
  diffusion: number     // 1-7 (texture blending)
}

class HealingEngine {
  heal(source: ImageData, target: ImageData, mask: ImageData) {
    // 1. Clone source texture
    const texture = this.extractTexture(source)
    
    // 2. Match target luminosity and color
    const matched = this.matchHistogram(texture, target)
    
    // 3. Poisson blending at edges
    const blended = this.poissonBlend(matched, target, mask)
    
    return blended
  }
  
  private poissonBlend(source: ImageData, target: ImageData, mask: ImageData) {
    // Solve Poisson equation for seamless blending
    // ∇²f = ∇²g inside Ω (mask region)
    // f = target on ∂Ω (mask boundary)
  }
}
```

#### Spot Healing Brush [J]
- No source point needed
- Automatically samples nearby texture
- Content-aware filling algorithm

#### Patch Tool [J]
```typescript
interface PatchTool {
  mode: 'normal' | 'contentAware'
  adaptation: 'veryStrict' | 'strict' | 'medium' | 'loose' | 'veryLoose'
  sampleAllLayers: boolean
}

class PatchEngine {
  createPatch(selection: Path) {
    // 1. Create selection boundary
    // 2. Allow dragging to source area
    // 3. Blend using healing algorithm
  }
}
```

#### Content-Aware Move Tool [J]
```typescript
interface ContentAwareMove {
  mode: 'move' | 'extend'
  adaptation: number    // 1-7
  transform: {
    scale: boolean
    rotate: boolean
  }
}

class ContentAwareMoveEngine {
  async move(selection: ImageData, from: Rect, to: Rect) {
    // 1. Extract selection
    const content = this.extractSelection(selection, from)
    
    // 2. Fill source area using content-aware fill
    await this.contentAwareFill(from)
    
    // 3. Blend content into new location
    await this.smartBlend(content, to)
  }
}
```

### 2.3 Eraser Tools

#### Eraser Tool [E]
```typescript
interface EraserTool {
  size: number
  hardness: number
  opacity: number
  flow: number
  mode: 'brush' | 'pencil' | 'block'
  eraseToHistory: boolean  // Erase to history state
}
```

#### Background Eraser Tool [E]
```typescript
interface BackgroundEraser {
  size: number
  sampling: 'continuous' | 'once' | 'backgroundSwatch'
  limits: 'discontiguous' | 'contiguous' | 'findEdges'
  tolerance: number    // 0-255
  protectForeground: boolean
}

class BackgroundEraserEngine {
  erase(point: Point) {
    const sample = this.getSampleColor(point)
    const pixels = this.getPixelsInBrush(point, this.size)
    
    pixels.forEach(pixel => {
      const similarity = this.colorSimilarity(pixel.color, sample)
      if (similarity > this.tolerance) {
        pixel.alpha *= 1 - (similarity / 255)
      }
    })
  }
}
```

#### Magic Eraser Tool [E]
- One-click background removal
- Similar to magic wand + delete
- Anti-aliasing and tolerance options

### 2.4 Paint Tools

#### Gradient Tool [G]
```typescript
interface GradientTool {
  type: 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond'
  gradient: GradientDefinition
  mode: BlendMode
  opacity: number
  reverse: boolean
  dither: boolean
  transparency: boolean
}

interface GradientDefinition {
  stops: GradientStop[]
  smoothness: number    // 0-100%
}

interface GradientStop {
  color: RGBA
  position: number      // 0-100%
  midpoint: number      // 0-100%
}

class GradientEditor {
  // Visual gradient editor component
  addStop(position: number, color: RGBA) {}
  removeStop(index: number) {}
  updateStop(index: number, stop: GradientStop) {}
  
  // Preset gradients
  presets = [
    { name: 'Foreground to Background' },
    { name: 'Black to White' },
    { name: 'Spectrum' },
    { name: 'Sunset' },
    { name: 'Ocean' },
  ]
}
```

#### Paint Bucket Tool [G]
```typescript
interface PaintBucketTool {
  tolerance: number     // 0-255
  antiAlias: boolean
  contiguous: boolean
  allLayers: boolean
  opacity: number
  mode: BlendMode
  
  fillType: 'foreground' | 'background' | 'pattern'
  pattern?: Pattern
}

class PaintBucketEngine {
  fill(point: Point, color: RGBA) {
    const targetColor = this.getPixel(point)
    const filled = new Set<string>()
    const queue = [point]
    
    while (queue.length > 0) {
      const current = queue.shift()
      const key = `${current.x},${current.y}`
      
      if (filled.has(key)) continue
      
      const pixel = this.getPixel(current)
      if (this.colorDistance(pixel, targetColor) <= this.tolerance) {
        this.setPixel(current, color)
        filled.add(key)
        
        if (this.contiguous) {
          // Add neighbors to queue
          this.getNeighbors(current).forEach(n => queue.push(n))
        }
      }
    }
  }
}
```

### 2.5 Type Tools

#### Horizontal/Vertical Type Tool [T]
```typescript
interface TypeTool {
  font: {
    family: string      // Google Fonts integration
    size: number        // 1-1296pt
    style: 'normal' | 'italic' | 'oblique'
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  }
  
  alignment: 'left' | 'center' | 'right' | 'justify'
  color: RGBA
  
  character: {
    kerning: 'metrics' | 'optical' | 'manual'
    tracking: number    // -1000 to 10000
    verticalScale: number    // 0-1000%
    horizontalScale: number  // 0-1000%
    baseline: number    // -1000 to 1000
    rotation: number    // -180 to 180
  }
  
  paragraph: {
    lineHeight: number | 'auto'
    spaceBefore: number
    spaceAfter: number
    indent: {
      firstLine: number
      left: number
      right: number
    }
  }
  
  effects: {
    faux: {
      bold: boolean
      italic: boolean
    }
    underline: boolean
    strikethrough: boolean
    allCaps: boolean
    smallCaps: boolean
    superscript: boolean
    subscript: boolean
  }
  
  antiAlias: 'none' | 'sharp' | 'crisp' | 'strong' | 'smooth'
}

class TypeEngine {
  private canvas: OffscreenCanvas
  private ctx: OffscreenCanvasRenderingContext2D
  
  async loadGoogleFont(family: string, weight: number) {
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`
    await document.fonts.load(`${weight} 16px ${family}`)
  }
  
  renderText(text: string, options: TypeOptions) {
    // Advanced text layout with line breaking
    const lines = this.layoutText(text, options)
    
    lines.forEach((line, i) => {
      this.renderLine(line, i, options)
    })
  }
  
  private layoutText(text: string, options: TypeOptions) {
    // Implement advanced text layout
    // - Word wrap
    // - Justification
    // - Hyphenation
    // - Bidirectional text support
  }
}
```

#### Type on a Path
```typescript
interface TypeOnPath {
  path: Path2D
  startPoint: number    // 0-100% along path
  flip: boolean
  alignment: 'baseline' | 'top' | 'center' | 'bottom'
  spacing: number
}
```

### 2.6 Shape Tools

#### Rectangle/Rounded Rectangle Tool [U]
```typescript
interface RectangleTool {
  mode: 'shape' | 'path' | 'pixels'
  fill: {
    enabled: boolean
    color: RGBA | Gradient | Pattern
  }
  stroke: {
    enabled: boolean
    color: RGBA
    width: number
    position: 'inside' | 'center' | 'outside'
    dashArray: number[]
    lineJoin: 'miter' | 'round' | 'bevel'
    lineCap: 'butt' | 'round' | 'square'
  }
  cornerRadius: number | {
    topLeft: number
    topRight: number
    bottomLeft: number
    bottomRight: number
  }
}
```

#### Ellipse Tool [U]
- Similar properties to rectangle
- From center option (Alt key)
- Perfect circle constraint (Shift key)

#### Polygon Tool [U]
```typescript
interface PolygonTool extends ShapeTool {
  sides: number         // 3-100
  smoothCorners: boolean
  starMode: boolean
  starInset: number     // 0-100%
}
```

#### Line Tool [U]
```typescript
interface LineTool {
  weight: number        // 1-1000px
  arrowheads: {
    start: ArrowStyle | null
    end: ArrowStyle | null
  }
}

type ArrowStyle = {
  type: 'standard' | 'stealth' | 'open' | 'circle' | 'square'
  size: { width: number; length: number }
}
```

#### Custom Shape Tool [U]
```typescript
interface CustomShapeTool {
  shapes: CustomShape[]  // Library of shapes
  selectedShape: string
  
  // Same fill/stroke options as other shapes
}

interface CustomShape {
  id: string
  name: string
  path: Path2D
  category: string
  tags: string[]
}

// Default shape library
const defaultShapes = [
  { name: 'Arrow', category: 'Arrows' },
  { name: 'Speech Bubble', category: 'Callouts' },
  { name: 'Heart', category: 'Symbols' },
  { name: 'Star', category: 'Symbols' },
  // ... hundreds more
]
```

### 2.7 Advanced Adjustments

#### Curves Adjustment
```typescript
interface CurvesAdjustment {
  channel: 'RGB' | 'Red' | 'Green' | 'Blue'
  curves: {
    rgb?: CurveData
    red?: CurveData
    green?: CurveData
    blue?: CurveData
  }
  showHistogram: boolean
  showBaseline: boolean
  showIntersection: boolean
}

interface CurveData {
  points: Point[]       // Control points
  interpolation: 'linear' | 'smooth'
}

class CurvesEngine {
  private lut: Uint8Array[]  // Lookup tables for performance
  
  updateCurve(channel: string, points: Point[]) {
    // Generate bezier curve through points
    const curve = this.generateBezierCurve(points)
    
    // Build lookup table
    this.lut[channel] = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      this.lut[channel][i] = Math.round(curve.getY(i / 255) * 255)
    }
  }
  
  applyToPixel(pixel: RGBA): RGBA {
    return {
      r: this.lut.red[pixel.r],
      g: this.lut.green[pixel.g],
      b: this.lut.blue[pixel.b],
      a: pixel.a
    }
  }
}
```

#### Levels Adjustment
```typescript
interface LevelsAdjustment {
  channel: 'RGB' | 'Red' | 'Green' | 'Blue'
  input: {
    shadows: number     // 0-255
    midtones: number    // 0.01-9.99 (gamma)
    highlights: number  // 0-255
  }
  output: {
    shadows: number     // 0-255
    highlights: number  // 0-255
  }
  
  presets: LevelsPreset[]
}

class LevelsEngine {
  private histogram: Uint32Array[]
  
  autoLevels() {
    // Find optimal black and white points
    const blackPoint = this.findPercentile(0.1)
    const whitePoint = this.findPercentile(99.9)
    
    this.updateLevels({
      shadows: blackPoint,
      highlights: whitePoint,
      midtones: 1.0
    })
  }
}
```

#### Color Balance Adjustment
```typescript
interface ColorBalanceAdjustment {
  shadows: {
    cyanRed: number     // -100 to 100
    magentaGreen: number
    yellowBlue: number
  }
  midtones: {
    cyanRed: number
    magentaGreen: number
    yellowBlue: number
  }
  highlights: {
    cyanRed: number
    magentaGreen: number
    yellowBlue: number
  }
  
  preserveLuminosity: boolean
}
```

#### Vibrance Adjustment
```typescript
interface VibranceAdjustment {
  vibrance: number      // -100 to 100
  saturation: number    // -100 to 100
}

class VibranceEngine {
  // Vibrance selectively increases saturation of less-saturated colors
  // Protects skin tones
  adjustVibrance(pixel: RGBA, amount: number): RGBA {
    const hsl = rgbToHsl(pixel)
    const skinToneProtection = this.getSkinToneProtection(hsl.h)
    
    // Less saturated colors get more boost
    const boost = (1 - hsl.s) * amount * (1 - skinToneProtection)
    hsl.s = Math.min(1, hsl.s + boost)
    
    return hslToRgb(hsl)
  }
}
```

### 2.8 Advanced Filters

#### Motion Blur
```typescript
interface MotionBlurFilter {
  angle: number         // 0-360 degrees
  distance: number      // 1-2000 pixels
}

class MotionBlurKernel {
  apply(angle: number, distance: number) {
    // Generate motion blur kernel
    const kernel = this.generateMotionKernel(angle, distance)
    
    // GPU convolution
    return this.gpu.createKernel(function(image, kernel) {
      // Convolution implementation
    })
  }
}
```

#### Radial Blur
```typescript
interface RadialBlurFilter {
  amount: number        // 1-100
  method: 'spin' | 'zoom'
  quality: 'draft' | 'good' | 'best'
  center: Point
}
```

#### Smart Sharpen
```typescript
interface SmartSharpenFilter {
  amount: number        // 0-500%
  radius: number        // 0.1-64 pixels
  reduceNoise: number   // 0-100%
  
  removeType: 'gaussianBlur' | 'lensBlur' | 'motionBlur'
  angle?: number        // For motion blur
  
  shadows: {
    fadeAmount: number  // 0-100%
    tonalWidth: number  // 0-100%
    radius: number      // 1-100px
  }
  highlights: {
    fadeAmount: number
    tonalWidth: number
    radius: number
  }
}
```

### 2.9 AI Tools for Phase 2

```typescript
const phase2AITools = {
  // Drawing assistance
  smoothBrushStroke: {
    name: 'smoothBrushStroke',
    description: 'Apply AI smoothing to last brush stroke',
    parameters: z.object({
      strength: z.number().min(0).max(100)
    })
  },
  
  // Smart selections
  selectSubject: {
    name: 'selectSubject',
    description: 'AI-powered subject selection',
    parameters: z.object({
      refineEdges: z.boolean()
    })
  },
  
  // Content-aware operations
  contentAwareFill: {
    name: 'contentAwareFill',
    description: 'Fill selection with AI-generated content',
    parameters: z.object({
      samplingArea: z.enum(['auto', 'rectangular', 'custom'])
    })
  },
  
  // Text operations
  extractText: {
    name: 'extractText',
    description: 'OCR text from image',
    parameters: z.object({
      languages: z.array(z.string()).optional()
    })
  },
  
  // Auto adjustments
  autoTone: {
    name: 'autoTone',
    description: 'Automatically adjust levels and curves',
    parameters: z.object({})
  },
  
  autoColor: {
    name: 'autoColor',
    description: 'Automatically correct color cast',
    parameters: z.object({})
  }
}
```

## Phase 3: Professional Features (3-4 months)

### 3.1 Advanced Selection Tools

#### Magic Wand Tool [W]
```typescript
interface MagicWandTool {
  tolerance: number     // 0-255
  antiAlias: boolean
  contiguous: boolean
  sampleAllLayers: boolean
  
  // Selection combination modes
  mode: 'new' | 'add' | 'subtract' | 'intersect'
}

class MagicWandEngine {
  select(point: Point, tolerance: number) {
    const targetColor = this.getPixel(point)
    const selection = new Selection()
    
    // Flood fill algorithm with tolerance
    const visited = new Set<string>()
    const queue = [point]
    
    while (queue.length > 0) {
      const current = queue.shift()
      const key = `${current.x},${current.y}`
      
      if (visited.has(key)) continue
      visited.add(key)
      
      const pixel = this.getPixel(current)
      if (this.colorDistance(pixel, targetColor) <= tolerance) {
        selection.addPixel(current)
        
        if (this.contiguous) {
          this.getNeighbors(current).forEach(n => queue.push(n))
        }
      }
    }
    
    if (this.antiAlias) {
      selection.smoothEdges()
    }
    
    return selection
  }
}
```

#### Quick Selection Tool [W]
```typescript
interface QuickSelectionTool {
  size: number          // Brush size
  hardness: number
  spacing: number
  autoEnhance: boolean
  
  mode: 'new' | 'add' | 'subtract'
}

class QuickSelectionEngine {
  private segmentation: ImageSegmentation
  
  select(brushPath: Point[]) {
    // 1. Analyze brush stroke area
    const seedRegion = this.getSeedRegion(brushPath)
    
    // 2. Find similar regions using ML
    const segments = this.segmentation.findSimilar(seedRegion)
    
    // 3. Refine edges
    if (this.autoEnhance) {
      return this.refineSelection(segments)
    }
    
    return segments
  }
  
  private refineSelection(selection: Selection) {
    // Edge detection and refinement
    const edges = this.detectEdges(selection)
    const refined = this.snapToEdges(selection, edges)
    return this.smoothSelection(refined)
  }
}
```

#### Color Range Selection
```typescript
interface ColorRangeSelection {
  sampledColors: RGBA[]
  fuzziness: number     // 0-200
  range: 'sampled' | 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas' | 'highlights' | 'midtones' | 'shadows'
  
  localized: boolean
  rangeRadius: number   // When localized
  
  preview: 'selection' | 'grayscale' | 'blackMatte' | 'whiteMatte' | 'quickMask'
}

class ColorRangeEngine {
  selectRange(range: string, fuzziness: number) {
    switch (range) {
      case 'reds':
        return this.selectHueRange(0, 30, fuzziness)
      case 'highlights':
        return this.selectLuminosityRange(170, 255, fuzziness)
      // etc...
    }
  }
  
  private selectHueRange(minHue: number, maxHue: number, fuzziness: number) {
    const selection = new Selection()
    
    this.forEachPixel((pixel, x, y) => {
      const hsl = rgbToHsl(pixel)
      const distance = this.hueDistance(hsl.h, minHue, maxHue)
      
      if (distance <= fuzziness) {
        const opacity = 1 - (distance / fuzziness)
        selection.addPixel(x, y, opacity)
      }
    })
    
    return selection
  }
}
```

#### Select and Mask Workspace
```typescript
interface SelectAndMask {
  view: {
    mode: 'onion' | 'marching' | 'overlay' | 'onBlack' | 'onWhite' | 'blackWhite' | 'onLayers'
    showEdge: boolean
    showOriginal: boolean
    opacity: number
    edgeRadius: number
  }
  
  edgeDetection: {
    radius: number      // 0-250px
    smartRadius: boolean
  }
  
  globalRefinements: {
    smooth: number      // 0-100
    feather: number     // 0-250px
    contrast: number    // -100 to 100
    shiftEdge: number   // -100 to 100
  }
  
  output: {
    to: 'selection' | 'layerMask' | 'newLayer' | 'newLayerWithMask' | 'newDocument'
    decontaminate: boolean
    amount: number      // Decontamination amount
  }
}

class SelectAndMaskEngine {
  private edgeModel: TensorFlowModel
  
  async refineEdges(selection: Selection, radius: number) {
    // 1. Detect edges using ML model
    const edges = await this.edgeModel.detectEdges(selection, radius)
    
    // 2. Classify edge types (hair, sharp, soft)
    const edgeTypes = await this.classifyEdges(edges)
    
    // 3. Apply appropriate refinement per edge type
    return this.refineByType(selection, edgeTypes)
  }
  
  decontaminateColors(selection: Selection, amount: number) {
    // Remove color fringing from edges
    const edgePixels = this.getEdgePixels(selection)
    
    edgePixels.forEach(pixel => {
      const background = this.estimateBackgroundColor(pixel)
      const foreground = this.estimateForegroundColor(pixel)
      
      // Blend based on alpha and decontamination amount
      pixel.color = this.decontaminateBlend(
        pixel.color, 
        foreground, 
        background, 
        pixel.alpha, 
        amount
      )
    })
  }
}
```

### 3.2 Layer System Enhancement

#### Adjustment Layers
```typescript
interface AdjustmentLayer extends Layer {
  type: 'adjustment'
  adjustmentType: 'levels' | 'curves' | 'brightness' | 'hue' | 'colorBalance' | 'blackWhite' | 'photoFilter' | 'channelMixer' | 'colorLookup'
  settings: AdjustmentSettings
  mask: LayerMask | null
}

class AdjustmentLayerEngine {
  // Non-destructive processing pipeline
  apply(layer: AdjustmentLayer, pixels: ImageData): ImageData {
    const adjustment = this.getAdjustment(layer.adjustmentType)
    
    // Apply through mask if present
    if (layer.mask) {
      return this.applyWithMask(pixels, adjustment, layer.mask)
    }
    
    return adjustment.process(pixels, layer.settings)
  }
  
  // Live preview during adjustment
  preview(layer: AdjustmentLayer, settings: Partial<AdjustmentSettings>) {
    const merged = {...layer.settings, ...settings}
    this.renderPreview(layer, merged)
  }
}
```

#### Layer Blend Modes
```typescript
enum BlendMode {
  // Normal
  Normal = 'normal',
  Dissolve = 'dissolve',
  
  // Darken
  Darken = 'darken',
  Multiply = 'multiply',
  ColorBurn = 'colorBurn',
  LinearBurn = 'linearBurn',
  DarkerColor = 'darkerColor',
  
  // Lighten
  Lighten = 'lighten',
  Screen = 'screen',
  ColorDodge = 'colorDodge',
  LinearDodge = 'linearDodge',
  LighterColor = 'lighterColor',
  
  // Contrast
  Overlay = 'overlay',
  SoftLight = 'softLight',
  HardLight = 'hardLight',
  VividLight = 'vividLight',
  LinearLight = 'linearLight',
  PinLight = 'pinLight',
  HardMix = 'hardMix',
  
  // Inversion
  Difference = 'difference',
  Exclusion = 'exclusion',
  Subtract = 'subtract',
  Divide = 'divide',
  
  // Component
  Hue = 'hue',
  Saturation = 'saturation',
  Color = 'color',
  Luminosity = 'luminosity'
}

class BlendModeEngine {
  private blendFunctions: Map<BlendMode, BlendFunction>
  
  constructor() {
    this.initializeBlendFunctions()
  }
  
  blend(base: RGBA, blend: RGBA, mode: BlendMode, opacity: number): RGBA {
    const blendFunc = this.blendFunctions.get(mode)
    const blended = blendFunc(base, blend)
    
    // Apply opacity
    return {
      r: base.r + (blended.r - base.r) * opacity,
      g: base.g + (blended.g - base.g) * opacity,
      b: base.b + (blended.b - base.b) * opacity,
      a: base.a + (blend.a - base.a) * opacity
    }
  }
  
  // GPU-accelerated blend mode shaders
  createBlendShader(mode: BlendMode) {
    return this.gpu.createKernel(function(base, blend, opacity) {
      // Shader implementation for each blend mode
    }).setOutput([width, height])
  }
}
```

#### Layer Effects
```typescript
interface LayerEffects {
  dropShadow?: DropShadowEffect[]
  innerShadow?: InnerShadowEffect[]
  outerGlow?: GlowEffect
  innerGlow?: GlowEffect
  bevelEmboss?: BevelEmbossEffect
  satin?: SatinEffect
  colorOverlay?: ColorOverlayEffect
  gradientOverlay?: GradientOverlayEffect
  patternOverlay?: PatternOverlayEffect
  stroke?: StrokeEffect
}

interface DropShadowEffect {
  enabled: boolean
  blendMode: BlendMode
  opacity: number       // 0-100
  color: RGBA
  angle: number         // 0-360
  useGlobalLight: boolean
  distance: number      // 0-30000px
  spread: number        // 0-100%
  size: number          // 0-250px
  
  contour: Contour
  antiAliased: boolean
  noise: number         // 0-100%
  layerKnockout: boolean
}

interface BevelEmbossEffect {
  enabled: boolean
  style: 'innerBevel' | 'outerBevel' | 'emboss' | 'pillowEmboss' | 'strokeEmboss'
  technique: 'smooth' | 'chiselHard' | 'chiselSoft'
  depth: number         // 0-1000%
  direction: 'up' | 'down'
  size: number          // 0-250px
  soften: number        // 0-16px
  
  shading: {
    angle: number       // 0-360
    altitude: number    // 0-90
    useGlobalLight: boolean
    
    highlight: {
      mode: BlendMode
      opacity: number
      color: RGBA
    }
    shadow: {
      mode: BlendMode
      opacity: number
      color: RGBA
    }
  }
  
  contour: Contour
  antiAliased: boolean
  
  texture?: {
    pattern: Pattern
    scale: number       // 1-1000%
    depth: number       // -1000 to 1000%
    invert: boolean
    linkWithLayer: boolean
  }
}

class LayerEffectsEngine {
  private effectsCache: Map<string, ImageData>
  
  applyEffects(layer: Layer, effects: LayerEffects): ImageData {
    // Apply effects in correct order
    let result = layer.pixels
    
    // 1. Drop Shadow (renders behind)
    if (effects.dropShadow) {
      result = this.applyDropShadows(result, effects.dropShadow)
    }
    
    // 2. Outer Glow
    if (effects.outerGlow) {
      result = this.applyOuterGlow(result, effects.outerGlow)
    }
    
    // 3. Inner effects...
    // etc.
    
    return result
  }
  
  private applyDropShadow(pixels: ImageData, shadow: DropShadowEffect): ImageData {
    // 1. Create shadow from alpha channel
    const shadowPixels = this.createShadowFromAlpha(pixels)
    
    // 2. Apply gaussian blur
    const blurred = this.gaussianBlur(shadowPixels, shadow.size)
    
    // 3. Apply spread (expand/contract)
    const spread = this.applySpread(blurred, shadow.spread)
    
    // 4. Offset by angle and distance
    const offset = this.offsetPixels(spread, shadow.angle, shadow.distance)
    
    // 5. Colorize and blend
    return this.blend(offset, shadow.color, shadow.blendMode, shadow.opacity)
  }
}
```

#### Smart Objects
```typescript
interface SmartObject extends Layer {
  type: 'smartObject'
  source: {
    type: 'embedded' | 'linked'
    data: ImageData | string  // Data or file path
    originalDimensions: { width: number; height: number }
  }
  
  transform: {
    scale: { x: number; y: number }
    rotation: number
    skew: { x: number; y: number }
    perspective: PerspectiveTransform
  }
  
  filters: SmartFilter[]
}

interface SmartFilter {
  id: string
  type: string
  settings: any
  mask?: FilterMask
  blendMode: BlendMode
  opacity: number
}

class SmartObjectEngine {
  // Non-destructive transforms
  transform(smartObject: SmartObject): ImageData {
    // Always work from original data
    const original = this.getOriginalData(smartObject)
    
    // Apply transforms at highest quality
    return this.applyTransforms(original, smartObject.transform)
  }
  
  // Smart Filters - non-destructive
  applySmartFilters(smartObject: SmartObject): ImageData {
    let result = this.transform(smartObject)
    
    smartObject.filters.forEach(filter => {
      const filterResult = this.applyFilter(result, filter)
      
      if (filter.mask) {
        result = this.applyWithMask(result, filterResult, filter.mask)
      } else {
        result = filterResult
      }
    })
    
    return result
  }
  
  // Convert to Smart Object
  convertToSmartObject(layers: Layer[]): SmartObject {
    // Flatten layers while preserving original data
    const flattened = this.flattenLayers(layers)
    
    return {
      type: 'smartObject',
      source: {
        type: 'embedded',
        data: flattened,
        originalDimensions: this.getDimensions(flattened)
      },
      transform: this.identityTransform(),
      filters: []
    }
  }
}
```

### 3.3 Masking System

#### Layer Masks
```typescript
interface LayerMask {
  type: 'raster' | 'vector'
  data: ImageData | Path2D
  density: number       // 0-100%
  feather: number       // 0-1000px
  linked: boolean       // Linked to layer
  disabled: boolean
}

class LayerMaskEngine {
  createMask(selection?: Selection): LayerMask {
    const mask = {
      type: 'raster' as const,
      data: new ImageData(this.width, this.height),
      density: 100,
      feather: 0,
      linked: true,
      disabled: false
    }
    
    if (selection) {
      // Fill mask with selection
      this.fillMaskFromSelection(mask.data, selection)
    } else {
      // White mask (reveal all)
      this.fillMask(mask.data, 255)
    }
    
    return mask
  }
  
  applyWithMask(base: ImageData, overlay: ImageData, mask: LayerMask): ImageData {
    const result = new ImageData(base.width, base.height)
    
    for (let i = 0; i < base.data.length; i += 4) {
      const maskValue = mask.data.data[i] / 255 * (mask.density / 100)
      
      result.data[i] = base.data[i] + (overlay.data[i] - base.data[i]) * maskValue
      result.data[i + 1] = base.data[i + 1] + (overlay.data[i + 1] - base.data[i + 1]) * maskValue
      result.data[i + 2] = base.data[i + 2] + (overlay.data[i + 2] - base.data[i + 2]) * maskValue
      result.data[i + 3] = base.data[i + 3] + (overlay.data[i + 3] - base.data[i + 3]) * maskValue
    }
    
    return result
  }
}
```

#### Clipping Masks
```typescript
interface ClippingMask {
  baseLayer: string     // Layer ID to clip to
  clippedLayers: string[]  // Layer IDs being clipped
}

class ClippingMaskEngine {
  createClippingMask(baseLayer: Layer, clippedLayer: Layer) {
    // Use base layer's transparency as mask
    const mask = this.extractAlphaChannel(baseLayer)
    return this.applyAlphaMask(clippedLayer, mask)
  }
}
```

#### Vector Masks
```typescript
interface VectorMask {
  path: Path2D
  feather: number
  density: number
}

class VectorMaskEngine {
  rasterizeVectorMask(mask: VectorMask, dimensions: Size): ImageData {
    const canvas = new OffscreenCanvas(dimensions.width, dimensions.height)
    const ctx = canvas.getContext('2d')
    
    // Render path
    ctx.fillStyle = `rgba(255, 255, 255, ${mask.density / 100})`
    ctx.fill(mask.path)
    
    // Apply feather if needed
    if (mask.feather > 0) {
      return this.gaussianBlur(ctx.getImageData(0, 0, dimensions.width, dimensions.height), mask.feather)
    }
    
    return ctx.getImageData(0, 0, dimensions.width, dimensions.height)
  }
}
```

### 3.4 Professional Color Tools

#### Color Grading Panel
```typescript
interface ColorGrading {
  shadows: ColorWheels
  midtones: ColorWheels
  highlights: ColorWheels
  
  global: {
    temperature: number  // -100 to 100
    tint: number        // -100 to 100
    vibrance: number    // -100 to 100
    saturation: number  // -100 to 100
  }
  
  splitToning: {
    highlights: {
      hue: number       // 0-360
      saturation: number // 0-100
    }
    shadows: {
      hue: number
      saturation: number
    }
    balance: number     // -100 to 100
  }
}

interface ColorWheels {
  hue: number          // 0-360
  saturation: number   // 0-100
  luminance: number    // -100 to 100
}

class ColorGradingEngine {
  private luts: Map<string, LUT3D>
  
  grade(pixels: ImageData, settings: ColorGrading): ImageData {
    // Build 3D LUT from settings
    const lut = this.buildLUT(settings)
    
    // Apply LUT with GPU acceleration
    return this.applyLUT3D(pixels, lut)
  }
  
  private buildLUT(settings: ColorGrading): LUT3D {
    const lut = new LUT3D(64) // 64x64x64 LUT
    
    for (let r = 0; r < 64; r++) {
      for (let g = 0; g < 64; g++) {
        for (let b = 0; b < 64; b++) {
          const color = { r: r / 63, g: g / 63, b: b / 63 }
          
          // Apply grading
          let graded = this.applyColorWheels(color, settings)
          graded = this.applySplitToning(graded, settings.splitToning)
          graded = this.applyGlobalAdjustments(graded, settings.global)
          
          lut.set(r, g, b, graded)
        }
      }
    }
    
    return lut
  }
}
```

#### LUT Support
```typescript
interface LUTManager {
  loadLUT(file: File): Promise<LUT3D>
  saveLUT(lut: LUT3D, format: 'cube' | '3dl' | 'csp'): Blob
  
  presets: LUTPreset[]
}

interface LUTPreset {
  name: string
  category: 'cinematic' | 'vintage' | 'blackWhite' | 'creative'
  lut: LUT3D
  thumbnail: ImageData
}

class LUT3D {
  private data: Float32Array
  private size: number
  
  constructor(size: number = 32) {
    this.size = size
    this.data = new Float32Array(size * size * size * 3)
  }
  
  interpolate(r: number, g: number, b: number): RGB {
    // Trilinear interpolation
    const x = r * (this.size - 1)
    const y = g * (this.size - 1)
    const z = b * (this.size - 1)
    
    const x0 = Math.floor(x), x1 = Math.ceil(x)
    const y0 = Math.floor(y), y1 = Math.ceil(y)
    const z0 = Math.floor(z), z1 = Math.ceil(z)
    
    // 8 corner values
    const c000 = this.get(x0, y0, z0)
    const c001 = this.get(x0, y0, z1)
    // ... etc
    
    // Trilinear interpolation
    return this.trilinear(c000, c001, /*...*/, x - x0, y - y0, z - z0)
  }
}
```

#### Channel Mixer
```typescript
interface ChannelMixer {
  red: {
    red: number         // -200 to 200%
    green: number       // -200 to 200%
    blue: number        // -200 to 200%
    constant: number    // -200 to 200%
  }
  green: {
    red: number
    green: number
    blue: number
    constant: number
  }
  blue: {
    red: number
    green: number
    blue: number
    constant: number
  }
  
  monochrome: boolean
  
  presets: ChannelMixerPreset[]
}

class ChannelMixerEngine {
  mix(pixel: RGB, settings: ChannelMixer): RGB {
    if (settings.monochrome) {
      // Use only red channel settings for grayscale
      const gray = 
        pixel.r * settings.red.red / 100 +
        pixel.g * settings.red.green / 100 +
        pixel.b * settings.red.blue / 100 +
        settings.red.constant / 100
      
      return { r: gray, g: gray, b: gray }
    }
    
    return {
      r: pixel.r * settings.red.red / 100 +
         pixel.g * settings.red.green / 100 +
         pixel.b * settings.red.blue / 100 +
         settings.red.constant / 100,
      
      g: pixel.r * settings.green.red / 100 +
         pixel.g * settings.green.green / 100 +
         pixel.b * settings.green.blue / 100 +
         settings.green.constant / 100,
      
      b: pixel.r * settings.blue.red / 100 +
         pixel.g * settings.blue.green / 100 +
         pixel.b * settings.blue.blue / 100 +
         settings.blue.constant / 100
    }
  }
}
```

#### Selective Color
```typescript
interface SelectiveColor {
  method: 'relative' | 'absolute'
  
  colors: {
    reds: CMYKAdjustment
    yellows: CMYKAdjustment
    greens: CMYKAdjustment
    cyans: CMYKAdjustment
    blues: CMYKAdjustment
    magentas: CMYKAdjustment
    whites: CMYKAdjustment
    neutrals: CMYKAdjustment
    blacks: CMYKAdjustment
  }
}

interface CMYKAdjustment {
  cyan: number          // -100 to 100%
  magenta: number       // -100 to 100%
  yellow: number        // -100 to 100%
  black: number         // -100 to 100%
}

class SelectiveColorEngine {
  adjust(pixel: RGB, settings: SelectiveColor): RGB {
    // Determine which color range pixel belongs to
    const range = this.getColorRange(pixel)
    const adjustment = settings.colors[range]
    
    // Convert to CMYK
    const cmyk = this.rgbToCmyk(pixel)
    
    // Apply adjustments
    if (settings.method === 'relative') {
      cmyk.c += cmyk.c * adjustment.cyan / 100
      cmyk.m += cmyk.m * adjustment.magenta / 100
      cmyk.y += cmyk.y * adjustment.yellow / 100
      cmyk.k += cmyk.k * adjustment.black / 100
    } else {
      cmyk.c += adjustment.cyan / 100
      cmyk.m += adjustment.magenta / 100
      cmyk.y += adjustment.yellow / 100
      cmyk.k += adjustment.black / 100
    }
    
    // Convert back to RGB
    return this.cmykToRgb(cmyk)
  }
  
  private getColorRange(pixel: RGB): string {
    const hsl = rgbToHsl(pixel)
    
    // Determine primary color range based on hue
    if (hsl.l < 0.2) return 'blacks'
    if (hsl.l > 0.8) return 'whites'
    if (hsl.s < 0.1) return 'neutrals'
    
    // Color ranges by hue
    if (hsl.h >= 345 || hsl.h < 15) return 'reds'
    if (hsl.h >= 15 && hsl.h < 45) return 'yellows'
    if (hsl.h >= 45 && hsl.h < 165) return 'greens'
    if (hsl.h >= 165 && hsl.h < 195) return 'cyans'
    if (hsl.h >= 195 && hsl.h < 285) return 'blues'
    if (hsl.h >= 285 && hsl.h < 345) return 'magentas'
    
    return 'neutrals'
  }
}
```

### 3.5 Advanced AI Tools

```typescript
const phase3AITools = {
  // Advanced selection
  selectByColor: {
    name: 'selectByColor',
    description: 'Select all pixels of similar color',
    parameters: z.object({
      color: z.string().describe('Hex color to select'),
      tolerance: z.number().min(0).max(255),
      contiguous: z.boolean()
    })
  },
  
  selectHair: {
    name: 'selectHair',
    description: 'AI-powered hair selection',
    parameters: z.object({
      refineRadius: z.number().min(1).max(250),
      smartRadius: z.boolean()
    })
  },
  
  // Smart editing
  faceAwareEdit: {
    name: 'faceAwareEdit',
    description: 'Edit faces intelligently',
    parameters: z.object({
      operation: z.enum(['smooth', 'sharpen', 'brighten', 'retouch']),
      strength: z.number().min(0).max(100),
      preserveTexture: z.boolean()
    })
  },
  
  skyReplacement: {
    name: 'skyReplacement',
    description: 'Replace sky in landscape photos',
    parameters: z.object({
      skyPreset: z.enum(['sunset', 'blue', 'dramatic', 'night', 'custom']),
      customSkyUrl: z.string().optional(),
      edgeFade: z.number().min(0).max(100),
      colorMatch: z.boolean()
    })
  },
  
  // Content generation
  extendCanvas: {
    name: 'extendCanvas',
    description: 'AI-powered canvas extension',
    parameters: z.object({
      direction: z.enum(['left', 'right', 'top', 'bottom', 'all']),
      amount: z.number().min(10).max(1000),
      seamless: z.boolean()
    })
  },
  
  generatePattern: {
    name: 'generatePattern',
    description: 'Create seamless patterns from selection',
    parameters: z.object({
      tileSize: z.number().min(50).max(500),
      variation: z.number().min(0).max(100)
    })
  },
  
  // Professional corrections
  perspectiveCorrection: {
    name: 'perspectiveCorrection',
    description: 'Auto-correct perspective distortion',
    parameters: z.object({
      mode: z.enum(['auto', 'vertical', 'horizontal', 'full']),
      cropToResult: z.boolean()
    })
  },
  
  lensCorrection: {
    name: 'lensCorrection',
    description: 'Correct lens distortions',
    parameters: z.object({
      camera: z.string().optional(),
      lens: z.string().optional(),
      autoDetect: z.boolean(),
      corrections: z.object({
        distortion: z.boolean(),
        vignette: z.boolean(),
        chromaticAberration: z.boolean()
      })
    })
  }
}
```

## Phase 4: Advanced Features & Polish (3-4 months)

### 4.1 Actions & Automation

#### Actions System
```typescript
interface Action {
  id: string
  name: string
  set: string           // Action set name
  steps: ActionStep[]
  isExpanded: boolean
}

interface ActionStep {
  type: 'command' | 'stop' | 'conditional'
  command?: string      // Menu command ID
  parameters?: any
  enabled: boolean
  dialogOptions?: 'show' | 'hide' | 'toggle'
  
  // For conditionals
  condition?: {
    type: 'if' | 'else'
    check: 'documentMode' | 'layerType' | 'hasSelection' | 'custom'
    value?: any
  }
}

class ActionsEngine {
  private recording: boolean = false
  private currentAction: Action | null = null
  private commandHistory: CommandHistoryEntry[] = []
  
  startRecording(actionName: string, setName: string) {
    this.recording = true
    this.currentAction = {
      id: generateId(),
      name: actionName,
      set: setName,
      steps: [],
      isExpanded: true
    }
  }
  
  recordCommand(command: string, parameters: any) {
    if (!this.recording || !this.currentAction) return
    
    this.currentAction.steps.push({
      type: 'command',
      command,
      parameters: this.serializeParameters(parameters),
      enabled: true,
      dialogOptions: 'show'
    })
  }
  
  async playAction(action: Action, options: PlayOptions = {}) {
    for (const step of action.steps) {
      if (!step.enabled) continue
      
      switch (step.type) {
        case 'command':
          await this.executeCommand(step.command, step.parameters, step.dialogOptions)
          break
          
        case 'stop':
          if (options.ignoreStops) continue
          await this.showStopDialog(step)
          break
          
        case 'conditional':
          if (!this.evaluateCondition(step.condition)) {
            // Skip to else or end of conditional
            this.skipConditionalBlock(action, step)
          }
          break
      }
    }
  }
  
  // Batch processing
  async batchProcess(files: File[], action: Action, options: BatchOptions) {
    const results: BatchResult[] = []
    
    for (const file of files) {
      try {
        // Open file
        const document = await this.openFile(file)
        
        // Play action
        await this.playAction(action)
        
        // Save based on options
        const outputFile = await this.saveWithOptions(document, options)
        
        results.push({ 
          status: 'success', 
          input: file.name, 
          output: outputFile 
        })
      } catch (error) {
        results.push({ 
          status: 'error', 
          input: file.name, 
          error: error.message 
        })
      }
    }
    
    return results
  }
}

interface BatchOptions {
  destination: 'saveAndClose' | 'folder'
  folder?: string
  naming: {
    prefix?: string
    suffix?: string
    serialNumber?: number
    serialDigits?: number
  }
  format: ExportFormat
  formatOptions: any
}
```

#### JavaScript API
```typescript
interface OpenShopAPI {
  // Document
  app: {
    activeDocument: Document | null
    documents: Document[]
    foregroundColor: Color
    backgroundColor: Color
    
    open(file: File): Promise<Document>
    newDocument(options: NewDocumentOptions): Document
  }
  
  // Document methods
  Document: {
    width: number
    height: number
    resolution: number
    mode: ColorMode
    layers: Layer[]
    activeLayer: Layer | null
    selection: Selection | null
    
    save(): Promise<void>
    saveAs(path: string, options?: SaveOptions): Promise<void>
    close(save?: boolean): void
    
    resizeImage(width: number, height: number, resolution?: number): void
    resizeCanvas(width: number, height: number, anchor?: AnchorPosition): void
    
    flatten(): void
    trim(type?: TrimType): void
  }
  
  // Layer methods
  Layer: {
    name: string
    visible: boolean
    opacity: number
    blendMode: BlendMode
    
    duplicate(): Layer
    remove(): void
    merge(): void
    rasterize(): void
    
    applyFilter(filter: string, options?: any): void
    adjustments: {
      brightness(value: number): void
      contrast(value: number): void
      curves(points: Point[]): void
      // etc...
    }
  }
  
  // Selection methods
  Selection: {
    bounds: Rect
    
    selectAll(): void
    deselect(): void
    inverse(): void
    
    expand(pixels: number): void
    contract(pixels: number): void
    feather(pixels: number): void
    
    fill(color: Color | Pattern): void
    stroke(options: StrokeOptions): void
  }
  
  // Utility functions
  utilities: {
    convertProfile(source: ColorProfile, destination: ColorProfile): void
    calculateHistogram(): Histogram
    getColorSampler(point: Point, sampleSize: number): Color
  }
}

// Example script
async function watermarkBatch() {
  const watermark = await app.open(watermarkFile)
  
  for (const file of inputFiles) {
    const doc = await app.open(file)
    
    // Copy watermark
    watermark.activeLayer.duplicate(doc)
    
    // Position watermark
    const layer = doc.activeLayer
    layer.translate(
      doc.width - watermark.width - 20,
      doc.height - watermark.height - 20
    )
    
    // Adjust opacity
    layer.opacity = 50
    
    // Save
    await doc.saveAs(`output/${file.name}`, { 
      format: 'jpeg', 
      quality: 90 
    })
    
    doc.close()
  }
}
```

### 4.2 Plugin System

#### Plugin Architecture
```typescript
interface Plugin {
  manifest: PluginManifest
  main: string          // Entry point
  ui?: string          // UI HTML file
  permissions: Permission[]
}

interface PluginManifest {
  id: string
  name: string
  version: string
  author: string
  description: string
  
  host: {
    minVersion: string
    maxVersion?: string
  }
  
  entryPoints: {
    menu?: MenuEntry[]
    panel?: PanelEntry
    filter?: FilterEntry
    tool?: ToolEntry
  }
  
  requiredPermissions: Permission[]
  optionalPermissions: Permission[]
}

type Permission = 
  | 'activeDocument'    // Access current document
  | 'createDocument'    // Create new documents
  | 'filesystem'        // Read/write files
  | 'network'          // Network requests
  | 'clipboard'        // Clipboard access
  | 'ui'              // Create UI panels

class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map()
  private sandbox: PluginSandbox
  
  async loadPlugin(path: string) {
    const manifest = await this.loadManifest(path)
    
    // Validate manifest
    this.validateManifest(manifest)
    
    // Check permissions
    const granted = await this.requestPermissions(manifest.requiredPermissions)
    if (!granted) throw new Error('Required permissions not granted')
    
    // Create sandboxed environment
    const sandbox = this.createSandbox(manifest.permissions)
    
    // Load plugin code
    const plugin = await sandbox.loadPlugin(path, manifest)
    
    // Register plugin
    this.plugins.set(manifest.id, plugin)
    
    // Initialize entry points
    this.registerEntryPoints(plugin, manifest.entryPoints)
  }
  
  private createSandbox(permissions: Permission[]): PluginSandbox {
    // Create restricted API based on permissions
    const api = this.buildRestrictedAPI(permissions)
    
    // Create isolated execution context
    return new PluginSandbox(api)
  }
}

class PluginSandbox {
  private worker: Worker
  private api: RestrictedAPI
  
  constructor(api: RestrictedAPI) {
    this.api = api
    this.worker = new Worker('plugin-sandbox-worker.js')
    
    // Set up message handling
    this.worker.onmessage = this.handleMessage.bind(this)
  }
  
  async execute(code: string, context: any = {}) {
    return new Promise((resolve, reject) => {
      const id = generateId()
      
      this.pendingCalls.set(id, { resolve, reject })
      
      this.worker.postMessage({
        type: 'execute',
        id,
        code,
        context,
        api: this.serializeAPI()
      })
    })
  }
}