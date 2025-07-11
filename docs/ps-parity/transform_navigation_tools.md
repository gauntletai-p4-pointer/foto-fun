# Transform & Navigation Tools - Photoshop Parity Documentation

## Overview
This document tracks the implementation of Photoshop-style transform and navigation tools in our Konva-based editor, ensuring feature parity with Photoshop's professional capabilities.

## Implementation Status Summary

### ✅ Completed Tools
1. **Move Tool (V)** - Fully refactored with PS parity features ✅
2. **Crop Tool (C)** - Partially refactored with interactive features ✅
3. **Hand Tool (H)** - Basic implementation exists ✅
4. **Zoom Tool (Z)** - Basic implementation exists ✅
5. **Eyedropper Tool (I)** - Basic implementation exists ✅

**All tools are properly wired up in the tool registry and free of lint/type errors.**

### 🚧 In Progress
- Free Transform (Ctrl/Cmd+T) - Not yet implemented
- Rotate View Tool (R) - Not yet implemented

### 📋 Detailed Implementation Status

## 1. Move Tool (V) ✅ COMPLETED
**Status**: Fully Refactored (Dec 2024)
**File**: `/lib/editor/tools/transform/moveTool.ts`

**Implemented Features**:
- ✅ Basic object selection and movement
- ✅ Auto-Select with Layer/Group options
- ✅ Smart Guides for alignment
- ✅ Shift-constrained movement (45° angles)
- ✅ Alt-drag duplication
- ✅ Arrow key nudging (1px, Shift+arrow = 10px)
- ✅ Show Transform Controls option
- ✅ Proper event emission through ExecutionContext
- ✅ Dynamic cursor changes on hover
- ✅ Multi-object selection support
- ✅ Ctrl/Cmd+A select all
- ✅ Ctrl/Cmd+D duplicate
- ✅ Delete key support

**Still Missing** (for future enhancement):
- [ ] Align/Distribute buttons in options bar
- [ ] Layer bounds detection for auto-select
- [ ] Move between layers with auto-select
- [ ] Measurement info while dragging

## 2. Crop Tool (C) 🚧 PARTIALLY COMPLETED
**Status**: Major Refactoring Complete (Dec 2024)
**File**: `/lib/editor/tools/transform/cropTool.ts`

**Implemented Features**:
- ✅ Interactive draggable handles for resizing crop area
- ✅ Rotation handle for rotating crop area
- ✅ Multiple overlay options (Rule of thirds, Grid, Golden ratio)
- ✅ Shield opacity control
- ✅ Aspect ratio constraints with preset options
- ✅ Delete cropped pixels option
- ✅ Proper handle cursors and visual feedback
- ✅ Support for both corner and edge handle dragging
- ✅ Enter to apply, Esc to cancel
- ✅ Visual overlay for cropped areas

**Still Missing**:
- [ ] Content-Aware Fill when extending beyond bounds
- [ ] Straighten Tool (draw line to auto-level)
- [ ] Manual size input in options bar
- [ ] Reset button to restore original bounds
- [ ] Shield color customization
- [ ] Perspective Crop as separate tool
- [ ] Apply rotation to final crop operation

**Known Issues**:
- [ ] Rotation not applied to final crop operation
- [ ] Minor TypeScript type safety improvements needed

## 3. Hand Tool (H) ⚠️ NEEDS ENHANCEMENT
**Status**: Basic Implementation
**File**: `/lib/editor/tools/transform/handTool.ts`

**Current Features**:
- ✅ Basic pan functionality
- ✅ Drag to move canvas

**Missing PS Features**:
- [ ] Spacebar activation (temporary hand tool)
- [ ] Momentum/inertia scrolling
- [ ] Double-click to fit to screen
- [ ] Shift+double-click to actual pixels
- [ ] Bird's Eye View (hold H and click)

## 4. Zoom Tool (Z) ⚠️ NEEDS ENHANCEMENT
**Status**: Basic Implementation
**File**: `/lib/editor/tools/transform/zoomTool.ts`

**Current Features**:
- ✅ Click to zoom in
- ✅ Alt+click to zoom out
- ✅ Basic zoom levels

**Missing PS Features**:
- [ ] Scrubby Zoom (drag left/right)
- [ ] Animated zoom transitions
- [ ] Zoom to selection
- [ ] Fit to screen shortcuts
- [ ] Actual pixels view
- [ ] Print size view
- [ ] Zoom percentage input

## 5. Eyedropper Tool (I) ⚠️ NEEDS INTEGRATION
**Status**: Basic Implementation
**File**: `/lib/editor/tools/eyedropperTool.ts`

**Current Features**:
- ✅ Basic color sampling
- ✅ Click to sample color

**Missing PS Features**:
- [ ] Sample size options (Point, 3x3, 5x5, etc.)
- [ ] Show sample ring while hovering
- [ ] Sample all layers option
- [ ] Copy color as hex/rgb
- [ ] Integration with color panel
- [ ] Right-click for background color

