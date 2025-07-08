# FotoFun MVP Implementation Plan

## Project Overview
FotoFun is a browser-based photo editing application built with Next.js 15, React 19, TypeScript, Tailwind CSS v4, Fabric.js for canvas manipulation, and PIXI.js for GPU-accelerated filters.

## MVP vs Full Feature Parity Approach

### Philosophy
For the MVP, we're implementing **core functionality** of each tool rather than full Photoshop feature parity. This allows us to:
1. Ship a working editor quickly
2. Validate the architecture
3. Get user feedback early
4. Iterate based on real usage

### Tool Implementation Levels

**Level 1 - MVP (Current Target):**
- Basic tool functionality
- Essential options (size, opacity, color)
- Keyboard shortcuts
- Simple UI feedback

**Level 2 - Enhanced (Future):**
- Advanced options (flow, pressure, dynamics)
- Tool presets
- More sophisticated algorithms
- Better performance optimization

**Level 3 - Pro (Long-term):**
- Full Photoshop feature parity
- Custom brush engines
- Advanced blending modes
- GPU acceleration for all operations

### Current Tool Status:
- ✅ **Move Tool** - MVP complete
- ✅ **Rectangle Marquee** - MVP complete (selection ops pending)
- ✅ **Hand Tool** - MVP complete  
- ✅ **Zoom Tool** - MVP complete
- ✅ **Brush Tool** - MVP complete
- ✅ **Eraser Tool** - MVP complete
- 🚧 **Elliptical Marquee** - Not started
- 🚧 **Lasso Tools** - Not started
- 🚧 **Magic Wand** - Not started
- 🚧 **Crop Tool** - Not started
- 🚧 **Text Tool** - Not started
- 🚧 **Shape Tools** - Not started
- 🚧 **Clone Stamp** - Not started
- 🚧 **Healing Tools** - Not started

## Development Phases

### Phase 0: Project Setup ✅ COMPLETE
- Next.js 15 with App Router
- TypeScript configuration  
- Tailwind CSS v4 setup
- Core dependencies (Fabric.js, PIXI.js, Zustand, Lucide)
- Project structure
- Type definitions
- Constants

### Phase 1: Core Canvas System ✅ COMPLETE
- Canvas component with Fabric.js
- Zoom/pan functionality
- Canvas state management
- Keyboard shortcuts
- Basic UI shell

### Phase 2: UI Framework ✅ COMPLETE
- MenuBar with working menus
- ToolPalette with all tools
- Canvas area
- Panels (Layers, Properties, AI Chat placeholders)
- OptionsBar with dynamic tool options
- StatusBar with document info
- Theme system (light/dark mode)

### Phase 3: File Operations ✅ COMPLETE
- New document dialog
- Open files (drag & drop)
- Save functionality
- Document state management
- Recent documents tracking

### Phase 4: Basic Tools (Part 1) ✅ COMPLETE
- Tool system architecture
- Move Tool (selection)
  - MVP: Basic object selection and movement
  - Future: Auto-select layers, show transform controls, align/distribute
- Rectangle Marquee Tool
  - MVP: Basic rectangle selection with Shift/Alt modifiers
  - Future: Feather, anti-alias, selection operations (add/subtract/intersect)
- Hand Tool (panning)
  - MVP: Space+drag panning, dedicated tool
  - Future: Flick panning, overscroll options
- Zoom Tool
  - MVP: Click to zoom, Alt+click to zoom out
  - Future: Scrubby zoom, zoom rectangle, animated zoom
- Brush Tool with color
  - MVP: Size, opacity, color, basic smoothing
  - Future: Pressure sensitivity, brush presets, dynamics, flow, angle, texture
- Eraser Tool
  - MVP: Basic erasing with size control
  - Future: Eraser modes, background eraser, magic eraser
- Tool options system

### Phase 5: Basic Tools (Part 2) 🚧 IN PROGRESS
**Week 5-6 Goals:**
- [ ] Elliptical Marquee Tool
  - MVP: Basic ellipse selection with modifiers
  - Future: Fixed ratio, fixed size options
- [ ] Lasso Tool (basic)
  - MVP: Freehand selection
  - Future: Polygonal lasso, magnetic lasso
- [ ] Magic Wand Tool (basic selection)
  - MVP: Color-based selection with tolerance
  - Future: Contiguous/non-contiguous, sample all layers
- [ ] Selection operations (add/subtract/intersect)
  - MVP: Basic boolean operations
  - Future: Smooth, expand/contract, feather after creation
