# Text System and Drawing Tools Migration Plan

## Executive Summary

This document outlines a comprehensive architectural plan for completing the migration of the text system and drawing tools from Fabric.js to Konva.js. The migration follows event-driven architecture principles, maintains type safety, and eliminates all technical debt.

## Current State Analysis

### Text System
1. **TextWarp.ts** - Already migrated to Konva but lacks proper text-to-path conversion
2. **LayerStyles.ts** - Partially migrated with basic Konva implementation
3. **Text Tools** - Using Konva but with some architectural inconsistencies
4. **Missing Features**:
   - Proper text-to-path conversion for warping
   - Complete gradient support
   - Inner glow effects
   - Advanced text effects

### Drawing Tools
1. **DrawingTool.ts** - Base class has Fabric imports, needs complete refactoring
2. **BrushTool.ts** - Already using Konva, good architecture
3. **EraserTool.ts** - Using Konva with proper composite operations
4. **Issues**:
   - Base class still references Fabric
   - Missing proper path optimization
   - No pressure curve customization
   - Limited blend mode support

### Type Errors
- 51 TypeScript errors remaining
- Missing store implementations
- Tool tracking issues in DrawingTool base class
- Canvas context property mismatches

## Architecture Design

### 1. Event-Driven Text System

```typescript
// Core text system architecture
interface TextSystemArchitecture {
  // Text rendering engine
  textRenderer: KonvaTextRenderer
  
  // Effects pipeline
  effectsPipeline: TextEffectsPipeline
  
  // Path conversion service
  pathConverter: TextToPathConverter
  
  // Event handling
  eventBus: TypedEventBus
  
  // State management
  textStore: EventTextStore
}

// Text effects pipeline
class TextEffectsPipeline {
  private effects: Map<string, TextEffect> = new Map()
  
  register(effect: TextEffect): void
  apply(text: CanvasObject, effects: TextEffectConfig[]): Promise<void>
  remove(text: CanvasObject, effectId: string): Promise<void>
}

// Text-to-path conversion service
interface TextToPathConverter {
  convert(text: string, options: TextOptions): Promise<PathData>
  measureText(text: string, options: TextOptions): TextMetrics
  getGlyphPaths(text: string, font: Font): GlyphPath[]
}
```

### 2. Drawing Tools Architecture

```typescript
// Enhanced drawing tool base
abstract class EnhancedDrawingTool extends BaseTool {
  // Path optimization
  protected pathOptimizer: PathOptimizer
  
  // Pressure handling
  protected pressureHandler: PressureHandler
  
  // Blend mode support
  protected blendModeManager: BlendModeManager
  
  // Performance tracking
  protected performanceMonitor: PerformanceMonitor
  
  // Event-driven state management
  protected drawingState: DrawingState
}

// Path optimization service
interface PathOptimizer {
  optimize(points: Point[], tolerance: number): Point[]
  smooth(points: Point[], tension: number): Point[]
  simplify(path: PathData): PathData
}
```

### 3. Store Architecture

```typescript
// Text store with event sourcing
class EventTextStore extends BaseStore<TextStoreState> {
  protected getEventHandlers() {
    return new Map([
      ['text.created', this.handleTextCreated.bind(this)],
      ['text.modified', this.handleTextModified.bind(this)],
      ['text.effects.applied', this.handleEffectsApplied.bind(this)],
      ['text.warped', this.handleTextWarped.bind(this)]
    ])
  }
}

// Tool store
class EventToolStore extends BaseStore<ToolStoreState> {
  protected getEventHandlers() {
    return new Map([
      ['tool.activated', this.handleToolActivated.bind(this)],
      ['tool.deactivated', this.handleToolDeactivated.bind(this)],
      ['tool.option.changed', this.handleOptionChanged.bind(this)]
    ])
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1-2)

#### 1.1 Create Missing Stores
- [ ] Implement EventTextStore
- [ ] Implement EventToolStore
- [ ] Implement EventToolOptionsStore
- [ ] Register stores in ServiceContainer

#### 1.2 Fix Type System
- [ ] Update canvas types to include missing properties
- [ ] Fix tool event types
- [ ] Remove all 'any' types
- [ ] Add proper type exports

#### 1.3 Service Layer
- [ ] Create TextToPathConverter service
- [ ] Create PathOptimizer service
- [ ] Create BlendModeManager
- [ ] Create PerformanceMonitor

### Phase 2: Text System Migration (Day 3-4)

#### 2.1 Text-to-Path Conversion
```typescript
class OpenTypePathConverter implements TextToPathConverter {
  private fontCache = new Map<string, Font>()
  