## Architecture & Patterns

All tools follow the established patterns:
- Extend `BaseTool` class
- Use `ExecutionContext` for event emission
- Integrate with tool options store
- Follow Konva-based canvas architecture
- Proper TypeScript typing

## Tool Options Integration

Tool options are defined in `/components/editor/ToolOptions/defaultToolOptions.ts`:
- Move Tool: Auto-select type, smart guides, transform controls
- Crop Tool: Aspect ratios, overlays, delete pixels, shield opacity
- Other tools: Basic options, need enhancement

## AI Adapter Integration

### ✅ Tools with AI Adapters:
1. **Move Tool** (`moveObjects`) - NEW!
   - Move to exact positions
   - Move by delta amounts
   - Align to canvas edges/corners
   - Distribute objects evenly
   - Example: "Move the logo to the top right", "Center all objects", "Space images evenly"

2. **Crop Tool** (`cropImage`) - Existing
   - Crop to specific dimensions
   - Crop to aspect ratios
   - Smart cropping based on content
   - Example: "Crop to square", "Remove 20% from edges", "Crop to 16:9"

3. **Rotate Tool** (`rotateImage`) - Existing
4. **Flip Tool** (`flipImage`) - Existing
5. **Resize Tool** (`resizeImage`) - Existing

### 🚧 Tools That Could Benefit from AI Adapters:
1. **Zoom Tool** - For AI to focus on specific areas
2. **Eyedropper Tool** - For AI to sample and analyze colors
3. **Free Transform** (when implemented) - For complex transformations

## Next Steps

1. **Free Transform Tool** - Critical missing feature
2. **Rotate View Tool** - Important for digital artists
3. **Enhance Hand Tool** - Add spacebar activation and momentum
4. **Enhance Zoom Tool** - Add scrubby zoom and animations
5. **Integrate Eyedropper** - Connect to color system

---

## History & Actions - Detailed Breakdown

### **History Panel**
**Core Functionality:**
- Records every action as a history state
- Default: 50 states (can increase to 1000)
- Scroll through states to undo/redo non-linearly
- Click any state to revert to that point

**Key Features:**
- **Snapshots**: Save specific states permanently
  - Won't be pushed out by new states
  - Can create multiple snapshots
  - Name them for reference
  - Compare different approaches

- **History Options:**
  - Automatically Create First Snapshot
  - Automatically Create New Snapshot When Saving
  - Allow Non-Linear History (experimental changes)
  - Show New Snapshot Dialog by Default
  - Make Layer Visibility Changes Undoable

**New Document from State:**
- Right-click any state → New Document
- Creates fresh file from that point
- Useful for saving variations

### **History Brush Tool (Y)**
**Concept:**
- Paint from any previous history state
- Selective undo/redo with brush control

**Workflow:**
1. Set source state in History panel
2. Paint to reveal that state
3. Use opacity/flow for partial restoration

**Art History Brush:**
- Creates stylized strokes from history
- Style options: Tight Short, Loose Medium, Dab, Tight Curl, etc.
- Fidelity: How closely it follows the source
- Area: Size of sampling area
- Spacing: Distance between dabs

### **Actions Panel**
**What Actions Record:**
- Tool selections and settings
- Menu commands
- Panel operations
- Transformations
- Most Photoshop operations

**What They Don't Record:**
- Brush strokes (records the stroke, not the motion)
- Zoom/pan operations
- Time-dependent operations

**Action Structure:**
```
Action Set (folder)
  └── Action
      ├── Step 1 (Make selection)
      ├── Step 2 (Apply filter)
      ├── Step 3 (Adjust curves)
      └── Step 4 (Save)
```

**Recording Actions:**
1. Click "Create new action"
2. Name it, assign shortcut, color
3. Click Record
4. Perform operations
5. Click Stop

**Advanced Action Features:**

**Modal Controls:**
- Toggle dialog on/off per step
- Shows dialog for user input
- Allows customization during playback

**Insert Menu Item:**
- Add commands that can't be recorded
- Useful for view changes

**Insert Stop:**
- Add message/instructions
- Can include Continue button
- Guide users through complex actions

**Insert Path:**
- Record specific paths
- Useful for consistent selections

**Conditional Actions:**
- If/Then statements
- Check for: Document mode, bit depth, layers, etc.
- Branch to different actions

**Action Options:**
- **Button Mode**: One-click colored buttons
- **Playback Options**:
  - Accelerated (fast)
  - Step by Step (debugging)
  - Pause For: X seconds
- **Insert Action**: Nest actions

### **Batch Processing**
**File > Automate > Batch:**
- **Source**: Folder, Import, Opened Files, Bridge
- **Action**: Select set and action
- **Destination**: None, Save and Close, Folder
- **Naming**: Sequential numbers, dates, custom
- **Override Options**:
  - Override Action "Open" Commands
  - Include All Subfolders
  - Suppress File Open Options
  - Suppress Color Profile Warnings