- [ ] Crop Tool
  - MVP: Basic crop with aspect ratio
  - Future: Perspective crop, content-aware crop, straighten
- [ ] Type Tool (basic text)
  - MVP: Add text, font selection, size, color
  - Future: Character/paragraph panels, text on path, text effects

### Phase 6: Layers System
**Week 7-8 Goals:**
- [ ] Layer management (create, delete, reorder)
  - MVP: Basic layer stack, add/delete, drag to reorder
  - Future: Layer groups, smart objects, layer comps
- [ ] Layer panel UI
  - MVP: List with thumbnails, visibility, names
  - Future: Layer filtering, color coding, search
- [ ] Layer properties (opacity, blend modes)
  - MVP: Opacity, basic blend modes (normal, multiply, screen)
  - Future: All 27+ Photoshop blend modes, fill vs opacity
- [ ] Layer visibility toggle
  - MVP: Eye icon toggle
  - Future: Alt+click isolation, layer filtering
- [ ] Background layer handling
  - MVP: Convert background to regular layer
  - Future: Background color options, pattern fills
- [ ] Layer selection and active state
  - MVP: Click to select, highlight active
  - Future: Multi-select, layer linking

### Phase 7: Advanced Tools
**Week 9-10 Goals:**
- [ ] Shape tools (Rectangle, Ellipse, Line)
  - MVP: Basic shapes with fill/stroke
  - Future: Custom shapes, shape layers, path operations
- [ ] Clone Stamp Tool (basic)
  - MVP: Basic cloning with size/hardness
  - Future: Aligned/non-aligned, sample modes, overlay preview
- [ ] Blur/Sharpen tools
  - MVP: Basic blur and sharpen
  - Future: Different blur algorithms, smart sharpen
- [ ] Dodge/Burn tools
  - MVP: Basic lighten/darken
  - Future: Range (highlights/midtones/shadows), exposure control
- [ ] Smudge tool
  - MVP: Basic smudging
  - Future: Finger painting mode, strength variations

### Phase 8: Filters & Adjustments
**Week 11-12 Goals:**
- [ ] PIXI.js integration for GPU filters
  - MVP: Basic WebGL pipeline setup
  - Future: Custom shader system, filter stacking
- [ ] Basic filters (Blur, Sharpen, Noise)
  - MVP: Gaussian blur, basic sharpen, add noise
  - Future: Motion blur, smart blur, lens blur, reduce noise
- [ ] Adjustments (Brightness/Contrast, Hue/Saturation)
  - MVP: Basic slider adjustments
  - Future: Curves, levels, color balance, selective color
- [ ] Filter preview system
  - MVP: Before/after toggle
  - Future: Split preview, preview zoom, GPU acceleration
- [ ] Adjustment layers (basic)
  - MVP: Non-destructive adjustments
  - Future: Masks, clipping, adjustment presets

### Phase 9: AI Integration (Deferred)
- Depends on other agents' work
- AI chat panel integration
- AI-powered tools
- Smart selection
- Content-aware operations

### Phase 10: Polish & Optimization
- Performance optimization
- Undo/redo system improvements
- Keyboard shortcut customization
- Settings/preferences
- Export options (different formats)
- Help system

## Current Status (Updated)

### Completed ✅
1. Full project setup with all dependencies
2. Complete UI shell with all panels
3. Canvas with zoom/pan
4. Theme system
5. File operations (new, open, save)
6. Tool system with 6 working tools
7. Tool options framework
8. Color picker with history

### In Progress 🚧
- Additional selection tools
- Selection operations
- Basic filters

### Upcoming 📋
- Layers system
- More drawing tools
- Filters and adjustments
- AI integration (pending other agents)

## MVP Definition (Revised)

### Must Have (for MVP)
- ✅ Canvas with zoom/pan
- ✅ File operations (new, open, save)
- ✅ At least 5 working tools
- ✅ Tool options system
- 🚧 Basic layers support
- 🚧 Basic selection tools
- 🚧 At least 3 filters/adjustments
- ✅ Undo/redo
- ✅ Theme support

### Nice to Have (post-MVP)
- Advanced selection operations
- Full layer blend modes
- Complex filters
- AI features
- Cloud storage
- Collaboration features
- Plugin system
- Performance optimizations

## Overview
This document provides a detailed implementation roadmap for the FotoFun MVP, breaking down the work into manageable phases with specific tasks, dependencies, and technical considerations.

