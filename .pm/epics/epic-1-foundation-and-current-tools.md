# Epic 1: Foundation & Current Tools Status

## HANDOFF CONTEXT - PLEASE READ FIRST

### Session Summary (Last Updated: 2024-01-08)
This epic has made significant progress. The following work was completed in the most recent sessions:

1. **Fixed Critical Tool Issues**:
   - Eraser Tool: Now properly uses canvas background color (respects dark/light mode)
   - Hand Tool: Fixed event handling to work with new BaseTool architecture
   - Eraser Tool Drawing: Created custom EraserBrush with `globalCompositeOperation: 'destination-out'`

2. **Completed Layer System Implementation (Phase 3)**:
   - ✅ Layer types and interfaces with proper Fabric.js v6 types
   - ✅ Comprehensive LayerStore with full CRUD operations
   - ✅ LayersPanel UI with drag-and-drop reordering
   - ✅ Layer commands for undo/redo support
   - ✅ Fixed Fabric.js type issues (v6 includes TypeScript types natively)
   - ✅ **UPDATE: All tools now work with layers via LayerAwareMixin**

3. **Major Code Reorganization**:
   - Moved all editor-related code to `lib/editor/`
   - Organized tools into categories: `selection/`, `drawing/`, `transform/`
   - Commands organized by type: `base/`, `canvas/`, `layer/`, `selection/`
   - Clean separation between editor, AI, auth, and DB code
   - Updated all import paths throughout the codebase

4. **Component Pattern Standardization**:
   - LayersPanel now follows the same pattern as AIChat component
   - Moved from single file to directory structure with index.tsx

5. **Phase 4 Selection System Progress** (NEW):
   - ✅ SelectionManager: Core pixel-based selection engine
   - ✅ SelectionRenderer: Visual rendering with marching ants
   - ✅ Selection Store: State management for selection modes
   - ✅ Selection Commands: Undo/redo support
   - ✅ All selection tools updated to use SelectionManager
   - ⏳ Clipboard operations (copy/cut/paste) - IN PROGRESS
   - ⏳ Selection menu integration - TODO
   - ⏳ Testing - TODO

### Critical Information for Next Developer

#### Fabric.js Version Issue
- **Project has fabric v6 but @types/fabric v5** - This causes type mismatches
- **Solution**: Import `FabricObject` directly from 'fabric' instead of using `fabric.Object`
- Fabric.js v6 includes TypeScript types natively, so @types/fabric may not be needed

#### Current Architecture Status
- **BaseTool system**: ✅ Fully implemented and all tools migrated
- **Command Pattern**: ✅ Working with undo/redo
- **Layer System**: ✅ Complete with tool integration
- **Selection System**: 🚧 Core complete, clipboard operations in progress

#### Selection System Architecture
The new selection system uses:
1. **SelectionManager**: Handles pixel-based selections with ImageData masks
2. **SelectionRenderer**: Displays marching ants animation
3. **Selection tools**: Create selections via SelectionManager, not visual objects
4. **Pixel masks**: Enable proper boolean operations and feathering

### Remaining Work Overview
1. **Phase 4 (Selection Enhancement)**: 
   - ✅ Core infrastructure
   - ⏳ Clipboard operations (copy/cut/paste)
   - ⏳ Selection menu items
   - ⏳ Quick mask mode
2. **Phase 5 (Missing Tools)**: Quick Selection Tool and Eyedropper Tool
3. **Phase 6 (Testing & Documentation)**: No tests written yet

---

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-1-foundation-tools`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add eyedropper tool`, `fix: selection mode switching`)
4. **Pull Request**: 
   - Title: "Epic 1: Foundation & Current Tools Implementation"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Manually test ALL tools you implement
   - Test keyboard shortcuts
   - Test tool switching
   - Test undo/redo with your changes
   - Test in both light and dark themes
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Check #dev-canvas channel in Slack/Discord for updates
- Don't modify files being worked on in other epics
- If you need changes in shared files (e.g., constants, types), coordinate with team

### Epic Start Process

Before implementing any tools or infrastructure:

1. **Deep Dive Analysis** (Required)
   - Analyze ALL existing tool implementations in `lib/editor/tools/`
   - Study Fabric.js integration patterns in the codebase
   - Document current state management in stores
   - Understand event handling patterns
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study how each tool works in Photoshop
   - Research alternative implementation approaches
   - Document pros/cons of each approach
   - Justify chosen implementation

3. **Gap Identification**
   - List missing infrastructure
   - Identify type definitions needed
   - Document integration challenges
   - Plan solutions for each gap

### Epic End Process

1. **Quality Validation**
   - All code follows existing patterns EXACTLY
   - Comprehensive error handling
   - Performance profiled and optimized
   - No `any` types or suppressions

2. **Integration Testing**
   - Test with all zoom levels
   - Test with large documents
   - Test undo/redo for all operations
   - Test keyboard shortcuts

3. **Documentation**
   - Update this epic doc
   - Document architecture decisions
   - Create migration guide for other epics

---

## Overview
This epic tracks the current state of FotoFun implementation, including completed foundational work, existing tools, and critical infrastructure needed before expanding tool development.

## Completed Foundational Work

### 1. Project Setup ✅
- **Tech Stack**: Next.js 15, React 19, TypeScript (strict mode), Tailwind CSS v4
- **Canvas Engine**: Fabric.js v6 for 2D manipulation
- **State Management**: Zustand stores
- **Build Tool**: Bun (not npm/npx)
- **Icons**: Lucide React
- **Linting**: ESLint configured (no suppressions allowed)

### 2. Database & Auth ✅
- Supabase integration configured
- Authentication foundation in place
- User management system ready

### 3. AI Chat Foundation ✅
- AI assistant panel UI created
- Chat interface implemented
- Integration points ready for AI tools
- Memory system scaffolding in place

### 4. Landing Page ✅
- Initial landing page draft completed
- Marketing copy and design in place
- Ready for conversion optimization

### 5. Core UI Shell ✅
- **MenuBar**: File, Edit, Image, Layer, Select, Filter, View menus
- **ToolPalette**: All tools visible (unimplemented show "Coming Soon" modal)
- **Canvas Area**: Zoom, pan, rulers ready
- **Panels**: Layers, Properties, History, AI Chat panels
- **OptionsBar**: Dynamic tool options
- **StatusBar**: Document info, zoom level display

### 6. Canvas System ✅
- Zoom levels: 1% - 3200%
- Pan with Space + drag
- Mouse wheel zoom
- Keyboard shortcuts (Cmd/Ctrl + 0/1/+/-)
- Canvas resize and centering

### 7. Document Management ✅
- New document dialog with presets
- File open (drag & drop support)
- Save functionality (PNG export)
- Recent documents tracking
- Document state management

## Current Tools Implementation Status

### Implemented Tools (MVP Level)

| Tool | Shortcut | MVP Status | MVP Features | Full Version Features Needed |
|------|----------|------------|--------------|----------------------------|
| **Move Tool** | V | ✅ Complete | • Select and move objects<br>• Auto-select option<br>• Basic cursor feedback | • Transform controls UI<br>• Alignment options<br>• Distribution options<br>• Layer auto-selection<br>• Group selection |
| **Rectangular Marquee** | M | ✅ Complete | • Draw rectangle selection<br>• Visual feedback (marching ants)<br>• Basic constraints<br>• Pixel-based selection | • Shift for square constraint<br>• Alt for center origin<br>• Add/Subtract/Intersect modes<br>• Feather option<br>• Anti-alias<br>• Fixed ratio/size |
| **Elliptical Marquee** | M | ✅ Complete | • Draw ellipse selection<br>• Visual feedback<br>• Basic constraints<br>• Pixel-based selection | • Shift for circle constraint<br>• Alt for center origin<br>• Add/Subtract/Intersect modes<br>• Feather option<br>• Anti-alias |
| **Lasso Tool** | L | ✅ Complete | • Freehand selection<br>• Path closing<br>• Pixel-based selection | • Polygonal Lasso mode<br>• Magnetic Lasso mode<br>• Add/Subtract/Intersect<br>• Feather<br>• Anti-alias |
| **Magic Wand** | W | ✅ Complete | • Click color selection<br>• Tolerance setting<br>• Contiguous option<br>• Pixel-based selection | • Sample all layers<br>• Add/Subtract/Intersect<br>• Better edge detection<br>• Anti-alias |
| **Crop Tool** | C | ✅ Complete | • Rectangle crop<br>• Aspect ratios<br>• Enter/Esc shortcuts<br>• Non-destructive (clipPath) | • Perspective crop<br>• Content-aware crop<br>• Straighten tool<br>• Delete/hide pixels option<br>• Rule of thirds overlay |
| **Hand Tool** | H | ✅ Complete | • Pan canvas<br>• Space key temporary<br>• Grab cursor<br>• Fixed event handling | Fully implemented for MVP |
| **Zoom Tool** | Z | ✅ Complete | • Click zoom in/out<br>• Alt+click zoom out<br>• Zoom levels | • Scrubby zoom<br>• Zoom rectangle<br>• Animated zoom<br>• Fit/Fill options |
| **Brush Tool** | B | ✅ Complete | • Size control<br>• Opacity<br>• Color picker<br>• Basic smoothing<br>• Layer integration | • Pressure sensitivity<br>• Hardness control<br>• Flow control<br>• Brush presets<br>• Dual brush<br>• Texture<br>• Dynamics |
| **Eraser Tool** | E | ✅ Complete | • Basic erasing<br>• Size control<br>• Proper composite operation<br>• Theme-aware background<br>• Layer integration | • Background eraser mode<br>• Magic eraser mode<br>• Opacity/flow<br>• Hardness |