**Error Handling:**
- Stop For Errors
- Log Errors To File

### **Droplets**
- Standalone application icons
- Drag files onto droplet to process
- Created from File > Automate > Create Droplet
- Cross-platform (with limitations)

### **Image Processor**
**File > Scripts > Image Processor:**
- Simpler than Batch
- Convert multiple files to JPEG, PSD, TIFF
- Resize options
- Run actions as part of process
- Save in same location or choose folder

---

## Workspace & Productivity - Detailed Breakdown

### **Workspace Management**
**Default Workspaces:**
- Essentials (default)
- 3D, Graphics and Web, Motion
- Painting, Photography
- Typography
- Custom workspaces

**Workspace Components:**
- Panel locations and sizes
- Tool panel configuration  
- Keyboard shortcuts (optional)
- Menu customization (optional)
- Toolbar customization

**Creating Custom Workspaces:**
1. Arrange panels as desired
2. Window > Workspace > New Workspace
3. Name it
4. Choose what to save:
   - Panel locations
   - Keyboard shortcuts
   - Menus
   - Toolbar

### **Panel Management**
**Panel Features:**
- **Docking**: Snap to edges/other panels
- **Tabbing**: Combine related panels
- **Collapsing**: Double-click tab to minimize
- **Floating**: Drag away from dock
- **Stacking**: Vertical panel groups
- **Icons**: Collapse to icons to save space

**Panel Options:**
- Panel menu (≡) for panel-specific options
- Auto-Collapse Icon Panels
- Auto-Show Hidden Panels (on hover)

### **Toolbar Customization**
**Edit Toolbar:**
- Click ... at bottom or Edit > Toolbar
- Drag tools in/out
- Group related tools
- Create custom tool groups
- Save as part of workspace

**Tool Presets:**
- Window > Tool Presets
- Save tool with all settings
- Includes: brush, colors, options
- Current Tool Only checkbox
- Load/save preset libraries

### **Keyboard Shortcuts**
**Edit > Keyboard Shortcuts:**
- Application Menus
- Panel Menus
- Tools
- Taskspaces (newer versions)

**Features:**
- Search for commands
- See conflicts
- Save/load sets
- Summarize button: Creates text file
- Multiple shortcut sets

### **Menu Customization**
**Edit > Menus:**
- Show/hide menu items
- Color-code menu items
- Create task-focused menus
- Save as part of workspace

### **Libraries Panel**
**Creative Cloud Libraries:**
- **Assets Types**:
  - Colors and color themes
  - Character/paragraph styles
  - Graphics (vectors/rasters)
  - Brushes
  - Layer styles
  - Patterns

**Features:**
- Sync across devices/apps
- Share with team members
- Version history
- Stock asset integration
- Right-click to edit properties

### **Export Features**

**Quick Export:**
- File > Export > Quick Export as [format]
- One-click export with saved settings
- Preferences for format, quality, metadata

**Export As:**
- File > Export > Export As
- Multiple formats and sizes
- Preview before export
- Batch export artboards
- Scale options: percentage, width, height

**Generate Image Assets:**
- For web/app developers
- Name layers with extensions: "button.png"
- Auto-exports when saved
- Supports multiple sizes: "icon@2x.png"
- Quality settings in filename

**Save for Web (Legacy):**
- Still available for compatibility
- 4-up preview
- Format optimization
- Metadata removal
- Image size adjustment

### **Productivity Enhancements**

**Auto-Recovery:**
- Preferences > File Handling
- Auto-save every 5-60 minutes
- Recover information location

**Background Save:**
- Continue working while saving
- Progress bar in document tab

**Recent Files:**
- Home screen shows recent work
- Customizable number of files
- Cloud document integration

**Search Features:**
- **Search Bar**: Find tools, panels, help
- **Filter Layers**: By kind, name, effect, mode
- **Find in Photoshop**: OS-level search integration

**Performance Optimization:**
- **Preferences > Performance**:
  - Memory usage slider
  - History states limit
  - Cache levels and tile size
  - GPU acceleration settings
  - Scratch disk configuration

**Presets Management:**
- **Preset Manager**: 
  - Brushes, Swatches, Gradients, Styles
  - Patterns, Contours, Custom Shapes, Tools
  - Load, save, replace sets
  - Organize into groups

**Script Management:**
- File > Scripts
- Browse to run any .jsx script
- Script Events Manager: Trigger scripts automatically
- Common scripts: Load Files into Stack, Statistics, etc.

### **Cloud Documents**
**Features:**
- Auto-sync to Creative Cloud
- Version history (up to 60 days)
- Work across devices
- Offline editing
- Smaller file sizes (smart compression)

**Limitations:**
- Some features not supported
- File size limits
- Requires subscription

These systems transform Photoshop from an image editor into a complete creative workflow platform. The key is setting up your workspace and automation to match your specific needs - every photographer, designer, and artist will have different optimal configurations.