## Progress Summary
- **Phase 0**: ✅ Complete - Project setup with all dependencies
- **Phase 1**: ✅ Complete - Core canvas system with zoom/pan
- **Phase 2**: ✅ Complete - UI shell with all components
- **Phase 3**: 🟡 In Progress - Basic tools implemented (Move, Rectangle Marquee, Hand)
- **Additional**: ✅ Theme system with light/dark mode support

## Phase 0: Project Setup & Infrastructure (Week 1) ✅ COMPLETE

### 0.1 Dependencies Installation ✅
- [x] Core dependencies installed (Fabric.js, PIXI.js, Zustand, Lucide React)
- [x] Next.js 15 with React 19 and TypeScript
- [x] Tailwind CSS v4 with custom theme
- [x] shadcn/ui components
- [x] next-themes for theme management

### 0.2 Project Structure Setup ✅
- [x] No /src directory - using Next.js app directory conventions
- [x] Component structure established
- [x] Store setup with Zustand
- [x] Type definitions in place

### 0.3 Base Configuration ✅
- [x] TypeScript paths configured
- [x] Tailwind CSS v4 with CSS variables
- [x] ESLint configured (no suppressions allowed)
- [x] Bun as package manager

## Phase 1: Core Canvas System (Week 2-3) ✅ COMPLETE

### 1.1 Canvas Foundation ✅
- [x] Canvas wrapper component with Fabric.js
- [x] Zoom controls (1% - 3200%)
- [x] Pan functionality (Space + drag)
- [x] Keyboard shortcuts (Cmd/Ctrl + +/-, 0, 1)
- [x] Canvas background with checkerboard pattern
- [x] Zoom indicator

### 1.2 Canvas State Management ✅
- [x] Canvas store with Fabric.js integration
- [x] Zoom state management
- [x] Pan state management
- [x] Canvas initialization and disposal

### 1.3 Document Management ✅
- [x] New document dialog with presets
- [x] Document store for state management
- [x] File open functionality with drag & drop
- [x] Save functionality (downloads as PNG)
- [x] Document info display in status bar

## Phase 2: UI Shell Implementation (Week 3-4) ✅ COMPLETE

### 2.1 Menu Bar System ✅
- [x] MenuBar component with File and View menus
- [x] Keyboard shortcuts display
- [x] Theme toggle (light/dark mode)
- [x] Disabled state for unimplemented features

### 2.2 Tool Palette ✅
- [x] ToolPalette component with all tools
- [x] Tool selection system
- [x] Tool icons with Lucide React
- [x] Tool tooltips with shortcuts
- [x] Active tool highlighting (perfect square)
- [x] Theme-aware styling

### 2.3 Panels System ✅
- [x] Basic Panels component (Layers panel)
- [x] Theme-aware styling

### 2.4 Options Bar ✅
- [x] Basic OptionsBar component
- [x] Theme-aware styling

### 2.5 Status Bar ✅
- [x] Status bar with document info
- [x] Zoom display
- [x] Document dimensions display

## Phase 3: Active Tools Implementation (Week 4-6) 🟡 IN PROGRESS

### 3.1 Selection Tools 🟡
- [x] Rectangular Marquee Tool - Basic implementation
  - [x] Draw rectangle selection
  - [x] Visual feedback
  - [ ] Shift for square constraint
  - [ ] Alt for center origin
  - [ ] Add/Subtract/Intersect modes
  - [ ] Selection operations (fill, stroke, delete)
- [ ] Elliptical Marquee Tool
- [ ] Lasso Tool
- [ ] Quick Selection Tool

### 3.2 Transform Tools 🟡
- [x] Move Tool - Basic implementation
  - [x] Select and move objects
  - [x] Auto-select on click
  - [ ] Layer auto-selection toggle
  - [ ] Transform controls UI
  - [ ] Alignment options
  - [ ] Distribution options
- [ ] Rotate Tool
- [ ] Scale Tool
- [ ] Free Transform

### 3.3 Navigation Tools ✅
- [x] Hand Tool - Complete
  - [x] Pan canvas
  - [x] Space key for temporary hand tool
  - [x] Cursor feedback

### 3.4 Drawing Tools 🔴 NOT STARTED
- [ ] Brush Tool
- [ ] Pencil Tool
- [ ] Eraser Tool
- [ ] Paint Bucket Tool

### 3.5 Type Tool 🔴 NOT STARTED
- [ ] Text creation
- [ ] Font selection
- [ ] Size and style controls
- [ ] Text editing

### 3.6 Shape Tools 🔴 NOT STARTED
- [ ] Rectangle Tool
- [ ] Ellipse Tool
- [ ] Line Tool
- [ ] Custom Shape Tool

