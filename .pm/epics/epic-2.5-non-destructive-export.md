# Epic 2.5: Non-Destructive Export System

## Overview
This epic introduces a comprehensive non-destructive export system that allows users to export specific regions, selections, or predefined areas of their canvas without modifying the original workspace. This is essential for workflows where reference images, multiple variations, or different export sizes are needed from a single source file.

## Problem Statement
Currently, users must use the destructive Crop tool to export a specific area of their canvas, which permanently removes other parts of the image including reference materials. This forces users to maintain multiple files or lose their reference context.

## Goals
1. Enable non-destructive export of canvas regions
2. Support multiple export areas from a single canvas
3. Maintain full canvas with reference images while exporting clean versions
4. Provide professional workflow similar to Figma/Sketch artboards

## Features

### 1. Export Region Tool
Draw a rectangle to define an export area without cropping the canvas.

**Implementation:**
- New tool in transform category
- Visual overlay showing export bounds
- Adjustable handles for resizing
- Multiple regions can be defined
- Regions saved with document

**UI/UX:**
- Dashed outline for export regions
- Semi-transparent overlay outside region
- Label regions with names
- Show dimensions in real-time

### 2. Save Selection As
Export the current selection as a new image file.

**Implementation:**
- New menu item: File > Export > Save Selection As...
- Works with any selection (marquee, lasso, magic wand)
- Maintains transparency for non-rectangular selections
- Format options (PNG, JPEG, WebP)

**Workflow:**
1. Make selection with any selection tool
2. File > Export > Save Selection As...
3. Choose format and quality
4. Export only selected pixels

### 3. Artboard/Frame System
Define named, reusable export areas (similar to Figma frames).

**Implementation:**
- Artboard panel (next to Layers)
- Create, name, and manage artboards
- Each artboard remembers position/size
- Export individual or all artboards
- Artboards saved with document

**Features:**
- Preset sizes (social media, web, print)
- Custom dimensions
- Export multiplier (1x, 2x, 3x)
- Different formats per artboard

### 4. Quick Export Presets
One-click export of predefined areas.

**Implementation:**
- Export panel with preset buttons
- User-definable presets
- Keyboard shortcuts
- Batch export support

**Examples:**
- "Logo Area" - exports 200x200 center
- "Header" - exports top 1920x300
- "Square Crop" - exports center square

## Technical Implementation

### Phase 1: Export Region Tool (2 days)
1. Create new tool class extending BaseTool
2. Implement visual feedback system
3. Add region management to document store
4. Create export logic without modifying canvas

### Phase 2: Save Selection As (1 day)
1. Add menu item to File menu
2. Create export dialog component
3. Implement selection-to-image conversion
4. Add format and quality options

### Phase 3: Artboard System (3 days)
1. Create Artboard store
2. Build Artboard panel UI
3. Implement artboard rendering
4. Add import/export functionality
5. Integrate with document save/load

### Phase 4: Quick Export (1 day)
1. Create Export panel
2. Implement preset system
3. Add keyboard shortcuts
4. Build batch export logic

## Benefits

1. **Non-destructive**: Original canvas never modified
2. **Flexible**: Multiple export configurations from one file
3. **Professional**: Industry-standard workflow
4. **Efficient**: No need for multiple files
5. **Time-saving**: Quick export reduces repetitive tasks

## Success Metrics
- Users can export regions without cropping
- Export time reduced by 50%
- Support for 10+ simultaneous export regions
- All exports maintain original quality

## Future Enhancements
- Smart export (auto-detect content)
- Export presets sharing
- Cloud export destinations
- Export history/versioning
- Responsive export sizes

---

## Menu System Enhancement

### Overview
While FotoFun has many powerful features fully implemented, they're not accessible through the traditional menu system. This enhancement will expose existing functionality and add missing features to create a complete, professional menu system.

### Current State Analysis

#### Working Features Not in Menus:
1. **Image Adjustments** (6 tools implemented):
   - Brightness, Contrast, Saturation
   - Hue, Exposure, Color Temperature

2. **Filters** (5 tools implemented):
   - Blur, Sharpen, Grayscale, Sepia, Invert

3. **Layer Operations** (fully functional):
   - New Layer, Duplicate, Delete
   - Merge Down, Merge Visible, Flatten
   - Opacity, Blend Modes, Lock/Unlock

4. **Transform Operations**:
   - Rotate, Flip, Resize (tools exist)

5. **View Operations**:
   - Zoom commands work via shortcuts but not menu

### Implementation Plan

#### Phase 1: Image Menu (2 days)

**Structure:**
```
Image
├── Adjustments >
│   ├── Brightness/Contrast...
│   ├── Hue/Saturation...
│   ├── Exposure...
│   ├── Color Temperature...
│   └── Levels... (new)
├── Auto >
│   ├── Auto Tone
│   ├── Auto Contrast
│   └── Auto Color
├── Image Size...
├── Canvas Size...
├── Rotate Canvas >
│   ├── 90° Clockwise
│   ├── 90° Counter-Clockwise
│   ├── 180°
│   ├── Flip Horizontal
│   └── Flip Vertical
└── Crop... (opens crop tool)
```

**Implementation Details:**
1. Create adjustment dialogs with live preview
2. Implement auto adjustments using histogram analysis
3. Add Image/Canvas size dialogs
4. Connect rotate/flip to existing tools
5. All operations recordable for undo/redo

#### Phase 2: Layer Menu (1 day)

