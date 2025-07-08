# Epic 4: Paint & Clone Tools

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-4-paint-clone-tools`
2. **Base Branch**: Branch off from `main`
3. **Commits**: Use conventional commits (e.g., `feat: add clone stamp tool`, `fix: healing brush blending`)
4. **Pull Request**:
   - Title: "Epic 4: Paint & Clone Tools Implementation"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**:
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Ensure Epic 1's BaseTool class is available

2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed

3. **Testing Requirements**:
   - Test all paint tools with various brush sizes
   - Test clone/healing with different source points
   - Test blend modes and opacity settings
   - Test performance with large brushes
   - Test gradient fills and patterns
   - Verify texture synthesis for healing
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Depends on Epic 1's BaseTool class
- Share brush engine with Epic 1's Brush Tool
- Check #dev-paint channel for algorithm discussions

---

## Overview
This epic covers implementation of painting, cloning, and healing tools in FotoFun. These tools are essential for photo retouching, creative painting, and image restoration.

## Prerequisites
Before starting these tools, ensure:
- [ ] Base Tool Class is implemented (from Epic 1)
- [ ] Command Pattern/History system is working
- [ ] Tool Options Store is understood
- [ ] Basic understanding of pixel manipulation

## Tools to Implement

### Clone & Healing Tools
1. **Clone Stamp Tool (S)**
**MVP Version**
- Alt+click to set source point
- Click and drag to clone from source
- Size and hardness controls
- Opacity control
- Visual indicator for source point
- Aligned/non-aligned modes

**Full Photoshop Parity**
- Sample all layers option
- Clone source panel
- Multiple clone sources (up to 5)
- Show overlay option
- Rotation and scale of clone source
- Offset controls
- Blend modes
- Pressure sensitivity

2. **Pattern Stamp Tool (S)**
**MVP Version**
- Select from basic patterns
- Stamp pattern with size control
- Opacity control
- Basic blend mode (normal)

**Full Photoshop Parity**
- Pattern library management
- Create patterns from selection
- Pattern scale and rotation
- Impressionist mode
- All blend modes
- Pattern preview

3. **Healing Brush Tool (J)**
**MVP Version**
- Alt+click to set source
- Content-aware blending
- Size control
- Basic healing algorithm

**Full Photoshop Parity**
- Texture, structure, color options
- Sample modes (current layer, all layers)
- Diffusion slider
- Replace mode
- Multiple source points
- Preserve texture details

4. **Spot Healing Brush Tool (J)**
**MVP Version**
- Click to heal spots automatically
- Size control
- Content-aware healing
- No source point needed

**Full Photoshop Parity**
- Type options (content-aware, create texture, proximity match)
- Sample all layers
- Better edge detection
- Batch healing mode

5. **Patch Tool (J)**
**MVP Version**
- Draw selection around area
- Drag to source area
- Basic blending

**Full Photoshop Parity**
- Destination/source modes
- Structure and color sliders
- Transparent option
- Better selection tools integration

6. **Red Eye Tool (J)**
   - MVP: Click to remove red eye
   - Full: Pupil size, darken amount

### Paint Tools
7. **Gradient Tool (G)**
**MVP Version**
- Linear gradient
- Basic color stops
- Opacity support
- Click and drag application

**Full Photoshop Parity**
- All gradient types (linear, radial, angle, reflected, diamond)
- Gradient editor
- Gradient presets
- Noise gradients
- Transparency support
- Dither option
- Reverse option
- Multiple gradient fills

8. **Paint Bucket Tool (G)**
**MVP Version**
- Click to fill area
- Tolerance setting
- Contiguous option
- Fill with foreground color

**Full Photoshop Parity**
- Pattern fill option
- All blend modes
- Anti-alias option
- Sample all layers
- Fill selection only

9. **Mixer Brush Tool (B)**
   - MVP: Mix colors while painting
   - Full: Wet, load, mix, flow settings

10. **Color Replacement Tool (B)**
    - MVP: Replace colors while preserving texture
    - Full: Tolerance, sampling modes

### Enhancement Tools
11. **Blur Tool**
    - MVP: Basic gaussian blur brush
    - Full: Surface blur, motion blur brush

12. **Sharpen Tool**
    - MVP: Basic sharpen brush
    - Full: Smart sharpen brush

13. **Smudge Tool**
    - MVP: Basic smudge/push pixels
    - Full: Finger painting mode

### Toning Tools
14. **Dodge Tool (O)**
    - MVP: Lighten areas
    - Full: Highlights/midtones/shadows range

15. **Burn Tool (O)**
    - MVP: Darken areas
    - Full: Highlights/midtones/shadows range

16. **Sponge Tool (O)**
    - MVP: Saturate/desaturate
    - Full: Vibrance mode

## Implementation Guide

### Base Clone/Heal Tool Class
```typescript
abstract class BaseCloneTool extends BaseTool {
  protected sourcePoint: Point | null = null
  protected isSourceSet = false
  protected offset: Point = { x: 0, y: 0 }
  protected aligned = true
  