  async convert(text: string, options: TextOptions): Promise<PathData> {
    const font = await this.loadFont(options.fontFamily)
    const glyphs = font.stringToGlyphs(text)
    const paths = this.glyphsToPaths(glyphs, options)
    return this.combinePaths(paths)
  }
}
```

#### 2.2 Enhanced Text Effects
```typescript
class KonvaTextEffects {
  // Gradient implementation with proper Konva support
  static applyGradient(text: Konva.Text, gradient: GradientConfig): void {
    if (gradient.type === 'linear') {
      const bounds = text.getClientRect()
      const angle = gradient.angle * Math.PI / 180
      
      // Calculate gradient points
      const gradientVector = this.calculateGradientVector(bounds, angle)
      
      text.fillLinearGradientStartPoint(gradientVector.start)
      text.fillLinearGradientEndPoint(gradientVector.end)
      text.fillLinearGradientColorStops(gradient.colorStops)
    }
  }
  
  // Inner glow using Konva filters
  static applyInnerGlow(text: Konva.Text, glow: GlowConfig): void {
    text.cache()
    text.filters([
      Konva.Filters.RGBA,
      this.createInnerGlowFilter(glow)
    ])
  }
}
```

#### 2.3 Text Warp Enhancement
```typescript
class EnhancedTextWarp {
  constructor(
    private pathConverter: TextToPathConverter,
    private eventBus: TypedEventBus
  ) {}
  
  async warpText(
    textObject: TextObject,
    warpStyle: WarpStyle,
    options: WarpOptions
  ): Promise<Konva.Path> {
    // Convert text to path with proper font metrics
    const pathData = await this.pathConverter.convert(
      textObject.node.text(),
      {
        fontFamily: textObject.node.fontFamily(),
        fontSize: textObject.node.fontSize(),
        letterSpacing: textObject.node.letterSpacing()
      }
    )
    
    // Apply warp transformation
    const warpedPath = this.applyWarpTransform(pathData, warpStyle, options)
    
    // Create Konva path
    const path = new Konva.Path({
      data: warpedPath,
      fill: textObject.node.fill(),
      ...this.copyTextAttributes(textObject.node)
    })
    
    // Emit event
    await this.eventBus.emit('text.warped', {
      textId: textObject.id,
      warpStyle,
      options
    })
    
    return path
  }
}
```

### Phase 3: Drawing Tools Migration (Day 5-6)

#### 3.1 Enhanced Base Drawing Tool
```typescript
abstract class EnhancedDrawingTool extends BaseTool {
  protected drawingState = createReactiveState<DrawingState>({
    isDrawing: false,
    currentPath: [],
    pressure: 1,
    velocity: 0
  })
  
  protected pathOptimizer = new DouglasPeuckerOptimizer()
  protected performanceTracker = new PerformanceTracker()
  
  protected async beginStroke(point: Point, event: ToolEvent): Promise<void> {
    await this.performanceTracker.track('stroke.begin', async () => {
      this.drawingState.set({
        isDrawing: true,
        currentPath: [point],
        pressure: event.pressure || 1
      })
      
      await this.createStrokeNode(point, event)
      
      await this.eventBus.emit('drawing.stroke.started', {
        toolId: this.id,
        point,
        pressure: event.pressure
      })
    })
  }
  
  protected async updateStroke(point: Point, event: ToolEvent): Promise<void> {
    if (!this.drawingState.get().isDrawing) return
    
    await this.performanceTracker.track('stroke.update', async () => {
      // Optimize path in real-time
      const optimizedPath = this.pathOptimizer.addPoint(
        point,
        this.getOption('smoothing') as number
      )
      
      this.drawingState.update(state => ({
        ...state,
        currentPath: optimizedPath,
        pressure: event.pressure || 1
      }))
      
      await this.updateStrokeNode(optimizedPath)
    })
  }
}
```

#### 3.2 Pressure and Velocity Handling
```typescript
class PressureHandler {
  private pressureCurve: BezierCurve
  private velocitySmoothing: number = 0.8
  private lastVelocity: number = 0
  