**Structure:**
```
Layer
├── New >
│   ├── Layer...
│   ├── Layer from Background...
│   └── Background from Layer
├── Duplicate Layer
├── Delete Layer
├── Layer Properties...
├── ─────────────
├── Merge Down
├── Merge Visible
├── Flatten Image
├── ─────────────
├── Group Layers
├── Ungroup Layers
├── ─────────────
├── Arrange >
│   ├── Bring to Front
│   ├── Bring Forward
│   ├── Send Backward
│   └── Send to Back
└── Lock >
    ├── Lock All
    ├── Lock Position
    └── Lock Transparency
```

**Implementation Details:**
1. Connect all items to existing LayerStore methods
2. Add layer properties dialog (name, opacity, blend mode)
3. Implement arrange operations
4. Add advanced lock options

#### Phase 3: Filter Menu (2 days)

**Structure:**
```
Filter
├── Blur >
│   ├── Gaussian Blur...
│   ├── Motion Blur... (new)
│   └── Radial Blur... (new)
├── Sharpen >
│   ├── Sharpen...
│   ├── Sharpen More
│   └── Unsharp Mask... (new)
├── Noise >
│   ├── Add Noise... (new)
│   ├── Reduce Noise... (new)
│   └── Dust & Scratches... (new)
├── Stylize >
│   ├── Emboss... (new)
│   ├── Find Edges... (new)
│   └── Glowing Edges... (new)
├── ─────────────
├── Grayscale
├── Sepia...
├── Invert
└── Threshold... (new)
```

**Implementation Details:**
1. Create filter preview dialog system
2. Implement new filters using Fabric.js or custom algorithms
3. Add parameter controls for each filter
4. Ensure all filters work with selections

#### Phase 4: Select Menu Enhancement (1 day)

**Structure:**
```
Select
├── All
├── Deselect
├── Reselect (new)
├── Inverse
├── ─────────────
├── Color Range...
├── Focus Area... (implement AI-based)
├── Subject (implement AI-based)
├── Sky (implement AI-based)
├── ─────────────
├── Modify >
│   ├── Border... (new)
│   ├── Smooth... (new)
│   ├── Expand...
│   ├── Contract...
│   └── Feather...
├── Grow (new)
├── Similar (new)
├── Transform Selection (new)
├── ─────────────
├── Save Selection... (new)
└── Load Selection... (new)
```

**Implementation Details:**
1. Implement Color Range with tolerance control
2. Add AI-powered selections (use image analysis)
3. Implement selection memory (save/load)
4. Add advanced modify operations

#### Phase 5: View Menu Enhancement (1 day)

**Structure:**
```
View
├── Proof Setup > (new)
│   ├── Working CMYK
│   ├── Working RGB
│   └── Monitor RGB
├── Proof Colors (new)
├── Gamut Warning (new)
├── ─────────────
├── Zoom In
├── Zoom Out
├── Fit on Screen
├── Actual Pixels
├── Print Size (new)
├── ─────────────
├── Show >
│   ├── Layer Edges
│   ├── Selection Edges
│   ├── Grid
│   ├── Guides
│   └── Rulers
├── Snap To >
│   ├── Guides
│   ├── Grid
│   └── Layers
├── ─────────────
├── Lock Guides (new)
├── Clear Guides (new)
├── New Guide... (new)
└── Theme >
    ├── Light
    ├── Dark
    └── Auto
```

**Implementation Details:**
1. Enable all zoom menu items (currently disabled)
2. Implement grid and guide system
3. Add ruler display
4. Implement snap functionality
5. Add proof/preview modes

#### Phase 6: Edit Menu Enhancement (0.5 days)

**Additions to existing Edit menu:**
```
Edit
├── ... existing items ...
├── Delete (enable)
├── ─────────────
├── Fill... (new)
├── Stroke... (new)
├── ─────────────
├── Free Transform (new)
├── Transform >
│   ├── Scale
│   ├── Rotate
│   ├── Skew
│   ├── Distort
│   └── Perspective
├── ─────────────
├── Define Pattern... (new)
├── Define Brush... (new)
└── Purge >
    ├── Clipboard
    ├── Histories
    └── All
```

### Technical Architecture

#### Menu Action System
Create a centralized menu action system:

```typescript
// lib/editor/menu/MenuActions.ts
export class MenuActions {
  static async executeBrightnessContrast() {
    const dialog = new AdjustmentDialog({
      title: 'Brightness/Contrast',
      adjustments: ['brightness', 'contrast'],
      onApply: (values) => {
        // Apply adjustments
      }
    })
    dialog.show()
  }
  
  // ... other actions
}
```

#### Dialog System
Create reusable dialog components:

```typescript
// components/dialogs/AdjustmentDialog.tsx
export function AdjustmentDialog({ adjustments, onApply }) {
  // Live preview
  // Slider controls
  // OK/Cancel buttons
}
```

#### Keyboard Shortcuts
Extend the existing shortcut system:

```typescript
// lib/editor/shortcuts/MenuShortcuts.ts
export const menuShortcuts = {
  'cmd+l': 'image.levels',
  'cmd+m': 'image.curves',
  'cmd+u': 'image.hueSaturation',
  // ... etc
}
```

### Implementation Timeline

- **Week 1**: Image Menu + Layer Menu
- **Week 2**: Filter Menu + Select Menu  
- **Week 3**: View Menu + Edit Menu + Testing

### Success Criteria

1. All existing tools accessible via menus
2. Keyboard shortcuts for common operations
3. Live preview for all adjustments
4. Proper undo/redo integration
5. Consistent UI/UX across all dialogs
6. No performance degradation
7. Mobile-responsive menu system

### Future Enhancements

1. **Window Menu**: Manage panels and workspaces
2. **Help Menu**: Tutorials and documentation
3. **Custom Menus**: User-defined menu items
4. **Menu Search**: Quick command palette
5. **Recent Items**: Track recent filters/adjustments

This menu enhancement will transform FotoFun from a tool-based editor to a full-featured application with discoverable features and professional workflows. 