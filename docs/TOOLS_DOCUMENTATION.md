# FotoFun Tools Documentation

This document provides comprehensive documentation for all tools available in the FotoFun photo editing application, including their implementation details, usage patterns, technical architecture, and known issues.

## Table of Contents

1. [Overview](#overview)
2. [Tool Architecture](#tool-architecture)
3. [Tool Categories](#tool-categories)
4. [Selection Tools](#selection-tools)
5. [Drawing Tools](#drawing-tools)
6. [Transform Tools](#transform-tools)
7. [Text Tools](#text-tools)
8. [Adjustment Tools](#adjustment-tools)
9. [Filter Tools](#filter-tools)
10. [Utility Tools](#utility-tools)
11. [AI Integration](#ai-integration)
12. [Technical Implementation](#technical-implementation)
13. [Known Issues and Limitations](#known-issues-and-limitations)

## Overview

FotoFun implements a comprehensive set of 30+ tools for image editing, organized into logical categories. Each tool follows a consistent architecture pattern and integrates with the app's state management, command system, and AI capabilities.

### Core Features
- **Object-based editing** using Fabric.js
- **Non-destructive editing** with full undo/redo support
- **Layer-aware operations** respecting layer visibility and locks
- **AI-powered assistance** for all tools
- **Real-time preview** and feedback
- **Keyboard shortcuts** for efficiency

## Tool Architecture

### Base Classes

All tools inherit from well-designed base classes that provide consistent behavior:

#### `BaseTool`
The fundamental class providing lifecycle management, event handling, and state management.

```typescript
abstract class BaseTool implements Tool {
  abstract id: string
  abstract name: string
  abstract icon: ComponentType
  abstract cursor: string
  abstract shortcut?: string
  
  protected canvas: Canvas | null = null
  protected canvasStore = useCanvasStore.getState()
  protected toolOptionsStore = useToolOptionsStore.getState()
  
  onActivate(canvas: Canvas): void
  onDeactivate(canvas: Canvas): void
  protected abstract setupTool(canvas: Canvas): void
  protected abstract cleanup(canvas: Canvas): void
}
```

#### Specialized Base Classes
- **`DrawingTool`**: Base for brush-like tools with stroke management
- **`BaseTextTool`**: Handles text creation and editing workflows
- **`SelectionTool`**: Manages selection creation and manipulation

### State Management

Tools use the `ToolStateManager` for encapsulated, type-safe state:

```typescript
const state = createToolState<ToolState>({
  isDrawing: false,
  currentStroke: null,
  // ... tool-specific state
})
```

### Command Pattern

All modifications use commands for undo/redo support:

```typescript
const command = new AddObjectCommand(canvas, object)
this.executeCommand(command)
```

## Tool Categories

### Selection Tools

Tools for creating and manipulating selections.

| Tool | Shortcut | Description |
|------|----------|-------------|
| Marquee Rectangle | M | Rectangular selection |
| Marquee Ellipse | M | Elliptical selection |
| Lasso | L | Freeform selection |
| Magic Wand | W | Select by color similarity |
| Quick Selection | Q | AI-powered smart selection |

### Drawing Tools

Tools for freehand drawing and painting.

| Tool | Shortcut | Description |
|------|----------|-------------|
| Brush | B | Freehand drawing with customizable brush |
| Eraser | E | Erase parts of the image (limited) |

### Transform Tools

Tools for moving, scaling, and transforming objects.

| Tool | Shortcut | Description |
|------|----------|-------------|
| Move | V | Move and transform objects |
| Crop | C | Crop the canvas |
| Rotate | R | Rotate the entire canvas |
| Flip | - | Flip horizontally/vertically |
| Resize | - | Resize the canvas |
| Hand | H | Pan the viewport |
| Zoom | Z | Zoom in/out |

### Text Tools

Tools for adding and editing text.

| Tool | Shortcut | Description |
|------|----------|-------------|
| Horizontal Type | T | Add horizontal text |
| Vertical Type | - | Add vertical text |
| Type Mask | - | Create selection from text |
| Type on Path | - | Text along a path |

### Adjustment Tools

Tools for adjusting image properties.

| Tool | Shortcut | Description |
|------|----------|-------------|
| Brightness | - | Adjust image brightness |
| Contrast | - | Adjust image contrast |
| Saturation | - | Adjust color saturation |
| Hue | - | Shift colors around the color wheel |
| Exposure | - | Adjust overall exposure |
| Color Temperature | - | Adjust warm/cool balance |

### Filter Tools

Tools for applying effects and filters.

| Tool | Shortcut | Description |
|------|----------|-------------|
| Blur | - | Apply blur effect |
| Sharpen | - | Sharpen the image |
| Grayscale | - | Convert to black and white |
| Sepia | - | Apply sepia tone |
| Invert | - | Invert colors |

### Utility Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| Eyedropper | I | Sample colors from the canvas |

## Selection Tools

### Marquee Rectangle Tool

**Implementation**: `lib/editor/tools/selection/marqueeRectTool.ts`

Creates rectangular selections by clicking and dragging.

#### Features
- Hold Shift for square selections
- Hold Alt to draw from center
- Supports additive/subtractive selection modes
- Visual feedback during creation

#### Technical Details
```typescript
class MarqueeRectTool extends BaseTool {
  // Creates a fabric.Rect with selection styling
  // Tracks mouse movement for dynamic sizing
  // Converts to selection on mouse up
}
```

### Magic Wand Tool

**Implementation**: `lib/editor/tools/selection/magicWandTool.ts`

Selects areas of similar color based on tolerance.

#### Features
- Adjustable tolerance (0-255)
- Contiguous/non-contiguous modes
- Sample all layers option
- Color similarity calculation

#### Options
- **Tolerance**: Color difference threshold
- **Contiguous**: Only select connected pixels
- **Sample All Layers**: Consider all visible layers

#### Known Limitations
- Simplified implementation using canvas pixel data
- Performance may degrade on large images
- Does not create true selection paths yet

### Quick Selection Tool

**Implementation**: `lib/editor/tools/selection/quickSelectionTool.ts`

AI-powered selection tool that intelligently expands selections.

#### Features
- Machine learning-based edge detection
- Automatic region growing
- Add/subtract modes
- Real-time preview

#### Technical Implementation
- Uses image segmentation algorithms
- Analyzes color, texture, and edge gradients
- Implements flood-fill with smart boundaries

## Drawing Tools

### Brush Tool

**Implementation**: `lib/editor/tools/drawing/brushTool.ts`

Primary freehand drawing tool.

#### Features
- Variable brush size (1-100px)
- Opacity control
- Color picker integration
- Smooth stroke rendering
- Pressure sensitivity (when available)

#### Technical Details
- Uses Fabric.js `PencilBrush`
- Records paths as vector objects
- Supports layer-aware drawing
- Implements stroke smoothing

#### Options
- **Size**: Brush diameter in pixels
- **Opacity**: Stroke transparency (0-100%)
- **Smoothing**: Enable/disable stroke smoothing
- **Color**: Current brush color

### Eraser Tool (Limited)

**Implementation**: `lib/editor/tools/drawing/eraserTool.ts`

⚠️ **Currently disabled in UI due to technical limitations**

#### Issues
The eraser tool faces fundamental incompatibilities with Fabric.js:

1. **Rendering Model**: Fabric.js redraws all objects each frame, making pixel-based erasing temporary
2. **Object vs Pixel**: Erasing is pixel-based, but Fabric.js is object-based
3. **Composite Operations**: `destination-out` doesn't persist across renders

#### Attempted Solutions
1. Custom render with destination-out compositing
2. Convert to image after each stroke
3. Background image approach
4. Clipping mask implementation

#### Recommendation
For true erasing functionality, consider:
- Flattening to raster before erasing
- Using object-based masking instead
- Implementing layer-based compositing

## Transform Tools

### Move Tool

**Implementation**: `lib/editor/tools/transform/moveTool.ts`

Default tool for selecting and transforming objects.

#### Features
- Click to select objects
- Drag to move
- Corner handles for scaling
- Rotation handle
- Multi-select with Shift
- Bounding box for groups

#### Keyboard Modifiers
- **Shift**: Constrain proportions/angles
- **Alt**: Scale from center
- **Ctrl**: Duplicate while dragging

### Crop Tool

**Implementation**: `lib/editor/tools/transform/cropTool.ts`

Non-destructive canvas cropping.

#### Features
- Visual crop overlay
- Aspect ratio constraints
- Rule of thirds grid
- Preset ratios (16:9, 4:3, 1:1, etc.)
- Keyboard fine-tuning

#### Technical Implementation
```typescript
// Creates a semi-transparent overlay
// Tracks crop bounds
// Applies crop without destroying original data
```

### Rotate Tool

**Implementation**: `lib/editor/tools/transform/rotateTool.ts`

Rotates the entire canvas with visual feedback.

#### Features
- Free rotation by dragging
- Preset angles (90°, 180°, 270°)
- Visual rotation preview
- Snap to 15° increments
- Center point indicator

## Text Tools

### Horizontal Type Tool

**Implementation**: `lib/editor/tools/text/horizontalTypeTool.ts`

Standard text creation tool.

#### Features
- Click to place text cursor
- Immediate edit mode
- Font family selection
- Size, color, style options
- Paragraph alignment
- Unicode/emoji support

#### Workflow
1. Click on canvas
2. Automatically enters edit mode
3. Type to add text
4. Click outside to commit
5. Double-click to re-edit

### Type on Path Tool

**Implementation**: `lib/editor/tools/text/typeOnPathTool.ts`

Creates text that follows a custom path.

#### Features
- Draw path with click points
- Text flows along path
- Adjustable text spacing
- Path remains editable
- Supports curves and angles

#### Technical Details
- Calculates character positions along bezier curves
- Rotates each character to match path tangent
- Maintains proper kerning

## Adjustment Tools

All adjustment tools follow a similar pattern:
1. Apply filters to selected objects or entire canvas
2. Provide real-time preview
3. Support incremental adjustments
4. Work with the command system

### Brightness Tool

**Implementation**: `lib/editor/tools/adjustments/brightnessTool.ts`

Adjusts image luminance.

- **Range**: -100 to +100
- **Default**: 0
- **Algorithm**: Linear RGB adjustment

### Contrast Tool

**Implementation**: `lib/editor/tools/adjustments/contrastTool.ts`

Adjusts tonal range.

- **Range**: -100 to +100
- **Default**: 0
- **Algorithm**: Expands/compresses value range

### Saturation Tool

**Implementation**: `lib/editor/tools/adjustments/saturationTool.ts`

Adjusts color intensity.

- **Range**: -100 to +100
- **Default**: 0
- **Algorithm**: HSL color space manipulation

### Color Temperature Tool

**Implementation**: `lib/editor/tools/adjustments/colorTemperatureTool.ts`

Adjusts warm/cool balance.

- **Range**: -100 (cool) to +100 (warm)
- **Default**: 0
- **Algorithm**: Adjusts blue/orange channels

## Filter Tools

### Blur Tool

**Implementation**: `lib/editor/tools/filters/blurTool.ts`

Applies Gaussian blur.

- **Radius**: 0-50 pixels
- **Algorithm**: Convolution with Gaussian kernel
- **Performance**: May be slow on large images

### Sharpen Tool

**Implementation**: `lib/editor/tools/filters/sharpenTool.ts`

Enhances edge contrast.

- **Amount**: 0-100%
- **Algorithm**: Unsharp mask
- **Caution**: Can introduce artifacts

### Effect Filters

Simple one-click filters:
- **Grayscale**: Removes color information
- **Sepia**: Vintage brown tone
- **Invert**: Negative effect

## Utility Tools

### Eyedropper Tool

**Implementation**: `lib/editor/tools/eyedropperTool.ts`

Samples colors from the canvas.

#### Features
- Click to sample any pixel
- Updates foreground color
- Adds to recent colors
- Shows color preview on hover
- Displays hex/RGB values

#### Options
- **Sample All Layers**: Include all visible layers
- **Sample Size**: Point/3x3/5x5 average

## AI Integration

### AI Chat Panel

The AI assistant can use any tool through natural language:

```
User: "Make the image brighter and add some warmth"
AI: *Applies brightness +20 and color temperature +15*
```

### AI-Adapted Tools

The following tools have AI adapters that enable natural language control:

#### Adjustment Tools
- **adjustBrightness**: "make it brighter" → +20-30, "much darker" → -40-60
- **adjustContrast**: "more contrast" → +20-30, "low contrast" → -40-60
- **adjustSaturation**: "more vibrant" → +20-30, "desaturate" → -100
- **adjustHue**: "shift colors" → +45-90, "complementary" → ±180
- **adjustExposure**: "overexpose" → +30-50, "underexpose" → -30-50
- **adjustColorTemperature**: "warmer" → +30-40, "cooler" → -30-40

#### Filter Tools
- **applyBlur**: "slight blur" → 10-20, "heavy blur" → 60-80
- **applySharpen**: "sharpen edges" → 30-40, "strong sharpen" → 60-80
- **applyGrayscale**: "black and white" → enable, "restore color" → disable
- **applySepia**: "vintage effect" → enable, "remove sepia" → disable
- **applyInvert**: "negative effect" → enable, "normal colors" → disable

#### Transform Tools
- **cropImage**: Calculates exact coordinates from intent (e.g., "crop to square", "crop 50%")
- **rotateImage**: "rotate right" → +90°, "slight tilt" → +5-15°
- **flipImage**: "mirror" → horizontal, "upside down" → vertical
- **resizeImage**: "half size" → 50%, "thumbnail" → 150x150px

#### Other Tools
- **addText**: Position-aware text placement with style presets
- **analyzeCanvas**: Describes current canvas state and content

### Tool Adapters

Each tool adapter:
1. **Interprets Intent**: Converts natural language to precise parameters
2. **Validates Input**: Ensures parameters are within valid ranges
3. **Provides Context**: Includes usage patterns in descriptions
4. **Handles Errors**: Graceful failure with helpful messages

Example adapter pattern:
```typescript
class BrightnessToolAdapter extends BaseToolAdapter {
  description = `Adjust brightness. Common patterns:
    - "brighter" → +20 to +30
    - "much brighter" → +40 to +60
    - "slightly darker" → -10 to -15
    NEVER ask for exact values - interpret intent.`
  
  inputSchema = z.object({
    adjustment: z.number().min(-100).max(100)
  })
  
  async execute(params, context) {
    // Apply brightness adjustment
    // Handle layer-aware operations
    // Return success/failure status
  }
}
```

### Agent Workflows

Multiple agent types for complex edits:
- **Sequential Agent**: Step-by-step execution
- **Routing Agent**: Decides best approach
- **Evaluator Agent**: Optimizes results

### Natural Language Processing

The AI understands various phrasings:
- **Intensity**: "slightly", "a bit", "very", "extremely"
- **Direction**: "more", "less", "increase", "decrease"
- **Style**: "vintage", "dramatic", "professional", "soft"
- **Comparison**: "brighter than", "similar to", "like"

## Technical Implementation

### Canvas Integration

All tools interact with Fabric.js canvas:
```typescript
protected canvas: Canvas | null = null

onActivate(canvas: Canvas) {
  this.canvas = canvas
  this.setupTool(canvas)
}
```

### Event Handling

Tools use a consistent event pattern:
```typescript
this.addCanvasEvent('mouse:down', handler)
this.addCanvasEvent('mouse:move', handler)
this.addCanvasEvent('mouse:up', handler)
```

### Layer Integration

Tools respect layer system:
```typescript
if (!LayerAwareMixin.canDrawOnActiveLayer()) {
  return // Layer is locked
}

// Add object to active layer
LayerAwareMixin.addObjectToLayer(object)
```

### Performance Optimization

1. **Debouncing**: Preview updates are throttled
2. **Web Workers**: Heavy computations offloaded
3. **Canvas Caching**: Reuse rendered content
4. **Lazy Loading**: Tools loaded on demand

## Known Issues and Limitations

### General Limitations

1. **Browser Memory**: Large images may cause issues
2. **Touch Support**: Limited on some tools
3. **Performance**: Filters slow on 4K+ images
4. **Undo Limit**: Currently 50 states

### Tool-Specific Issues

#### Eraser Tool
- Disabled due to Fabric.js limitations
- Cannot create true pixel erasure
- Workaround: Use white brush or masks

#### Magic Wand
- Simplified algorithm
- No true marching ants selection
- Performance issues on complex images

#### Text Tools
- Limited typography controls
- No text effects (shadows, outlines)
- Path text can be buggy with sharp angles

#### Filters
- No real-time preview on large images
- Limited to basic filters
- No custom filter creation yet

### Future Improvements

1. **GPU Acceleration**: WebGL for filters
2. **Advanced Selections**: Bezier paths, feathering
3. **More Filters**: Lens correction, noise reduction
4. **Better Text**: Text effects, advanced typography
5. **True Erasing**: Pixel-based layer system
6. **Plugin API**: Custom tool development

## Best Practices

### For Users

1. **Save Often**: Use Ctrl+S regularly
2. **Use Layers**: Organize edits on separate layers
3. **Non-Destructive**: Prefer adjustments over direct edits
4. **Keyboard Shortcuts**: Learn shortcuts for efficiency

### For Developers

1. **Extend Base Classes**: Don't reinvent the wheel
2. **Use Commands**: All modifications through command pattern
3. **Handle Errors**: Graceful degradation
4. **Test Edge Cases**: Empty canvas, locked layers, etc.
5. **Document AI Patterns**: Help AI understand tool usage

## Conclusion

FotoFun's tool system provides a comprehensive, extensible foundation for image editing. While some limitations exist due to the underlying technology choices, the architecture allows for continuous improvement and community contributions. The AI integration sets it apart from traditional editors, making professional editing accessible to everyone. 