# Tool Activation Race Condition Refactor

## Overview

**Problem:** Race condition between tool activation and mouse events causing "Tool X is not active" errors.

**Root Cause:** Mouse events can fire before `tool.onActivate()` completes, but `toolStore.getActiveTool()` already returns the tool.

**Solution:** Implement state machine with defensive programming in base classes.

## Architecture Changes

### 1. Tool State Machine

```typescript
enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING', 
  ACTIVE = 'ACTIVE'
}

interface ToolWithState extends Tool {
  state: ToolState;
  canvas: CanvasManager | null;
}
```

### 2. EventToolStore Refactor

- Add state tracking to all registered tools
- Make `activateTool()` properly async with state transitions
- Update `getActiveTool()` to only return `ACTIVE` tools

### 3. BaseTool Refactor

- Change `getCanvas()` to return `null` instead of throwing
- Add state guards to all mouse event handlers
- Delegate to protected `handle*` methods for tool logic

## Implementation Plan

### Phase 1: Core Infrastructure (Days 1-2)

#### Step 1.1: Update Tool State Interface
- [ ] Add `ToolState` enum to `lib/editor/canvas/types.ts`
- [ ] Extend `Tool` interface with `state` and `canvas` properties
- [ ] Update `EventToolStore` state interface

#### Step 1.2: Refactor EventToolStore
- [ ] Add state machine logic to `activateTool()`
- [ ] Update `getActiveTool()` to check state
- [ ] Add proper async/await handling
- [ ] Remove the 100ms setTimeout hack from AppInitializer

#### Step 1.3: Refactor BaseTool
- [ ] Add `state` property
- [ ] Change `getCanvas()` to return `null` instead of throwing
- [ ] Add state guards to `onMouseMove`, `onMouseDown`, `onMouseUp`
- [ ] Create protected `handle*` methods for delegation

#### Step 1.4: Add EventQueue to Canvas
- [ ] Create `EventQueue` class
- [ ] Integrate with Canvas component mouse handlers
- [ ] Add proper cleanup

### Phase 2: Tool Migration (Days 3-7)

#### Step 2.1: Transform Tools (Priority 1)
**Tools:** move, crop, rotate, flip, resize, hand, zoom

- [ ] **MoveTool** - `lib/editor/tools/transform/moveTool.ts`
  - [ ] Change `onMouseMove` → `handleMouseMove`
  - [ ] Add null checks for `getCanvas()`
  - [ ] Update all canvas access points (12 locations)
  - [ ] Test tool activation/deactivation
  - [ ] Test mouse events during activation

- [ ] **CropTool** - `lib/editor/tools/transform/cropTool.ts`
  - [ ] Change `onMouseDown`, `onMouseMove`, `onMouseUp` → `handle*`
  - [ ] Add null checks for `getCanvas()` (9 locations)
  - [ ] Update crop handles and overlay logic
  - [ ] Test crop selection and execution

- [ ] **RotateTool** - `lib/editor/tools/transform/rotateTool.ts`
  - [ ] Refactor mouse handlers (8 `getCanvas()` calls)
  - [ ] Update rotation handles and preview
  - [ ] Test rotation with keyboard modifiers

- [ ] **FlipTool** - `lib/editor/tools/transform/flipTool.ts`
  - [ ] Refactor button handlers (5 `getCanvas()` calls)
  - [ ] Update flip operations
  - [ ] Test horizontal/vertical flips

- [ ] **ResizeTool** - `lib/editor/tools/transform/resizeTool.ts`
  - [ ] Refactor mouse handlers (4 `getCanvas()` calls)
  - [ ] Update resize handles and constraints
  - [ ] Test proportional and free resize

- [ ] **HandTool** - `lib/editor/tools/transform/handTool.ts`
  - [ ] Refactor pan handlers (4 `getCanvas()` calls)
  - [ ] Update cursor states
  - [ ] Test panning and spacebar activation

- [ ] **ZoomTool** - `lib/editor/tools/transform/zoomTool.ts`
  - [ ] Refactor zoom handlers (9 `getCanvas()` calls)
  - [ ] Update zoom modes and constraints
  - [ ] Test zoom-in/zoom-out and fit modes

