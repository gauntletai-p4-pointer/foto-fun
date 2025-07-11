# Transform & Navigation Tools - Photoshop Parity Documentation

## Overview
This document tracks the implementation of Photoshop-style transform and navigation tools in our Konva-based editor, ensuring feature parity with Photoshop's professional capabilities.

## Architecture Status

### ✅ Completed Foundation
- **BaseTool** - Abstract base class providing common tool functionality
  - Event handling (mouse, keyboard)
  - Tool options management
  - Canvas integration
  - Execution context support
  
- **CanvasManager** - Core canvas operations
  - Zoom and pan functionality
  - Transform operations
  - Konva stage management
  - Event emission through TypedEventBus

### ✅ Completed Tools
- **MoveTool** - Basic object selection and movement
  - Click to select objects
  - Drag to move
  - Transformer integration for visual handles
  - Event emission for transforms

- **CropTool** - Basic canvas cropping
  - Drag to create crop area
  - Visual overlay for crop preview
  - Enter to apply, Esc to cancel
  - Aspect ratio constraints with Shift

- **HandTool** - Canvas panning
  - Uses Konva's built-in stage dragging
  - Cursor changes (grab/grabbing)
  - Temporary access via spacebar (needs implementation)

- **ZoomTool** - Canvas zoom control
  - Click to zoom in
  - Alt-click to zoom out
  - Marquee zoom functionality
  - Keyboard shortcuts support

## Tool Implementation Status

### Transform Tools

#### Move Tool (V) - 🟡 PARTIAL
**Implemented:**
- [x] Basic click and drag to move objects
- [x] Visual selection with transformer
- [x] Cursor feedback
- [x] Event emission for undo/redo

**Missing:**
- [ ] Auto-Select option (click anywhere selects topmost layer)
- [ ] Auto-Select Layer vs Group toggle
- [ ] Show Transform Controls option
- [ ] Align/Distribute buttons in options bar
- [ ] Smart Guides for automatic alignment
- [ ] Shift-drag to constrain to 45° angles
- [ ] Alt-drag to duplicate while moving
- [ ] Arrow key nudging (1px, Shift+arrows = 10px)
- [ ] Multiple object selection and movement

#### Crop Tool (C) - 🟡 PARTIAL
**Implemented:**
- [x] Drag to create crop boundary
- [x] Visual overlay showing crop area
- [x] Enter to apply, Esc to cancel
- [x] Basic aspect ratio support

**Missing:**
- [ ] Interactive handles for adjustment
- [ ] Rotation by hovering outside corners
- [ ] Delete Cropped Pixels option
- [ ] Content-Aware Fill for extending beyond image
- [ ] Preset ratio buttons (1:1, 4:3, 16:9, etc.)
- [ ] Overlay options (rule of thirds, grid, golden ratio)
- [ ] Straighten tool integration
- [ ] Options bar with dimension inputs

#### Perspective Crop Tool - ❌ NOT IMPLEMENTED
- [ ] Draw corners to match perspective
- [ ] Transform and crop to correct perspective
- [ ] Output dimension specification
- [ ] Automatic perspective detection

#### Free Transform (Ctrl/Cmd+T) - ❌ NOT IMPLEMENTED
**Basic Transforms:**
- [ ] Scale with corner/edge handles
- [ ] Rotate by dragging outside bounds
- [ ] Skew with Ctrl/Cmd+drag sides
- [ ] Distort with Ctrl/Cmd+drag corners
- [ ] Perspective with Ctrl/Cmd+Alt+Shift+drag

**Transform Options:**
- [ ] Reference point selector (9-point grid)
- [ ] Numeric input for W, H, angle, X, Y
- [ ] Chain link for aspect ratio
- [ ] Reset button
- [ ] Apply/Cancel buttons

**Transform Submenu:**
- [ ] Individual transform modes
- [ ] Rotate 180°, 90° CW/CCW commands
- [ ] Flip Horizontal/Vertical commands

#### Warp Tool - ❌ NOT IMPLEMENTED
- [ ] Mesh grid overlay
- [ ] Bezier handle control
- [ ] Preset warps (Arc, Arch, Bulge, Flag, Wave, etc.)
- [ ] Custom warp mode
- [ ] Grid density options (1x1 to 9x9)

#### Content-Aware Scale - ❌ NOT IMPLEMENTED
- [ ] Intelligent scaling algorithm
- [ ] Protected area painting
- [ ] Skin tone detection
- [ ] Amount slider
- [ ] Alpha channel support

#### Puppet Warp - ❌ NOT IMPLEMENTED
- [ ] Pin placement system
- [ ] Natural deformation algorithm
- [ ] Mesh density options
- [ ] Pin depth control
- [ ] Rotation around pins

### Navigation & Measurement Tools

#### Hand Tool (H) - 🟢 MOSTLY COMPLETE
**Implemented:**
- [x] Click and drag to pan
- [x] Cursor changes (grab/grabbing)
- [x] Clean integration with Konva