  protected setupTool(canvas: Canvas): void {
    canvas.selection = false
    
    // Listen for Alt+click to set source
    canvas.on('mouse:down', this.handleMouseDown)
    canvas.on('mouse:move', this.handleMouseMove)
    canvas.on('mouse:up', this.handleMouseUp)
    
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }
  
  protected handleKeyDown = (e: KeyboardEvent): void => {
    if (e.altKey) {
      this.canvas!.defaultCursor = 'copy'
    }
  }
  
  protected handleMouseDown = (e: any): void => {
    const pointer = this.canvas!.getPointer(e.e)
    
    if (e.e.altKey) {
      // Set source point
      this.sourcePoint = { ...pointer }
      this.isSourceSet = true
      this.showSourceIndicator(pointer)
    } else if (this.isSourceSet) {
      // Start cloning
      this.startCloning(pointer)
    }
  }
  
  protected abstract startCloning(point: Point): void
  protected abstract applyClone(from: Point, to: Point): void
}
```

### Clone Stamp Implementation
```typescript
export class CloneStampTool extends BaseCloneTool {
  id = TOOL_IDS.CLONE_STAMP
  name = 'Clone Stamp Tool'
  icon = Stamp
  shortcut = 'S'
  
  private isCloning = false
  private lastPoint: Point | null = null
  
  protected startCloning(point: Point): void {
    this.isCloning = true
    this.lastPoint = point
    
    if (!this.aligned) {
      // Reset offset for non-aligned mode
      this.offset = {
        x: point.x - this.sourcePoint!.x,
        y: point.y - this.sourcePoint!.y
      }
    }
  }
  
  protected handleMouseMove = (e: any): void => {
    if (!this.isCloning || !this.isSourceSet) return
    
    const pointer = this.canvas!.getPointer(e.e)
    
    // Calculate source position
    const sourceX = this.aligned ? 
      this.sourcePoint!.x + (pointer.x - this.lastPoint!.x) :
      pointer.x - this.offset.x
      
    const sourceY = this.aligned ?
      this.sourcePoint!.y + (pointer.y - this.lastPoint!.y) :
      pointer.y - this.offset.y
    
    // Apply clone
    this.applyClone(
      { x: sourceX, y: sourceY },
      pointer
    )
    
    if (this.aligned) {
      this.sourcePoint = { x: sourceX, y: sourceY }
    }
    
    this.lastPoint = pointer
  }
  
  protected applyClone(from: Point, to: Point): void {
    const size = this.options.getOptionValue<number>(this.id, 'size') || 50
    const opacity = this.options.getOptionValue<number>(this.id, 'opacity') || 100
    const hardness = this.options.getOptionValue<number>(this.id, 'hardness') || 100
    
    // Get canvas context
    const ctx = this.canvas!.getContext()
    
    // Sample from source
    const sourceData = ctx.getImageData(
      from.x - size/2,
      from.y - size/2,
      size,
      size
    )
    
    // Apply to destination with opacity
    ctx.globalAlpha = opacity / 100
    ctx.putImageData(sourceData, to.x - size/2, to.y - size/2)
    
    // Record for undo
    this.recordCloneStroke(from, to, size)
  }
}
```

### Healing Brush Implementation
```typescript
export class HealingBrushTool extends BaseCloneTool {
  id = TOOL_IDS.HEALING_BRUSH
  name = 'Healing Brush Tool'
  icon = Bandaid
  shortcut = 'J'
  
  protected applyClone(from: Point, to: Point): void {
    const size = this.options.getOptionValue<number>(this.id, 'size') || 50
    
    // Get texture from source
    const sourceTexture = this.sampleTexture(from, size)
    
    // Get color/luminosity from destination
    const destColor = this.sampleColor(to, size)
    
    // Blend texture with destination color
    const healed = this.blendTextureWithColor(sourceTexture, destColor)
    
    // Apply with feathered edges
    this.applyWithFeather(healed, to, size)
  }
  