#### Step 2.2: Selection Tools (Priority 2)
**Tools:** marqueeRect, marqueeEllipse, lasso, magicWand, quickSelection

- [ ] **MarqueeRectTool** - `lib/editor/tools/selection/marqueeRectTool.ts`
  - [ ] Refactor selection drawing (1 `getCanvas()` call)
  - [ ] Update selection preview
  - [ ] Test rectangular selections

- [ ] **MarqueeEllipseTool** - `lib/editor/tools/selection/marqueeEllipseTool.ts`
  - [ ] Refactor selection drawing (2 `getCanvas()` calls)
  - [ ] Update ellipse preview
  - [ ] Test circular selections

- [ ] **LassoTool** - `lib/editor/tools/selection/lassoTool.ts`
  - [ ] Refactor path drawing (6 `getCanvas()` calls)
  - [ ] Update path smoothing
  - [ ] Test freehand selections

- [ ] **MagicWandTool** - `lib/editor/tools/selection/magicWandTool.ts`
  - [ ] Refactor pixel sampling (5 `getCanvas()` calls)
  - [ ] Update tolerance algorithms
  - [ ] Test color-based selections

- [ ] **QuickSelectionTool** - `lib/editor/tools/selection/quickSelectionTool.ts`
  - [ ] Refactor brush-based selection
  - [ ] Update edge detection
  - [ ] Test intelligent selections

#### Step 2.3: Drawing Tools (Priority 3)
**Tools:** brush, eraser, gradient

- [ ] **BrushTool** - `lib/editor/tools/drawing/brushTool.ts`
  - [ ] Refactor stroke drawing
  - [ ] Update pressure sensitivity
  - [ ] Test brush dynamics and blending

- [ ] **EraserTool** - `lib/editor/tools/drawing/eraserTool.ts`
  - [ ] Refactor erasing logic
  - [ ] Update eraser modes
  - [ ] Test background vs object erasing

- [ ] **GradientTool** - `lib/editor/tools/drawing/gradientTool.ts`
  - [ ] Refactor gradient creation
  - [ ] Update gradient types
  - [ ] Test linear, radial, and angular gradients

#### Step 2.4: Text Tools (Priority 4)
**Tools:** horizontalType, verticalType, typeMask, typeOnPath

- [ ] **HorizontalTypeTool** - `lib/editor/tools/text/HorizontalTypeTool.ts`
  - [ ] Refactor text creation (3 `getCanvas()` calls)
  - [ ] Update text editing mode
  - [ ] Test text input and formatting

- [ ] **VerticalTypeTool** - `lib/editor/tools/text/VerticalTypeTool.ts`
  - [ ] Refactor vertical text logic (2 `getCanvas()` calls)
  - [ ] Update text orientation
  - [ ] Test vertical text layout

- [ ] **TypeMaskTool** - `lib/editor/tools/text/TypeMaskTool.ts`
  - [ ] Refactor mask creation (2 `getCanvas()` calls)
  - [ ] Update clipping logic
  - [ ] Test text as selection mask

- [ ] **TypeOnPathTool** - `lib/editor/tools/text/TypeOnPathTool.ts`
  - [ ] Refactor path following (2 `getCanvas()` calls)
  - [ ] Update curve calculations
  - [ ] Test text along paths

#### Step 2.5: Adjustment Tools (Priority 5)
**Tools:** brightness, contrast, saturation, hue, exposure

- [ ] **BrightnessTool** - `lib/editor/tools/adjustments/brightnessTool.ts`
  - [ ] Refactor WebGL filter application
  - [ ] Update real-time preview
  - [ ] Test brightness adjustments

- [ ] **ContrastTool** - `lib/editor/tools/adjustments/contrastTool.ts`
  - [ ] Refactor contrast curves
  - [ ] Update histogram preview
  - [ ] Test contrast adjustments