**Missing:**
- [ ] Spacebar for temporary hand tool
- [ ] Double-click to fit to screen
- [ ] Scroll All Windows option
- [ ] Flick panning with momentum
- [ ] Overscroll capability
- [ ] Right-click quick zoom menu

#### Zoom Tool (Z) - 🟡 PARTIAL
**Implemented:**
- [x] Click to zoom in
- [x] Alt-click to zoom out
- [x] Marquee zoom
- [x] Keyboard shortcuts (Ctrl/Cmd +/-)

**Missing:**
- [ ] Double-click for 100% view
- [ ] Resize Windows To Fit option
- [ ] Zoom All Windows synchronization
- [ ] Scrubby Zoom (click-drag left/right)
- [ ] Animated zoom transitions
- [ ] Zoom percentage in status bar

#### Rotate View Tool (R) - ❌ NOT IMPLEMENTED
- [ ] Temporary canvas rotation
- [ ] Rotation without affecting image data
- [ ] Reset button
- [ ] Compass indicator
- [ ] Smooth rotation

#### Ruler Tool (I) - ❌ NOT IMPLEMENTED
- [ ] Click-drag measurement
- [ ] Distance, angle, X/Y delta display
- [ ] Multi-segment measurement
- [ ] Straighten Layer button
- [ ] Integration with Info panel

#### Count Tool - ❌ NOT IMPLEMENTED
- [ ] Numbered marker placement
- [ ] Custom colors and groups
- [ ] Count data export
- [ ] Marker management

#### Eyedropper Tool (I) - 🟡 PARTIAL
**Implemented:**
- [x] Basic color sampling
- [x] Magnifier preview
- [x] Sample size options
- [x] RGB color display

**Missing:**
- [ ] Alt-click for background color
- [ ] Show Sampling Ring option
- [ ] Sample from all layers option
- [ ] Right-click color picker access
- [ ] Screen-wide sampling
- [ ] Integration with color stores
- [ ] Info panel integration

#### Color Sampler Tool - ❌ NOT IMPLEMENTED
- [ ] Persistent sample point placement
- [ ] Up to 10 sample points
- [ ] Real-time value tracking
- [ ] Multiple color mode display
- [ ] Info panel integration

## UI/Tool Grouping Implementation Status

### Current Tool Palette Implementation
The tool palette (`components/editor/ToolPalette/index.tsx`) has a basic grouping system:

#### ✅ Implemented
- **Tool Groups Definition** - Groups defined in `TOOL_GROUPS` constant
- **Long-press to Expand** - Hold tool button to see grouped tools
- **Primary Tool Selection** - Remembers last selected tool in group
- **Visual Grouping** - Shows small arrow indicator for grouped tools

#### 🟡 Partially Implemented Groups
- **MARQUEE Group**: Has rect and ellipse, missing single row/column
- **LASSO Group**: Only basic lasso, missing polygonal and magnetic
- **QUICK_SELECTION Group**: Has quick selection and magic wand
- **MOVE Group**: Only move tool (no artboard tool)
- **CROP Group**: Only basic crop, missing slice and perspective crop
- **BRUSH Group**: Only brush, missing pencil, color replacement, mixer brush
- **ERASER Group**: Only basic eraser, missing background and magic eraser
- **TYPE Group**: Has all 4 type tools
- **NAV Group**: Has hand and zoom tools
- **EYEDROPPER Group**: Only eyedropper, missing color sampler, ruler, note, count

#### ❌ Missing Tool Groups (Photoshop Parity)
- **Clone/Healing Group**: Clone Stamp, Pattern Stamp, Healing Brush, Spot Healing, Patch, Content-Aware Move, Red Eye
- **History Brush Group**: History Brush, Art History Brush
- **Paint Bucket Group**: Paint Bucket, Gradient, 3D Material Drop
- **Blur/Sharpen/Smudge Group**: Blur, Sharpen, Smudge
- **Dodge/Burn/Sponge Group**: Dodge, Burn, Sponge
- **Pen Tool Group**: Pen, Freeform Pen, Add/Delete Anchor, Convert Point
- **Path Selection Group**: Path Selection, Direct Selection
- **Shape Tool Group**: Rectangle, Rounded Rectangle, Ellipse, Polygon, Line, Custom Shape

### Options Bar Implementation
The options bar (`components/editor/OptionsBar/index.tsx`) provides tool-specific options:

#### ✅ Implemented
- **Dynamic Options Display** - Shows options based on active tool
- **Option Types Support**:
  - Checkboxes (e.g., Auto-Select for Move tool)
  - Number inputs (e.g., Feather for selections)
  - Button groups (e.g., Selection modes)
  - Sliders (e.g., Opacity, Flow)
  - Dropdowns (e.g., Blend modes)
  - Color pickers

#### 🟡 Partially Implemented Tool Options
- **Move Tool**: Has Auto-Select, Show Transform Controls, missing Align/Distribute buttons
- **Marquee Tools**: Has selection mode, feather, anti-alias, missing Style dropdown
- **Crop Tool**: Shows keyboard hints, missing ratio presets, overlay options, dimensions