  private blendTextureWithColor(
    texture: ImageData,
    color: ColorInfo
  ): ImageData {
    // Complex blending algorithm
    // Preserves texture while matching color/luminosity
    const result = new ImageData(texture.width, texture.height)
    
    for (let i = 0; i < texture.data.length; i += 4) {
      // Extract texture detail
      const detail = this.extractDetail(texture, i)
      
      // Apply to destination color
      result.data[i] = color.r + detail.r
      result.data[i+1] = color.g + detail.g
      result.data[i+2] = color.b + detail.b
      result.data[i+3] = texture.data[i+3]
    }
    
    return result
  }
}
```

### Gradient Tool Implementation
```typescript
export class GradientTool extends BaseTool {
  id = TOOL_IDS.GRADIENT
  name = 'Gradient Tool'
  icon = Gradient
  shortcut = 'G'
  
  private startPoint: Point | null = null
  private previewGradient: fabric.Gradient | null = null
  
  protected handleMouseDown = (e: any): void => {
    const pointer = this.canvas!.getPointer(e.e)
    this.startPoint = pointer
    
    // Create preview gradient
    this.createPreviewGradient(pointer)
  }
  
  protected handleMouseMove = (e: any): void => {
    if (!this.startPoint) return
    
    const pointer = this.canvas!.getPointer(e.e)
    this.updatePreviewGradient(this.startPoint, pointer)
  }
  
  protected handleMouseUp = (e: any): void => {
    if (!this.startPoint) return
    
    const pointer = this.canvas!.getPointer(e.e)
    this.applyGradient(this.startPoint, pointer)
    
    this.startPoint = null
    this.clearPreview()
  }
  
  private createGradient(start: Point, end: Point): fabric.Gradient {
    const type = this.options.getOptionValue<string>(this.id, 'type') || 'linear'
    const colorStops = this.options.getOptionValue<any[]>(this.id, 'colorStops') || [
      { offset: 0, color: '#000000' },
      { offset: 1, color: '#ffffff' }
    ]
    
    if (type === 'linear') {
      return new fabric.Gradient({
        type: 'linear',
        coords: {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y
        },
        colorStops
      })
    } else {
      // Radial gradient
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + 
        Math.pow(end.y - start.y, 2)
      )
      
      return new fabric.Gradient({
        type: 'radial',
        coords: {
          x1: start.x,
          y1: start.y,
          r1: 0,
          x2: start.x,
          y2: start.y,
          r2: radius
        },
        colorStops
      })
    }
  }
}
```

### Tool Options Configuration
```typescript
export const cloneStampOptions: ToolOptionsConfig = {
  toolId: TOOL_IDS.CLONE_STAMP,
  options: [
    {
      id: 'size',
      type: 'slider',
      label: 'Size',
      value: 50,
      props: { min: 1, max: 500, unit: 'px' }
    },
    {
      id: 'hardness',
      type: 'slider',
      label: 'Hardness',
      value: 100,
      props: { min: 0, max: 100, unit: '%' }
    },
    {
      id: 'opacity',
      type: 'slider',
      label: 'Opacity',
      value: 100,
      props: { min: 0, max: 100, unit: '%' }
    },
    {
      id: 'aligned',
      type: 'checkbox',
      label: 'Aligned',
      value: true
    },
    {
      id: 'sampleAllLayers',
      type: 'checkbox',
      label: 'Sample All Layers',
      value: false
    }
  ]
}

