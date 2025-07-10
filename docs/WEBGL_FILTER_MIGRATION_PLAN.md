# WebGL Filter Migration Plan

## Overview

This document outlines the migration of existing Konva-based filter tools to high-performance WebGL filters using the WebGLImageFilter library, integrated with our event-sourced architecture.

## Why WebGL Filters?

### Current Limitations with Konva Filters
1. **CPU-based processing** - Slow on large images (4K+)
2. **Limited filter options** - Only basic filters available
3. **No filter chaining** - Each filter requires separate pass
4. **Poor real-time performance** - Laggy preview during adjustment

### WebGL Advantages
1. **GPU acceleration** - 10-100x faster than CPU filters
2. **Rich filter library** - 20+ professional filters available
3. **Efficient chaining** - Multiple filters in single GPU pass
4. **Real-time preview** - Smooth adjustment experience

## Architecture Design

### 1. Filter System Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Filter Tools Layer                     │
│  (BrightnessTool, ContrastTool, VintageTool, etc.)    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              WebGL Filter Manager                       │
│  • Manages WebGLImageFilter instance                   │
│  • Handles filter chains and caching                   │
│  • Integrates with event system                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            WebGLImageFilter Library                     │
│  • GPU-accelerated filter processing                   │
│  • 20+ built-in filters                               │
│  • Filter chaining support                            │
└─────────────────────────────────────────────────────────┘
```

### 2. Integration with Event System

Every WebGL filter operation maintains our event-sourced architecture:

```typescript
WebGL Filter Applied → FilterAppliedEvent → EventStore → History/Undo
                    ↓                    ↓
              TypedEventBus         TypedCanvasStore
                    ↓                    ↓
              UI Updates           State Updates
```

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 WebGL Filter Manager Service

```typescript
// lib/editor/filters/WebGLFilterManager.ts
export class WebGLFilterManager {
  private static instance: WebGLFilterManager
  private webglFilter: WebGLImageFilter | null = null
  private eventStore: EventStore
  private typedEventBus: TypedEventBus
  private resourceManager: ResourceManager
  
  constructor(
    eventStore: EventStore,
    typedEventBus: TypedEventBus,
    resourceManager: ResourceManager
  ) {
    this.eventStore = eventStore
    this.typedEventBus = typedEventBus
    this.resourceManager = resourceManager
  }
  
  async initialize(): Promise<void> {
    // Load WebGLImageFilter library
    await this.loadWebGLImageFilter()
    
    // Initialize WebGL context
    this.webglFilter = new window.WebGLImageFilter()
    
    // Register cleanup
    this.resourceManager.registerCleanup('webgl-filter', () => {
      this.webglFilter?.destroy()
    })
  }
  
  async applyFilter(
    imageNode: Konva.Image,
    filterType: string,
    params: Record<string, any>,
    executionContext?: ExecutionContext
  ): Promise<void> {
    // Extract image from Konva
    const image = imageNode.image() as HTMLImageElement
    
    // Apply WebGL filter
    const filtered = await this.processWithWebGL(image, filterType, params)
    
    // Update Konva image
    imageNode.image(filtered)
    imageNode.cache() // Clear Konva filters
    
    // Emit event
    const event = new FilterAppliedEvent(
      'canvas',
      filterType,
      params,
      [imageNode.id()],
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    if (executionContext) {
      await executionContext.emit(event)
    } else {
      this.eventStore.append(event)
      this.typedEventBus.emit('filter.applied', event.getData())
    }
  }
}
```

#### 1.2 Service Registration

```typescript
// In AppInitializer.ts
container.registerSingleton('WebGLFilterManager', () => {
  const manager = new WebGLFilterManager(
    container.get('EventStore'),
    container.get('TypedEventBus'),
    container.get('ResourceManager')
  )
  manager.initialize()
  return manager
})
```

### Phase 2: Base WebGL Filter Tool

#### 2.1 WebGLFilterTool Base Class

```typescript
// lib/editor/tools/base/WebGLFilterTool.ts
import { BaseTool } from './BaseTool'
import type { WebGLFilterManager } from '@/lib/editor/filters/WebGLFilterManager'

export abstract class WebGLFilterTool extends BaseTool {
  protected filterManager: WebGLFilterManager | null = null
  
  protected abstract getFilterType(): string
  protected abstract getDefaultParams(): Record<string, any>
  
  protected async setupTool(): Promise<void> {
    // Get filter manager from DI container
    const container = (window as any).__serviceContainer
    this.filterManager = container.get('WebGLFilterManager')
    
    // Initialize default parameters
    const defaultParams = this.getDefaultParams()
    Object.entries(defaultParams).forEach(([key, value]) => {
      this.setOption(key, value)
    })
  }
  