- [ ] **SaturationTool** - `lib/editor/tools/adjustments/saturationTool.ts`
  - [ ] Refactor HSL adjustments
  - [ ] Update color preview
  - [ ] Test saturation changes

- [ ] **HueTool** - `lib/editor/tools/adjustments/hueTool.ts`
  - [ ] Refactor hue shifting
  - [ ] Update color wheel preview
  - [ ] Test hue rotations

- [ ] **ExposureTool** - `lib/editor/tools/adjustments/exposureTool.ts`
  - [ ] Refactor exposure calculations
  - [ ] Update EV stops
  - [ ] Test exposure adjustments

#### Step 2.6: Filter Tools (Priority 6)
**Tools:** blur, sharpen, grayscale, invert, vintageEffects

- [ ] **BlurTool** - `lib/editor/tools/filters/blurTool.ts`
  - [ ] Refactor Gaussian blur
  - [ ] Update radius controls
  - [ ] Test blur effects

- [ ] **SharpenTool** - `lib/editor/tools/filters/sharpenTool.ts`
  - [ ] Refactor unsharp mask
  - [ ] Update sharpening amount
  - [ ] Test sharpening effects

- [ ] **GrayscaleTool** - `lib/editor/tools/filters/grayscaleTool.ts`
  - [ ] Refactor desaturation
  - [ ] Update channel mixing
  - [ ] Test grayscale conversion

- [ ] **InvertTool** - `lib/editor/tools/filters/invertTool.ts`
  - [ ] Refactor color inversion
  - [ ] Update channel inversion
  - [ ] Test color negative effects

- [ ] **VintageEffectsTool** - `lib/editor/tools/filters/vintageEffectsTool.ts`
  - [ ] Refactor vintage filters
  - [ ] Update effect combinations
  - [ ] Test vintage presets

#### Step 2.7: Navigation Tools (Priority 7)
**Tools:** eyedropper

- [ ] **EyedropperTool** - `lib/editor/tools/eyedropperTool.ts`
  - [ ] Refactor color sampling (2 `getCanvas()` calls)
  - [ ] Update color preview
  - [ ] Test color picking

#### Step 2.8: AI-Native Tools (Priority 8)
**Tools:** imageGeneration, variationGrid, aiPromptBrush, styleTransferBrush, smartSelection, magicEraser, promptAdjustment

- [ ] **ImageGenerationTool** - `lib/editor/tools/ai-native/imageGenerationCanvasTool.ts`
  - [ ] Refactor generation placement
  - [ ] Update progress indicators
  - [ ] Test image generation workflow

- [ ] **VariationGridTool** - `lib/editor/tools/ai-native/variationGridTool.ts`
  - [ ] Refactor variation display (1 `getCanvas()` call)
  - [ ] Update grid layout
  - [ ] Test variation selection

- [ ] **AIPromptBrush** - `lib/editor/tools/ai-native/aiPromptBrush.ts`
  - [ ] Refactor brush strokes (1 `getCanvas()` call)
  - [ ] Update prompt application
  - [ ] Test AI-guided painting

- [ ] **StyleTransferBrush** - `lib/editor/tools/ai-native/styleTransferBrush.ts`
  - [ ] Refactor style application
  - [ ] Update style preview
  - [ ] Test style transfer brush

- [ ] **SmartSelectionTool** - `lib/editor/tools/ai-native/smartSelectionTool.ts`
  - [ ] Refactor AI selection
  - [ ] Update edge detection
  - [ ] Test intelligent selections

- [ ] **MagicEraserTool** - `lib/editor/tools/ai-native/magicEraserTool.ts`
  - [ ] Refactor content-aware erasing
  - [ ] Update inpainting logic
  - [ ] Test magic eraser

- [ ] **PromptAdjustmentTool** - `lib/editor/tools/ai-native/promptAdjustmentTool.ts`
  - [ ] Refactor prompt-based adjustments
  - [ ] Update parameter inference
  - [ ] Test AI adjustments

#### Step 2.9: AI Service Tools (Priority 9)
**Tools:** backgroundRemoval, faceEnhancement, inpainting, outpainting, semanticSelection