## Phase 4: Tool Options & Properties (Week 5) 🔴 NEXT PHASE

### 4.1 Options Bar Enhancement
- [ ] Create tool-specific option components
- [ ] Move Tool options:
  - [ ] Auto-select checkbox
  - [ ] Show transform controls
  - [ ] Alignment buttons
- [ ] Marquee Tool options:
  - [ ] Selection mode (New, Add, Subtract, Intersect)
  - [ ] Feather input
  - [ ] Anti-alias checkbox
- [ ] Brush Tool options:
  - [ ] Size slider
  - [ ] Hardness slider
  - [ ] Opacity slider
  - [ ] Flow slider
  - [ ] Brush preset picker

### 4.2 Properties Panel
- [ ] Show properties for selected objects
- [ ] Transform properties (X, Y, Width, Height, Rotation)
- [ ] Appearance properties (Fill, Stroke, Opacity)
- [ ] Layer properties (Blend mode, Opacity)
- [ ] Text properties (when text selected)

### 4.3 Context Menus
- [ ] Right-click context menus for canvas
- [ ] Layer context menus
- [ ] Tool-specific context menus

## Phase 5: Layers System (Week 6) 🔴

### 5.1 Layer Management
- [ ] Layer creation and deletion
- [ ] Layer reordering (drag & drop)
- [ ] Layer visibility toggle
- [ ] Layer locking
- [ ] Layer opacity control
- [ ] Layer blend modes

### 5.2 Layer Panel UI
- [ ] Layer thumbnails
- [ ] Layer names (editable)
- [ ] Layer selection
- [ ] Multi-layer selection
- [ ] Layer groups/folders
- [ ] Layer effects indicators

### 5.3 Layer Operations
- [ ] Merge layers
- [ ] Duplicate layers
- [ ] Convert to Smart Object
- [ ] Rasterize layer
- [ ] Layer masks (basic)

## Phase 6: Image Adjustments & Filters (Week 7-8) 🔴

### 6.1 PIXI.js Filter Integration
- [ ] Create filter system architecture
- [ ] Implement filter preview
- [ ] Filter stacking system
- [ ] Performance optimization

### 6.2 Basic Adjustments
- [ ] Brightness/Contrast
- [ ] Hue/Saturation/Lightness
- [ ] Levels
- [ ] Curves (basic)
- [ ] Color Balance
- [ ] Black & White
- [ ] Invert

### 6.3 Filters
- [ ] Blur (Gaussian, Motion, Radial)
- [ ] Sharpen
- [ ] Noise (Add, Reduce)
- [ ] Pixelate
- [ ] Distort effects

### 6.4 Adjustment UI
- [ ] Adjustment dialog system
- [ ] Live preview
- [ ] Before/after comparison
- [ ] Reset functionality
- [ ] Preset management

## Phase 7: History System (Week 8-9) 🔴

### 7.1 History Implementation
- [ ] Command pattern for all operations
- [ ] History stack with configurable limit
- [ ] Undo/Redo functionality
- [ ] History panel UI
- [ ] History state thumbnails
- [ ] History branching

### 7.2 State Management
- [ ] Efficient state snapshots
- [ ] Memory optimization
- [ ] History persistence (localStorage)
- [ ] Clear history option

## Phase 8: File Operations Enhancement (Week 9) 🔴

### 8.1 Import Enhancements
- [ ] Multiple file import
- [ ] RAW file support (basic)
- [ ] SVG import
- [ ] PDF import (basic)
- [ ] Clipboard paste support

### 8.2 Export Enhancements
- [ ] Export dialog with options
- [ ] Format selection (PNG, JPEG, WebP)
- [ ] Quality settings
- [ ] Size/resolution options
- [ ] Batch export
- [ ] Export presets

### 8.3 Local Storage
- [ ] Auto-save to localStorage
- [ ] Recover unsaved work
- [ ] Project file format (.fotofun)
- [ ] Import/export project files

## Phase 9: Performance & Polish (Week 10) 🔴

### 9.1 Performance Optimization
- [ ] Canvas rendering optimization
- [ ] Tool operation optimization
- [ ] Memory management
- [ ] Large file handling
- [ ] GPU acceleration tuning

### 9.2 UI Polish
- [ ] Smooth animations
- [ ] Loading states
- [ ] Progress indicators
- [ ] Error handling UI
- [ ] Tooltips and hints
- [ ] Keyboard shortcut overlay

### 9.3 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] High contrast mode
- [ ] Focus indicators
- [ ] ARIA labels

## Phase 10: Testing & Documentation (Week 11-12) 🔴

