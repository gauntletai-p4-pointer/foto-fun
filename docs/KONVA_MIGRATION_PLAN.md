# Konva.js Migration Plan

## Executive Summary

Migrating from Fabric.js to Konva.js to enable true pixel-based editing capabilities required for a Photoshop alternative.

## Why Konva.js?

### Current Limitations with Fabric.js
1. **No native pixel manipulation** - Everything is object-based
2. **No real eraser tool** - Cannot create pixel-level holes
3. **Limited filter support** - Filters apply to whole objects only
4. **No adjustment layers** - Cannot do non-destructive color corrections
5. **Poor performance** with large images or many layers
6. **No WebGL acceleration** for filters and effects

### Konva.js Advantages
1. **Native pixel operations** via `Konva.Filters` and direct pixel access
2. **True layer system** with compositing and blend modes
3. **WebGL support** via `Konva.FastLayer`
4. **Better performance** for complex scenes
5. **Built-in caching** system for performance
6. **Proper hit detection** for both shapes and pixels
7. **Native support for masks and clipping**

## Architecture Comparison

### Fabric.js Model
```
Canvas
  └── Objects (FabricObject)
       ├── Image
       ├── Text
       ├── Path
       └── Group
```

### Konva.js Model
```
Stage (Canvas)
  └── Layers (Konva.Layer)
       ├── Shapes (Konva.Shape)
       │    ├── Image
       │    ├── Text
       │    └── Path
       └── Groups (Konva.Group)
```

## Migration Strategy

### Phase 1: Create Abstraction Layer (2-3 weeks)

#### 1.1 Canvas Abstraction Interface
```typescript
// lib/editor/canvas/ICanvas.ts
export interface ICanvas {
  // Core operations
  add(object: ICanvasObject): void
  remove(object: ICanvasObject): void
  clear(): void
  renderAll(): void
  
  // Selection
  getActiveObject(): ICanvasObject | null
  setActiveObject(object: ICanvasObject): void
  getActiveObjects(): ICanvasObject[]
  
  // Viewport
  setZoom(zoom: number): void
  getZoom(): number
  pan(x: number, y: number): void
  
  // Pixel operations (new)
  getImageData(x: number, y: number, width: number, height: number): ImageData
  putImageData(imageData: ImageData, x: number, y: number): void
  applyFilter(filter: IFilter, area?: IArea): void
}
```

#### 1.2 Object Abstraction
```typescript
// lib/editor/canvas/ICanvasObject.ts
export interface ICanvasObject {
  id: string
  type: string
  left: number
  top: number
  width: number
  height: number
  angle: number
  opacity: number
  visible: boolean
  
  // Transformations
  setPosition(x: number, y: number): void
  setSize(width: number, height: number): void
  rotate(angle: number): void
  
  // Rendering
  render(ctx: CanvasRenderingContext2D): void
  toObject(): Record<string, unknown>
}
```

#### 1.3 Implementation Adapters
- `FabricCanvasAdapter` - Wraps existing Fabric.js canvas
- `KonvaCanvasAdapter` - Implements same interface with Konva.js

### Phase 2: Implement Dual-Mode System (3-4 weeks)

#### 2.1 Mode Selection
```typescript
export type CanvasMode = 'vector' | 'raster'

export interface CanvasStore {
  mode: CanvasMode
  fabricCanvas: Canvas | null  // For vector mode
  konvaStage: Konva.Stage | null  // For raster mode
  
  // Unified API
  canvas: ICanvas  // Abstract interface
}
```

#### 2.2 Tool Migration Priority
1. **Pixel Tools First** (use Konva)
   - Brush Tool
   - Eraser Tool
   - Clone Stamp
   - Healing Brush
   - Blur/Sharpen
   
2. **Adjustment Tools** (use Konva)
   - Brightness/Contrast
   - Hue/Saturation
   - Levels
   - Curves
   
3. **Selection Tools** (hybrid approach)
   - Marquee (both)
   - Lasso (pixel-based with Konva)
   - Magic Wand (pixel-based with Konva)
   
4. **Vector Tools Last** (keep Fabric for now)
   - Pen Tool
   - Shape Tools
   - Text Tool (initially)

### Phase 3: Full Konva Migration (4-6 weeks)

#### 3.1 Core Components
1. **Canvas Store Migration**
   ```typescript
   // Before (Fabric)
   fabricCanvas: Canvas | null
   
   // After (Konva)
   stage: Konva.Stage | null
   mainLayer: Konva.Layer | null
   pixelLayer: Konva.FastLayer | null  // WebGL accelerated
   ```