- [ ] **BackgroundRemovalTool** - `lib/ai/tools/BackgroundRemovalTool.ts`
  - [ ] Refactor background detection
  - [ ] Update masking logic
  - [ ] Test background removal

- [ ] **FaceEnhancementTool** - `lib/ai/tools/FaceEnhancementTool.ts`
  - [ ] Refactor face detection
  - [ ] Update enhancement algorithms
  - [ ] Test face improvements

- [ ] **InpaintingTool** - `lib/ai/tools/InpaintingTool.ts`
  - [ ] Refactor mask-based inpainting
  - [ ] Update content generation
  - [ ] Test object removal/replacement

- [ ] **OutpaintingTool** - `lib/ai/tools/OutpaintingTool.ts`
  - [ ] Refactor canvas extension
  - [ ] Update boundary blending
  - [ ] Test image expansion

- [ ] **SemanticSelectionTool** - `lib/ai/tools/SemanticSelectionTool.ts`
  - [ ] Refactor object recognition
  - [ ] Update selection accuracy
  - [ ] Test semantic selections

### Phase 3: Integration & Testing (Days 8-10)

#### Step 3.1: Canvas Component Updates
- [ ] Update mouse event handlers to use EventQueue
- [ ] Remove race condition workarounds
- [ ] Test tool switching during mouse events
- [ ] Test rapid tool activation/deactivation

#### Step 3.2: AppInitializer Cleanup
- [ ] Remove setTimeout hack for tool activation
- [ ] Add proper canvas readiness detection
- [ ] Test initialization order
- [ ] Verify all tools are registered correctly

#### Step 3.3: Integration Testing
- [ ] Test all 50+ tools for race conditions
- [ ] Test tool switching during active operations
- [ ] Test mouse events during tool activation
- [ ] Test keyboard shortcuts and tool activation
- [ ] Test AI tool execution with proper activation

#### Step 3.4: Performance Testing
- [ ] Measure tool activation times
- [ ] Test EventQueue performance with rapid events
- [ ] Verify no memory leaks in state machine
- [ ] Test with high-frequency mouse events

## Testing Checklist

### Per-Tool Testing
For each tool, verify:
- [ ] No "Tool X is not active" errors
- [ ] Tool activates properly when selected
- [ ] Mouse events work correctly during activation
- [ ] Tool deactivates cleanly when switching
- [ ] All tool-specific functionality works
- [ ] No performance regressions

### Integration Testing
- [ ] Rapid tool switching works
- [ ] Mouse events during activation are queued properly
- [ ] Keyboard shortcuts activate tools correctly
- [ ] AI tool execution works with state machine
- [ ] Canvas operations work across all tools
- [ ] No race conditions in any scenario

### Regression Testing
- [ ] All existing functionality preserved
- [ ] No breaking changes in tool APIs
- [ ] Performance is same or better
- [ ] Memory usage is stable
- [ ] Error handling is improved

## Success Criteria

- ✅ Zero "Tool X is not active" errors
- ✅ All 50+ tools work reliably
- ✅ No race conditions in tool activation
- ✅ Better error handling and debugging
- ✅ Cleaner, more maintainable code
- ✅ Future-proof architecture for new tools

## Risk Mitigation

### High-Risk Changes
1. **BaseTool refactor** - Affects all tools
   - Mitigation: Thorough testing, gradual rollout
2. **EventToolStore state machine** - Core system change
   - Mitigation: Comprehensive unit tests, integration tests
3. **Canvas event handling** - Critical user interaction
   - Mitigation: Performance testing, user testing

### Rollback Plan
- Keep original implementations in git history
- Feature flag the new state machine
- Ability to disable EventQueue if needed
- Tool-by-tool rollback capability

## Progress Tracking

**Phase 1 Progress:** 0/4 steps complete
**Phase 2 Progress:** 0/45 tools migrated  
**Phase 3 Progress:** 0/4 integration steps complete

**Overall Progress:** 0/53 total items complete (0%)

---

*Last Updated: [Date]*
*Next Review: [Date]* 