export const gradientToolOptions: ToolOptionsConfig = {
  toolId: TOOL_IDS.GRADIENT,
  options: [
    {
      id: 'type',
      type: 'dropdown',
      label: 'Type',
      value: 'linear',
      props: {
        options: [
          { value: 'linear', label: 'Linear' },
          { value: 'radial', label: 'Radial' },
          { value: 'angle', label: 'Angle' },
          { value: 'reflected', label: 'Reflected' },
          { value: 'diamond', label: 'Diamond' }
        ]
      }
    },
    {
      id: 'colorStops',
      type: 'gradient-editor',
      label: 'Gradient',
      value: [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#ffffff' }
      ]
    },
    {
      id: 'opacity',
      type: 'slider',
      label: 'Opacity',
      value: 100,
      props: { min: 0, max: 100, unit: '%' }
    },
    {
      id: 'reverse',
      type: 'checkbox',
      label: 'Reverse',
      value: false
    },
    {
      id: 'dither',
      type: 'checkbox',
      label: 'Dither',
      value: false
    }
  ]
}
```

## Testing Guidelines

### Manual Testing Checklist

#### Clone/Healing Tools
1. **Source Setting**
   - [ ] Alt+click sets source point
   - [ ] Source indicator appears
   - [ ] Source updates in aligned mode
   - [ ] Non-aligned mode maintains offset

2. **Cloning/Healing**
   - [ ] Smooth brush strokes
   - [ ] Size affects sample area
   - [ ] Opacity blends properly
   - [ ] Hardness creates soft edges
   - [ ] Healing blends colors correctly

3. **Edge Cases**
   - [ ] Clone near canvas edges
   - [ ] Clone from/to transparent areas
   - [ ] Large brush sizes perform well
   - [ ] Rapid movements handled

#### Gradient Tool
1. **Gradient Creation**
   - [ ] Click and drag creates gradient
   - [ ] Preview shows while dragging
   - [ ] All gradient types work
   - [ ] Color stops apply correctly

2. **Gradient Options**
   - [ ] Reverse flips gradient
   - [ ] Dither reduces banding
   - [ ] Opacity affects fill
   - [ ] Gradient editor works

### Performance Considerations

```typescript
class ClonePerformanceOptimizer {
  private cache = new Map<string, ImageData>()
  
  sampleWithCache(point: Point, size: number): ImageData {
    const key = `${point.x},${point.y},${size}`
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!
    }
    
    const sample = this.performSample(point, size)
    this.cache.set(key, sample)
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    return sample
  }
}
```

## File Organization for Epic 4

### Paint & Clone Tool Files to Create

#### 1. Tool Implementations
```
lib/
├── tools/
│   ├── clone/
│   │   ├── base/
│   │   │   ├── BaseCloneTool.ts        # Base for clone/heal
│   │   │   ├── CloneUtils.ts           # Shared utilities
│   │   │   └── SourceIndicator.ts      # Source point UI
│   │   ├── CloneStampTool.ts           # Clone stamp
│   │   ├── PatternStampTool.ts         # Pattern stamp
│   │   ├── HealingBrushTool.ts         # Healing brush
│   │   ├── SpotHealingTool.ts          # Spot healing
│   │   ├── PatchTool.ts                # Patch tool
│   │   ├── ContentAwareMoveTool.ts     # Content-aware move
│   │   └── index.ts
│   │
│   ├── paint/
│   │   ├── GradientTool.ts             # Gradient tool
│   │   ├── PaintBucketTool.ts          # Paint bucket
│   │   ├── ColorReplacementTool.ts     # Replace color
│   │   └── index.ts
```

#### 2. Clone/Paint Commands
```
lib/
├── commands/
│   ├── clone/
│   │   ├── CloneStrokeCommand.ts       # Clone stroke
│   │   ├── HealCommand.ts              # Healing operation
│   │   ├── PatchCommand.ts             # Patch operation
│   │   ├── ContentAwareMoveCommand.ts  # CA move
│   │   └── index.ts
│   │
│   ├── paint/
│   │   ├── GradientFillCommand.ts      # Apply gradient
│   │   ├── BucketFillCommand.ts        # Bucket fill
│   │   ├── PatternFillCommand.ts       # Pattern fill
│   │   └── index.ts
```

#### 3. Healing Algorithms
```
lib/
├── healing/
│   ├── algorithms/
│   │   ├── TextureSynthesis.ts         # Texture generation
│   │   ├── PoissonBlending.ts          # Seamless blending
│   │   ├── ContentAwareFill.ts         # CA algorithms
│   │   ├── FrequencyAnalysis.ts        # Frequency domain
│   │   └── index.ts
│   │
│   ├── sampling/
│   │   ├── TextureSampler.ts           # Sample textures
│   │   ├── ColorSampler.ts             # Sample colors
│   │   ├── PatternMatcher.ts           # Match patterns
│   │   └── index.ts
```

#### 4. Gradient System
```
lib/
├── gradients/
│   ├── Gradient.ts                      # Gradient class
│   ├── GradientTypes.ts                 # Linear, radial, etc.
│   ├── GradientEditor.ts                # Edit gradients
│   ├── GradientPresets.ts               # Built-in gradients
│   ├── NoiseGradient.ts                 # Noise gradients
│   └── index.ts