  processPressure(
    rawPressure: number,
    velocity: number,
    options: PressureOptions
  ): ProcessedPressure {
    // Apply pressure curve
    const curvedPressure = this.pressureCurve.evaluate(rawPressure)
    
    // Smooth velocity
    const smoothedVelocity = this.lastVelocity * this.velocitySmoothing +
                             velocity * (1 - this.velocitySmoothing)
    this.lastVelocity = smoothedVelocity
    
    // Combine pressure and velocity
    const finalPressure = curvedPressure * (1 - options.velocitySensitivity) +
                         (1 - smoothedVelocity) * options.velocitySensitivity
    
    return {
      pressure: finalPressure,
      velocity: smoothedVelocity,
      size: this.calculateSize(finalPressure, options)
    }
  }
}
```

#### 3.3 Blend Mode Manager
```typescript
class KonvaBlendModeManager implements BlendModeManager {
  private blendModeMap = new Map<string, string>([
    ['normal', 'source-over'],
    ['multiply', 'multiply'],
    ['screen', 'screen'],
    ['overlay', 'overlay'],
    ['darken', 'darken'],
    ['lighten', 'lighten'],
    ['color-dodge', 'color-dodge'],
    ['color-burn', 'color-burn'],
    ['hard-light', 'hard-light'],
    ['soft-light', 'soft-light'],
    ['difference', 'difference'],
    ['exclusion', 'exclusion']
  ])
  
  applyBlendMode(node: Konva.Node, blendMode: BlendMode): void {
    const konvaMode = this.blendModeMap.get(blendMode) || 'source-over'
    node.globalCompositeOperation(konvaMode)
  }
  
  // Custom blend modes using filters
  applyCustomBlendMode(node: Konva.Node, blendMode: string): void {
    if (this.requiresFilter(blendMode)) {
      node.cache()
      node.filters([this.createBlendFilter(blendMode)])
    }
  }
}
```

### Phase 4: Integration and Testing (Day 7)

#### 4.1 Integration Tasks
- [ ] Wire up all services in ServiceContainer
- [ ] Update UI components to use new architecture
- [ ] Migrate existing commands to use new services
- [ ] Update AI adapters for new text/drawing systems

#### 4.2 Testing Strategy
```typescript
// Unit tests for each service
describe('TextToPathConverter', () => {
  it('should convert text to path accurately', async () => {
    const converter = new OpenTypePathConverter()
    const path = await converter.convert('Hello', {
      fontFamily: 'Arial',
      fontSize: 60
    })
    expect(path).toMatchSnapshot()
  })
})

// Integration tests
describe('Text System Integration', () => {
  it('should apply multiple effects correctly', async () => {
    const text = createTestText()
    await textEffects.applyGradient(text, gradientConfig)
    await textEffects.applyDropShadow(text, shadowConfig)
    await textEffects.applyStroke(text, strokeConfig)
    
    expect(text.fill()).toBeInstanceOf(Array) // Gradient stops
    expect(text.shadowColor()).toBe(shadowConfig.color)
    expect(text.stroke()).toBe(strokeConfig.color)
  })
})
```

#### 4.3 Performance Benchmarks
- Text rendering: < 16ms for 1000 characters
- Path optimization: < 5ms for 1000 points
- Effect application: < 10ms per effect
- Drawing tool response: < 1ms latency

## Migration Checklist

### Pre-Migration
- [x] Analyze current implementation
- [x] Design new architecture
- [ ] Set up feature flags for gradual rollout
- [ ] Create migration branch

### During Migration
- [ ] Implement core services
- [ ] Migrate text system
- [ ] Migrate drawing tools
- [ ] Fix all TypeScript errors
- [ ] Update documentation
- [ ] Write comprehensive tests

### Post-Migration
- [ ] Remove all Fabric references
- [ ] Performance validation
- [ ] User acceptance testing
- [ ] Deploy with monitoring

## Risk Mitigation

### Technical Risks
1. **Text-to-Path Conversion Accuracy**
   - Mitigation: Use OpenType.js for accurate glyph conversion
   - Fallback: Implement multiple conversion strategies

2. **Performance Regression**
   - Mitigation: Implement aggressive caching
   - Monitor: Real-time performance tracking

3. **Blend Mode Compatibility**
   - Mitigation: Custom WebGL shaders for unsupported modes
   - Fallback: Graceful degradation

## Success Criteria

1. **Zero Fabric Dependencies**: Complete removal of all Fabric imports
2. **Type Safety**: 100% TypeScript coverage with no errors
3. **Performance**: No regression in tool responsiveness
4. **Feature Parity**: All existing features work correctly
5. **Architecture**: Clean, maintainable, event-driven code

## Conclusion

This migration plan provides a comprehensive approach to completing the text system and drawing tools migration. By following event-driven architecture principles and maintaining strict type safety, we ensure a robust, maintainable, and performant implementation that eliminates all technical debt. 