2. **Layer System Enhancement**
   ```typescript
   interface Layer {
     id: string
     name: string
     type: 'raster' | 'vector' | 'adjustment' | 'text'
     konvaLayer: Konva.Layer
     blendMode: string
     opacity: number
     masks: Mask[]
   }
   ```

3. **Event System Migration**
   ```typescript
   // Fabric events
   canvas.on('mouse:down', handler)
   
   // Konva events
   stage.on('mousedown', handler)
   layer.on('click', handler)
   shape.on('dragend', handler)
   ```

### Phase 4: New Capabilities (2-3 weeks)

#### 4.1 Pixel-Based Features
1. **True Eraser Tool**
   ```typescript
   class EraserTool {
     erase(x: number, y: number, radius: number) {
       const imageData = layer.getContext().getImageData(...)
       // Manipulate alpha channel
       layer.getContext().putImageData(imageData, ...)
     }
   }
   ```

2. **Adjustment Layers**
   ```typescript
   class AdjustmentLayer extends Konva.Layer {
     adjustments: Adjustment[] = []
     
     applyAdjustments(imageData: ImageData): ImageData {
       // Chain adjustments
       return this.adjustments.reduce(
         (data, adj) => adj.apply(data), 
         imageData
       )
     }
   }
   ```

3. **Smart Filters**
   ```typescript
   // Non-destructive filters
   layer.filters([
     Konva.Filters.Blur,
     Konva.Filters.Brighten,
     customPixelFilter
   ])
   ```

## Implementation Order

### Week 1-2: Foundation
- [ ] Create abstraction interfaces
- [ ] Implement Konva adapter
- [ ] Set up dual-mode infrastructure
- [ ] Create mode switching UI

### Week 3-4: Pixel Tools
- [ ] Migrate Brush tool to Konva
- [ ] Implement Eraser tool (finally!)
- [ ] Add Clone Stamp tool
- [ ] Implement Healing Brush

### Week 5-6: Filters & Adjustments
- [ ] Port existing filters to Konva
- [ ] Add adjustment layers
- [ ] Implement Levels/Curves
- [ ] Add blend modes

### Week 7-8: Selection System
- [ ] Pixel-based selection tools
- [ ] Selection masks
- [ ] Feathering and anti-aliasing
- [ ] Quick selection tool

### Week 9-10: Performance & Polish
- [ ] WebGL acceleration
- [ ] Caching optimization
- [ ] Memory management
- [ ] Tool performance tuning

### Week 11-12: Migration Completion
- [ ] Port remaining tools
- [ ] Update all stores
- [ ] Migration testing
- [ ] Remove Fabric.js

## Technical Considerations

### 1. State Management
- Keep Zustand stores but update interfaces
- Add new stores for pixel operations
- Maintain backward compatibility during migration

### 2. Event System
- Create unified event wrapper
- Map Fabric events to Konva equivalents
- Preserve existing tool behavior

### 3. Serialization
- Design new project format supporting layers
- Migration tool for existing projects
- Support for PSD import/export

### 4. Performance
- Use Konva.FastLayer for pixel operations
- Implement tile-based rendering for large images
- Add GPU acceleration where possible

### 5. Testing Strategy
- Unit tests for abstraction layer
- Integration tests for dual mode
- Performance benchmarks
- User acceptance testing

## Risk Mitigation

1. **Gradual Migration** - Keep Fabric.js during transition
2. **Feature Flags** - Toggle between implementations
3. **Abstraction Layer** - Minimize breaking changes
4. **Comprehensive Testing** - Catch issues early
5. **User Communication** - Clear migration timeline

## Success Metrics

1. **Eraser tool works** properly
2. **Performance improvement** of 50%+ for filters
3. **Memory usage** reduced by 30%
4. **New features** enabled (adjustment layers, masks)
5. **User satisfaction** increased

## Alternative Approaches Considered

1. **Canvas 2D API Only** - Too low-level, lots of work
2. **Paper.js** - Still vector-focused like Fabric
3. **P5.js** - More for creative coding
4. **PixiJS** - Game-focused, less suited for image editing
5. **Custom WebGL** - Too complex, long development time

## Conclusion

Konva.js provides the best balance of:
- Pixel manipulation capabilities
- Performance characteristics  
- Development velocity
- Community support
- Documentation quality

The phased migration approach minimizes risk while enabling new features incrementally. 