components/
├── editor/
│   ├── GradientEditor/
│   │   ├── index.tsx                   # Gradient editor UI
│   │   ├── ColorStop.tsx               # Color stop control
│   │   ├── GradientPreview.tsx         # Preview strip
│   │   ├── OpacityStop.tsx             # Opacity stops
│   │   └── PresetPicker.tsx            # Gradient presets
```

#### 5. Pattern System
```
lib/
├── patterns/
│   ├── Pattern.ts                       # Pattern class
│   ├── PatternLibrary.ts               # Pattern management
│   ├── PatternGenerator.ts             # Create patterns
│   ├── PatternTiling.ts                # Tiling options
│   └── index.ts

assets/
├── patterns/                           # Pattern files
│   ├── basic/
│   │   ├── dots.png
│   │   ├── stripes.png
│   │   ├── checkers.png
│   │   └── grid.png
│   ├── textures/
│   │   ├── fabric.png
│   │   ├── paper.png
│   │   └── canvas.png
```

#### 6. Clone Source Panel
```
components/
├── panels/
│   ├── CloneSourcePanel/
│   │   ├── index.tsx                   # Main panel
│   │   ├── SourceItem.tsx              # Individual source
│   │   ├── SourcePreview.tsx           # Source preview
│   │   ├── OffsetControls.tsx          # X/Y offset
│   │   ├── ScaleRotateControls.tsx     # Transform source
│   │   └── OverlayOptions.tsx          # Overlay settings
```

#### 7. Tool Options Components
```
components/
├── editor/
│   ├── OptionsBar/
│   │   ├── options/
│   │   │   ├── clone/
│   │   │   │   ├── CloneOptions.tsx    # Size, opacity, etc.
│   │   │   │   ├── HealingOptions.tsx  # Texture, structure
│   │   │   │   ├── PatchOptions.tsx    # Patch settings
│   │   │   │   └── SourceOptions.tsx   # Source settings
│   │   │   ├── paint/
│   │   │   │   ├── GradientOptions.tsx # Gradient type
│   │   │   │   ├── BucketOptions.tsx   # Tolerance, etc.
│   │   │   │   └── PatternOptions.tsx  # Pattern picker
```

#### 8. Pixel Manipulation
```
lib/
├── pixels/
│   ├── PixelProcessor.ts               # Pixel operations
│   ├── ImageDataUtils.ts               # ImageData helpers
│   ├── ColorSpace.ts                   # Color conversions
│   ├── Blending.ts                     # Blend modes
│   ├── Sampling.ts                     # Sampling methods
│   └── index.ts
```

#### 9. Performance Optimization
```
lib/
├── clone/
│   ├── optimization/
│   │   ├── CloneCache.ts               # Cache samples
│   │   ├── TileRenderer.ts             # Tile-based render
│   │   ├── LODSystem.ts                # Level of detail
│   │   ├── WorkerPool.ts               # Web Workers
│   │   └── index.ts
```

#### 10. Constants Updates
```
constants/
├── clone.ts                            # New file with:
                                       # - DEFAULT_CLONE_SIZE
                                       # - DEFAULT_HARDNESS
                                       # - HEALING_MODES
                                       # - SAMPLE_MODES
                                       # - CLONE_LIMITS

├── gradients.ts                        # New file with:
                                       # - GRADIENT_TYPES
                                       # - DEFAULT_GRADIENTS
                                       # - GRADIENT_QUALITY
                                       # - DITHER_TYPES
```

#### 11. Types Updates
```
types/
├── clone.ts                            # New file with:
                                       # - CloneSource interface
                                       # - HealingOptions interface
                                       # - CloneMode enum
                                       # - SampleMode enum

├── paint.ts                            # New file with:
                                       # - GradientType enum
                                       # - ColorStop interface
                                       # - GradientOptions interface
                                       # - FillMode enum