#### ❌ Missing Tool Options
- **Transform Tools**: No reference point selector, dimension inputs, maintain ratio toggle
- **Navigation Tools**: No zoom percentage, fit options, rotate angle display
- **Eyedropper**: No sample size dropdown, sample layers toggle

### Tool Organization Improvements Needed

#### 1. Visual Hierarchy
- [ ] Group separators in tool palette
- [ ] Photoshop-style tool icons
- [ ] Better group indicators (small triangle)
- [ ] Keyboard shortcut tooltips

#### 2. Tool Discovery
- [ ] Tool tips with descriptions
- [ ] "What's this?" help system
- [ ] Video tutorials integration
- [ ] Contextual help in options bar

#### 3. Customization
- [ ] Customizable tool palette layout
- [ ] Save/load tool presets
- [ ] Workspace management
- [ ] Quick access toolbar

#### 4. Professional Features
- [ ] Tool recording for actions
- [ ] Tool presets system
- [ ] Context-sensitive options
- [ ] Smart tool switching based on selection

### Supporting Features

#### Info Panel - ❌ NOT IMPLEMENTED
- [ ] Mouse position display
- [ ] Color values under cursor
- [ ] Selection dimensions
- [ ] Layer information
- [ ] Document size and profile
- [ ] Tool-specific measurements

#### Guides, Grid & Snapping - ❌ NOT IMPLEMENTED
**Guides:**
- [ ] Drag from rulers
- [ ] New Guide dialog
- [ ] Smart Guides
- [ ] Guide locking

**Grid:**
- [ ] Customizable spacing
- [ ] Snap to Grid
- [ ] Grid visibility toggle

## Event Integration

### Transform Events
```typescript
// Current implementation
ObjectsTransformedEvent - Basic transform tracking
CanvasCroppedEvent - Crop operations

// Needed events
TransformStartedEvent - For transform initiation
TransformUpdatedEvent - For live preview
TransformCompletedEvent - For finalization
ViewRotatedEvent - For rotate view tool
MeasurementEvent - For ruler/count tools
ColorSampledEvent - For eyedropper/sampler
```

## Keyboard Shortcuts

### Implemented
- V - Move Tool
- C - Crop Tool
- H - Hand Tool
- Z - Zoom Tool
- I - Eyedropper Tool

### Missing
- Ctrl/Cmd+T - Free Transform
- R - Rotate View Tool
- Shift+I - Ruler Tool
- Spacebar - Temporary Hand Tool
- Ctrl/Cmd+0 - Fit to Screen
- Ctrl/Cmd+1 - 100% View

## UI Integration Requirements

### Options Bar
Each tool needs specific options in the top bar:
- **Move Tool**: Auto-Select, Show Transform Controls, Align buttons
- **Crop Tool**: Ratio presets, Delete pixels toggle, Overlay options
- **Transform**: Reference point, dimension inputs, maintain ratio
- **Zoom Tool**: Resize windows, Scrubby zoom, Zoom all windows
- **Eyedropper**: Sample size, Sample layers, Show ring

### Context Menus
- Transform submenu in Edit menu
- View options for guides and grid
- Tool-specific right-click menus

## Performance Considerations

### Transform Operations
- Hardware acceleration for smooth transforms
- Efficient redraw during live preview
- Smart dirty region updates

### Navigation
- Smooth pan and zoom with GPU acceleration
- Efficient tile-based rendering for large canvases
- Momentum scrolling physics

## Next Steps

### Phase 1: Complete Existing Tools
1. Enhance MoveTool with auto-select and constraints
2. Add interactive handles to CropTool
3. Implement spacebar for temporary HandTool
4. Add scrubby zoom to ZoomTool

### Phase 2: Core Transform Tools
1. Implement Free Transform with all modes
2. Add transform options bar
3. Create transform event system
4. Add numeric input support

### Phase 3: Advanced Transform
1. Implement Warp tool
2. Add Content-Aware Scale
3. Implement Puppet Warp
4. Create Perspective Crop

### Phase 4: Measurement & View
1. Implement Ruler Tool
2. Add Rotate View Tool
3. Create Count Tool
4. Implement Color Sampler

### Phase 5: Supporting Systems
1. Create Info Panel
2. Implement Guides system
3. Add Grid and snapping
4. Create Smart Guides

## Testing Checklist

### Transform Tools
- [ ] All transform modes work correctly
- [ ] Numeric inputs update live
- [ ] Constraints (Shift, Alt) work properly
- [ ] Multiple object transforms
- [ ] Undo/redo for all operations

### Navigation Tools
- [ ] Smooth pan and zoom
- [ ] All keyboard shortcuts work
- [ ] Magnifier displays correctly
- [ ] Measurement accuracy
- [ ] Performance with large canvases

### Integration
- [ ] Events fire correctly
- [ ] Options bar updates
- [ ] Tool switching preserves state
- [ ] Memory management
- [ ] Cross-tool interactions 