  protected async applyWebGLFilter(params: Record<string, any>): Promise<void> {
    if (!this.filterManager) {
      throw new Error('WebGL Filter Manager not initialized')
    }
    
    const targets = this.getTargetImages()
    
    for (const target of targets) {
      await this.filterManager.applyFilter(
        target.node as Konva.Image,
        this.getFilterType(),
        params,
        this.executionContext
      )
    }
    
    // Redraw canvas
    const canvas = this.getCanvas()
    canvas.konvaStage.batchDraw()
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    // Apply filter when options change
    const params = this.getAllOptions()
    this.applyWebGLFilter(params)
  }
}
```

### Phase 3: Tool Migration

#### 3.1 Tools to Migrate from Konva to WebGL

| Tool | Current Implementation | WebGL Filter | Priority |
|------|----------------------|--------------|----------|
| BrightnessTool | Konva.Filters.Brighten | brightness() | High |
| ContrastTool | Konva.Filters.Contrast | contrast() | High |
| SaturationTool | Konva.Filters.HSL | saturation() | High |
| HueTool | Konva.Filters.HSL | hue() | High |
| GrayscaleTool | Konva.Filters.Grayscale | desaturateLuminance() | Medium |
| SepiaTool | Konva.Filters.Sepia | sepia() | Medium |
| InvertTool | Konva.Filters.Invert | negative() | Medium |
| SharpenTool | Konva.Filters.Enhance | sharpen() | Medium |
| PixelateTool | Konva.Filters.Pixelate | pixelate() | Low |
| EmbossTool | Konva.Filters.Emboss | emboss() | Low |

#### 3.2 Example Migration: BrightnessTool

```typescript
// lib/editor/tools/adjustments/brightnessTool.ts
import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { WebGLFilterTool } from '../base/WebGLFilterTool'

export class BrightnessTool extends WebGLFilterTool {
  id = TOOL_IDS.BRIGHTNESS
  name = 'Brightness'
  icon = Sun
  cursor = 'default'
  
  protected getFilterType(): string {
    return 'brightness'
  }
  
  protected getDefaultParams(): Record<string, any> {
    return {
      amount: 0 // -1 to 1 range
    }
  }
  
  // Override to handle percentage conversion
  protected async applyWebGLFilter(params: Record<string, any>): Promise<void> {
    // Convert from percentage (-100 to 100) to WebGL range (-1 to 1)
    const webglParams = {
      amount: (params.adjustment || 0) / 100
    }
    
    await super.applyWebGLFilter(webglParams)
  }
}
```

### Phase 4: New WebGL-Only Tools

#### 4.1 Vintage Effects Tool

```typescript
// lib/editor/tools/filters/vintageEffectsTool.ts
import { Camera } from 'lucide-react'
import { WebGLFilterTool } from '../base/WebGLFilterTool'

export class VintageEffectsTool extends WebGLFilterTool {
  id = 'vintage-effects'
  name = 'Vintage Effects'
  icon = Camera
  cursor = 'default'
  
  private effects = [
    'brownie',
    'vintagePinhole',
    'kodachrome',
    'technicolor',
    'polaroid'
  ]
  
  protected getFilterType(): string {
    return this.getOption('effect') as string || 'brownie'
  }
  
  protected getDefaultParams(): Record<string, any> {
    return {
      effect: 'brownie'
    }
  }
  
  // Custom UI would show effect previews
}
```

#### 4.2 Edge Detection Tool

```typescript
// lib/editor/tools/filters/edgeDetectionTool.ts
export class EdgeDetectionTool extends WebGLFilterTool {
  id = 'edge-detection'
  name = 'Edge Detection'
  icon = Scan
  cursor = 'default'
  
  protected getFilterType(): string {
    const mode = this.getOption('mode') as string
    switch (mode) {
      case 'horizontal': return 'sobelX'
      case 'vertical': return 'sobelY'
      default: return 'detectEdges'
    }
  }
  
  protected getDefaultParams(): Record<string, any> {
    return {
      mode: 'all' // all, horizontal, vertical
    }
  }
}
```

### Phase 5: Filter Chaining

#### 5.1 Filter Chain Manager

```typescript
// lib/editor/filters/FilterChainManager.ts
export class FilterChainManager {
  private chains = new Map<string, FilterChain>()
  
  async applyChain(
    imageNode: Konva.Image,
    chainId: string,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const chain = this.chains.get(chainId)
    if (!chain) return
    
    const image = imageNode.image() as HTMLImageElement
    const webglFilter = new WebGLImageFilter()
    
    // Reset and build filter chain
    webglFilter.reset()
    
    for (const filter of chain.filters) {
      this.addFilterToChain(webglFilter, filter)
    }
    
    // Apply all filters in one pass
    const result = webglFilter.apply(image)
    imageNode.image(result)
    
    // Emit batch event
    const event = new FilterChainAppliedEvent(
      'canvas',
      chainId,
      chain.filters,
      [imageNode.id()],
      executionContext?.getMetadata() || { source: 'user' }
    )
    
    // ... emit event
  }
}
```

## Performance Optimizations

### 1. Texture Caching

```typescript
class WebGLFilterManager {
  private textureCache = new Map<string, WebGLTexture>()
  private cacheSize = 0
  private readonly maxCacheSize = 100 * 1024 * 1024 // 100MB
  