```

#### 12. Hooks for Clone/Paint Tools
```
hooks/
├── useCloneTool.ts                     # Clone tool state
├── useSourcePoint.ts                   # Source management
├── useGradientEditor.ts                # Gradient editing
├── usePatternPicker.ts                 # Pattern selection
```

### Testing Structure
```
__tests__/
├── tools/
│   ├── clone/
│   │   ├── CloneStampTool.test.ts
│   │   ├── HealingBrushTool.test.ts
│   │   ├── SpotHealingTool.test.ts
│   │   └── PatchTool.test.ts
│   ├── paint/
│   │   ├── GradientTool.test.ts
│   │   └── PaintBucketTool.test.ts
│   ├── healing/
│   │   ├── algorithms/
│   │   │   ├── TextureSynthesis.test.ts
│   │   │   └── PoissonBlending.test.ts
```

### Web Workers for Performance
```
workers/
├── clone/
│   ├── cloneSampler.worker.ts         # Sample in worker
│   ├── healingProcessor.worker.ts     # Healing algorithms
│   └── textureAnalyzer.worker.ts      # Texture analysis
```

### Implementation Order

1. **Week 1: Basic Clone Tools**
   - BaseCloneTool class
   - Clone Stamp Tool
   - Basic source indicators
   - Clone commands

2. **Week 2: Healing Tools**
   - Healing Brush Tool
   - Spot Healing Tool
   - Basic healing algorithms
   - Texture synthesis

3. **Week 3: Paint Tools**
   - Gradient Tool (linear/radial)
   - Paint Bucket Tool
   - Gradient editor UI
   - Pattern system setup

4. **Week 4: Advanced Features**
   - Patch Tool
   - Content-Aware Move
   - Advanced algorithms
   - Performance optimization

### Performance Strategies

1. **Tile-Based Processing**
   - Process in small tiles
   - Cache processed tiles
   - Progressive rendering

2. **Web Workers**
   - Offload heavy calculations
   - Parallel processing
   - Non-blocking UI

3. **Smart Caching**
   - Cache source samples
   - Reuse calculations
   - Memory management

## Deliverables Checklist

### MVP Phase
- [ ] Clone Stamp Tool
- [ ] Healing Brush Tool
- [ ] Spot Healing Brush Tool
- [ ] Gradient Tool (linear/radial)
- [ ] Paint Bucket Tool
- [ ] Basic source indicators
- [ ] Tool options for each
- [ ] Undo/redo integration
- [ ] Performance optimization

### Full Photoshop Parity Phase
- [ ] Pattern Stamp Tool
- [ ] Patch Tool
- [ ] Content-Aware Move Tool
- [ ] All gradient types
- [ ] Gradient editor UI
- [ ] Clone source panel
- [ ] Multiple clone sources
- [ ] Advanced healing algorithms
- [ ] Pattern library
- [ ] Pressure sensitivity
- [ ] Sample all layers
- [ ] Blend modes for all tools 

## File Organization

### New Files to Create
```
/lib/tools/
  baseCloneTool.ts         # Base for clone/heal tools
  cloneStampTool.ts        # Clone stamp tool
  patternStampTool.ts      # Pattern stamp tool
  healingBrushTool.ts      # Healing brush
  spotHealingTool.ts       # Spot healing
  patchTool.ts             # Patch tool
  contentAwareMoveTool.ts  # Smart move tool
  redEyeTool.ts            # Red eye removal
  gradientTool.ts          # Gradient fills
  paintBucketTool.ts       # Paint bucket fill
  mixerBrushTool.ts        # Color mixing brush
  colorReplacementTool.ts  # Replace colors
  blurTool.ts              # Blur brush
  sharpenTool.ts           # Sharpen brush
  smudgeTool.ts            # Smudge tool
  dodgeTool.ts             # Lighten tool
  burnTool.ts              # Darken tool
  spongeTool.ts            # Saturate/desaturate

/lib/healing/
  healingEngine.ts         # Core healing algorithms
  textureSynthesis.ts      # Texture generation
  contentAware.ts          # Content-aware fill
  seamCarving.ts           # Smart object removal
  redEyeDetection.ts       # Eye detection algorithm

/lib/gradients/
  gradientEngine.ts        # Gradient rendering
  gradientPresets.ts       # Built-in gradients
  gradientEditor.ts        # Custom gradient creation

/lib/patterns/
  patternLibrary.ts        # Pattern management
  patternEngine.ts         # Pattern rendering
  patternCreator.ts        # Create from selection

/lib/enhancement/
  blurEngine.ts            # Blur algorithms
  sharpenEngine.ts         # Sharpen algorithms
  toningEngine.ts          # Dodge/burn/sponge

/components/panels/
  GradientEditorPanel.tsx  # Gradient editor UI
  PatternPanel.tsx         # Pattern picker
  CloneSourcePanel.tsx     # Clone source options

/components/gradient/
  GradientPicker.tsx       # Quick gradient selector
  GradientEditor.tsx       # Full gradient editor
  GradientPreview.tsx      # Live preview
```

### Updates to Existing Files 