### Unimplemented Tools

| Tool | Shortcut | Category | Priority | Notes |
|------|----------|----------|----------|-------|
| Quick Selection | W | Selection | High | Part of Phase 5 |
| Eyedropper | I | Color | High | Part of Phase 5 |
| Type Tool | T | Text | High | Epic 2 |
| Clone Stamp | S | Retouching | High | Epic 4 |
| Healing Brush | J | Retouching | High | Epic 4 |
| Pen Tool | P | Vector | Medium | Epic 3 |
| Shape Tools | U | Vector | Medium | Epic 3 |
| Gradient Tool | G | Paint | Medium | Epic 4 |
| Paint Bucket | G | Paint | Low | Epic 4 |

## Implementation Progress by Phase

### Phase 0: Code Quality Foundation ✅ COMPLETED
- [x] Create BaseTool abstract class with proper lifecycle management
- [x] Implement ToolStateManager for encapsulated state
- [x] Create EventManager mixin for consistent event handling
- [x] Set up performance monitoring infrastructure
- [x] Document patterns and create example implementations

**Key Files Created**:
- `lib/editor/tools/base/BaseTool.ts`
- `lib/editor/tools/base/SelectionTool.ts`
- `lib/editor/tools/base/DrawingTool.ts`
- `lib/editor/tools/utils/toolState.ts`
- `lib/editor/tools/utils/constraints.ts`

### Phase 1: Command Pattern & History ✅ COMPLETED
- [x] Implement Command Pattern base classes and interfaces
- [x] Create HistoryStore with undo/redo functionality
- [x] Implement canvas commands (AddObject, RemoveObject, Transform, Modify)
- [x] Enable Edit menu with Undo/Redo UI and keyboard shortcuts

**Key Files Created**:
- `lib/editor/commands/base/Command.ts`
- `lib/editor/commands/base/CompositeCommand.ts`
- `lib/editor/commands/canvas/*`
- `store/historyStore.ts`

### Phase 2: Tool Migration ✅ COMPLETED
- [x] Migrate Move Tool as reference implementation
- [x] Create SelectionTool base class for marquee/lasso tools
- [x] Migrate all selection tools with proper cleanup
- [x] Create DrawingTool base class for brush/eraser
- [x] Migrate Brush/Eraser tools with command recording
- [x] Migrate Hand, Zoom, Crop tools to new architecture

**All tools now**:
- Use BaseTool architecture
- Have encapsulated state (no module-level variables)
- Properly clean up event listeners
- Record commands for undo/redo
- Handle errors gracefully

### Phase 3: Layer System ✅ COMPLETED
- [x] Define Layer interfaces and types
- [x] Implement LayerStore with proper state management
- [x] Build Layers Panel UI
- [x] Add layer commands for history
- [x] **Update all tools to work with layers**