  private cacheTexture(imageId: string, texture: WebGLTexture): void {
    // Implement LRU cache with size limits
  }
}
```

### 2. Progressive Processing

For large images (>4K), process in tiles:

```typescript
private async processLargeImage(
  image: HTMLImageElement,
  filterType: string,
  params: any
): Promise<HTMLCanvasElement> {
  const tileSize = 2048 // Max texture size
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')!
  
  // Process in tiles
  for (let y = 0; y < image.height; y += tileSize) {
    for (let x = 0; x < image.width; x += tileSize) {
      const tile = await this.extractTile(image, x, y, tileSize)
      const filtered = await this.processWithWebGL(tile, filterType, params)
      ctx.drawImage(filtered, x, y)
    }
  }
  
  return canvas
}
```

### 3. Real-time Preview

```typescript
class WebGLFilterTool extends BaseTool {
  private previewDebounce: NodeJS.Timeout | null = null
  
  protected onOptionChange(key: string, value: unknown): void {
    // Debounce for real-time preview
    if (this.previewDebounce) {
      clearTimeout(this.previewDebounce)
    }
    
    this.previewDebounce = setTimeout(() => {
      this.applyWebGLFilter(this.getAllOptions())
    }, 16) // 60fps
  }
}
```

## Testing Strategy

### 1. Unit Tests

```typescript
describe('WebGLFilterManager', () => {
  it('should apply brightness filter', async () => {
    const manager = new WebGLFilterManager(...)
    const imageNode = createMockImageNode()
    
    await manager.applyFilter(imageNode, 'brightness', { amount: 0.5 })
    
    expect(imageNode.image()).not.toBe(originalImage)
    expect(eventStore.getEvents()).toHaveLength(1)
  })
})
```

### 2. Performance Benchmarks

```typescript
describe('WebGL Performance', () => {
  it('should process 4K image in under 100ms', async () => {
    const image = create4KTestImage()
    const start = performance.now()
    
    await filterManager.applyFilter(image, 'brightness', { amount: 0.5 })
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })
})
```

### 3. Integration Tests

```typescript
describe('Filter Tool Integration', () => {
  it('should preserve selection during filter application', async () => {
    const tool = new BrightnessTool()
    const canvas = createTestCanvas()
    const selection = createTestSelection()
    
    tool.setExecutionContext(executionContext)
    await tool.applyBrightness(50)
    
    expect(canvas.state.selection).toEqual(selection)
  })
})
```

## Migration Timeline

### Week 1: Infrastructure
- [ ] Implement WebGLFilterManager
- [ ] Create WebGLFilterTool base class
- [ ] Set up service registration
- [ ] Add performance monitoring

### Week 2: Core Filter Migration
- [ ] Migrate BrightnessTool
- [ ] Migrate ContrastTool
- [ ] Migrate SaturationTool
- [ ] Migrate HueTool
- [ ] Test and benchmark

### Week 3: Additional Filters
- [ ] Migrate remaining Konva filters
- [ ] Implement vintage effects
- [ ] Add edge detection
- [ ] Create filter chain support

### Week 4: Polish & Optimization
- [ ] Add texture caching
- [ ] Implement progressive processing
- [ ] Create real-time preview
- [ ] Performance optimization

## Success Metrics

1. **Performance**: 10x speed improvement on 4K images
2. **Features**: 20+ new professional filters
3. **UX**: Real-time preview with <16ms latency
4. **Reliability**: Graceful fallback for WebGL errors
5. **Integration**: Seamless event sourcing maintained

## Available WebGL Filters

### Color Adjustments
- `brightness(amount)` - Adjust brightness (-1 to 1)
- `contrast(amount)` - Adjust contrast (-1 to 1)
- `saturation(amount)` - Adjust saturation (-1 to 1)
- `hue(rotation)` - Rotate hue (0-360 degrees)

### Color Effects
- `negative()` - Invert colors
- `desaturate()` - Grayscale (equal channels)
- `desaturateLuminance()` - Grayscale (luminance-based)
- `sepia()` - Sepia tone effect
- `shiftToBGR()` - Shift RGB to BGR

### Vintage Effects
- `brownie()` - Vintage brown tones
- `vintagePinhole()` - Pinhole camera effect
- `kodachrome()` - Kodachrome film simulation
- `technicolor()` - Technicolor film effect
- `polaroid()` - Polaroid camera effect

### Image Enhancement
- `sharpen(amount)` - Sharpen image
- `emboss(size)` - Emboss effect
- `detectEdges()` - Edge detection
- `sobelX()` - Horizontal edge detection
- `sobelY()` - Vertical edge detection

### Stylization
- `pixelate(amount)` - Pixelate effect

## Notes

- WebGLImageFilter library: https://github.com/phoboslab/WebGLImageFilter
- All filters maintain event sourcing for undo/redo
- WebGL detection with graceful degradation
- Filter parameters stored in events for replay 