### 10.1 Testing
- [ ] Unit tests for tools
- [ ] Integration tests
- [ ] E2E tests for workflows
- [ ] Performance testing
- [ ] Cross-browser testing

### 10.2 Documentation
- [ ] User guide
- [ ] Keyboard shortcuts reference
- [ ] Tool documentation
- [ ] API documentation
- [ ] Contributing guide

## Immediate Next Steps (Phase 4 Detail)

### Week 5 Sprint Plan

#### Day 1-2: Options Bar Foundation
1. Create `ToolOptionsRegistry` system
2. Build base `ToolOptions` component
3. Implement option type components:
   - `OptionSlider`
   - `OptionCheckbox`
   - `OptionDropdown`
   - `OptionButtonGroup`
   - `OptionNumberInput`

#### Day 3-4: Tool-Specific Options
1. Move Tool options:
   ```typescript
   interface MoveToolOptions {
     autoSelect: boolean
     showTransformControls: boolean
     alignmentGuides: boolean
   }
   ```

2. Marquee Tool options:
   ```typescript
   interface MarqueeToolOptions {
     mode: 'new' | 'add' | 'subtract' | 'intersect'
     feather: number
     antiAlias: boolean
     fixedSize?: { width: number; height: number }
   }
   ```

#### Day 5: Properties Panel
1. Create `PropertiesPanel` component
2. Implement property sections:
   - Transform properties
   - Appearance properties
   - Object-specific properties
3. Add property editing functionality

### Technical Implementation Details

#### Tool Options Architecture
```typescript
// lib/tools/options.ts
export interface ToolOption<T = any> {
  id: string
  type: 'slider' | 'checkbox' | 'dropdown' | 'number' | 'button-group'
  label: string
  value: T
  props?: Record<string, any>
}

export interface ToolOptionsConfig {
  toolId: string
  options: ToolOption[]
  onChange: (optionId: string, value: any) => void
}

// store/toolOptionsStore.ts
interface ToolOptionsStore {
  options: Map<string, ToolOptionsConfig>
  activeOptions: ToolOption[]
  
  registerToolOptions: (config: ToolOptionsConfig) => void
  updateOption: (toolId: string, optionId: string, value: any) => void
  getToolOptions: (toolId: string) => ToolOption[]
}
```

#### Properties Panel Architecture
```typescript
// components/editor/PropertiesPanel/index.tsx
interface PropertySection {
  id: string
  title: string
  properties: Property[]
  expanded: boolean
}

interface Property {
  id: string
  label: string
  type: 'number' | 'text' | 'color' | 'dropdown'
  value: any
  onChange: (value: any) => void
}
```

## Success Metrics

### Phase 4 Completion Criteria
- [ ] All active tools have functioning options
- [ ] Properties panel updates based on selection
- [ ] Options persist during session
- [ ] Smooth UI updates (< 16ms)
- [ ] No TypeScript errors or ESLint warnings

### Overall MVP Criteria
- [ ] 15+ working tools
- [ ] Complete layer system
- [ ] 10+ filters/adjustments
- [ ] Full undo/redo
- [ ] Import/export functionality
- [ ] < 3s initial load time
- [ ] < 100ms tool switching
- [ ] Works on 4K images 

## Risk Mitigation
- Regular testing and bug fixes throughout development
- Performance monitoring and optimization as needed
- Fallback options for complex features
- Clear MVP scope to avoid feature creep
- Modular architecture for easy updates

## MVP Approach Summary

### Core Philosophy
The MVP focuses on delivering a **functional photo editor** with essential tools that work reliably, rather than attempting full Photoshop feature parity. Each tool includes:

1. **Core functionality** that users expect
2. **Essential options** for basic control
3. **Intuitive UI** that matches the Photoshop layout
4. **Keyboard shortcuts** for efficiency

### What Makes It "Minimum Viable"
- **Tools work** but with simplified feature sets
- **UI is complete** but some panels are placeholders
- **File operations** support common formats
- **Performance is good** for typical photo sizes
- **Architecture supports** future enhancements

### Post-MVP Roadmap
After MVP launch, we can enhance based on user feedback:
1. **Tool enhancements** - Add advanced options to existing tools
2. **New tools** - Implement remaining Photoshop tools
3. **Advanced features** - Masks, channels, paths, actions
4. **Performance** - GPU acceleration, web workers
5. **Integration** - Cloud storage, plugins, AI features

This approach allows us to **ship quickly**, **learn from users**, and **iterate based on real needs** rather than assumptions. 