**What's Been Done**:
- Full layer data structure with types
- LayerStore with CRUD operations, reordering, visibility/lock toggles
- Beautiful Layers Panel with drag-and-drop, opacity/blend mode controls
- Commands for all layer operations
- Fabric.js v6 type compatibility fixed
- **LayerAwareMixin** created for tool integration
- All drawing tools (Brush, Eraser) now respect layers

### Phase 4: Selection Enhancement 🚧 IN PROGRESS
- [x] **SelectionManager** - Core selection engine with pixel masks
- [x] **SelectionRenderer** - Visual rendering with marching ants
- [x] **Selection Store** - State management for modes and options
- [x] **Selection Commands** - Basic command structure
- [x] **Tool Integration** - All selection tools use SelectionManager
- [ ] **Clipboard Operations** - Copy/Cut/Paste implementation
- [ ] **Selection Menu** - Wire up Select menu items
- [ ] **Advanced Operations** - Expand, contract, feather UI
- [ ] **Quick Mask Mode** - Edit selections as grayscale

**Current Status**:
- Core infrastructure complete
- All selection tools create pixel-based selections
- Boolean operations supported (replace, add, subtract, intersect)
- Need to implement clipboard and menu integration

### Phase 5: Missing Tools 🔴 NOT STARTED
- [ ] Implement Quick Selection Tool (W)
- [ ] Implement Eyedropper Tool (I)

Both tools must follow the established patterns from Phase 0-2.

### Phase 6: Testing & Documentation 🔴 NOT STARTED
- [ ] Write unit tests for BaseTool and core utilities
- [ ] Write integration tests for each tool
- [ ] Test for memory leaks and performance issues
- [ ] Document architecture for future epics
- [ ] Create tool implementation guide

## Critical Technical Decisions Made

### 1. Fabric.js Version Handling
- Project uses Fabric.js v6 which includes TypeScript types
- Don't use @types/fabric (it's for v5)
- Import types directly: `import { FabricObject } from 'fabric'`

### 2. Tool Architecture
- All tools extend BaseTool
- State encapsulated in classes, not module-level
- Event cleanup is automatic via BaseTool
- Commands record all mutations

### 3. Layer System Design
- Layers contain arrays of object IDs, not objects
- Canvas still renders all objects (for performance)
- Objects tagged with layerId for ownership
- Layer operations update both store and canvas

### 4. Selection System Design
- Pixel-based selections using ImageData masks
- Separate visual rendering from selection logic
- Boolean operations at pixel level
- Integration with existing tool architecture

### 5. File Organization
```
lib/editor/
├── commands/       # Command pattern implementation
├── tools/         # All tools organized by type
├── canvas/        # Canvas utilities
├── filters/       # Filter system (future)
├── layers/        # Layer system (future expansion)
├── selection/     # Selection system (Phase 4)
└── performance/   # Performance monitoring
```

## Known Issues & Gotchas

1. **Selection Persistence**: Selections are not yet persisted in commands
2. **Clipboard Integration**: Copy/paste not yet implemented
3. **Selection Transforms**: Can't yet transform selections
4. **Performance**: Large selections may be slow

## Recommended Next Steps

### For Phase 4 Completion (2-3 days)
1. Implement clipboard operations (copy/cut/paste)
2. Wire up Select menu items
3. Add UI for selection modifications
4. Test with complex selections

### For Phase 5 Start (1-2 days) 
1. Quick Selection Tool (similar to Magic Wand)
2. Eyedropper Tool (color sampling)

### Quick Wins
- Add selection mode indicators to UI
- Implement select all/none shortcuts
- Add selection info to status bar

## Testing Checklist for Handoff

Before considering any phase complete:
- [ ] All tools work at different zoom levels
- [ ] Undo/redo works for all operations  
- [ ] No console errors during normal use
- [ ] Memory usage stable (no leaks)
- [ ] Dark mode works properly
- [ ] Keyboard shortcuts functioning

## Dependencies for Other Epics

Other epics can proceed in parallel but should:
- Use the BaseTool architecture
- Follow the command pattern
- Respect the layer system
- Integrate with selection system (once Phase 4 complete)

---

**Last Updated**: 2024-01-08 (Phase 4 in progress)
**Updated By**: Current session (implementing selection system)
**Ready for Handoff**: Phase 3 complete, Phase 4 core complete