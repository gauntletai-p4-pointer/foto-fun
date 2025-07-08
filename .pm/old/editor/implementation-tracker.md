# FotoFun Implementation Tracker

## Current Status (Last Updated: Today)

### Project Overview
- **Project**: FotoFun - Photoshop-like photo editor MVP
- **Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS v4, Fabric.js, PIXI.js, Zustand, Lucide icons
- **Package Manager**: Bun (not npm/npx)
- **Key Constraint**: No ESLint suppressions or `any` types allowed

### Completed Features

#### ✅ Phase 0: Project Setup
- Core dependencies installed
- TypeScript configured with strict mode
- Path aliases set up
- Base project structure (no /src directory)

#### ✅ Phase 1: Core Canvas System
- Canvas store with Fabric.js integration
- Zoom controls (1% - 3200%) with mouse wheel and keyboard shortcuts
- Pan functionality (Space + drag)
- Complete UI shell (MenuBar, ToolPalette, Canvas, Panels, OptionsBar, StatusBar)

#### ✅ File Operations
- New Document Dialog with presets
- File open with drag & drop
- Save functionality (downloads as PNG)
- Document state management

#### ✅ Tool System
- Tool registration and switching system
- Implemented tools:
  - Move Tool (V) - selecting and moving objects
  - Rectangle Marquee Tool (M) - rectangle selections
  - Hand Tool (H) - panning
  - Zoom Tool (Z) - click to zoom in/out
  - Brush Tool (B) - freehand drawing
  - **Crop Tool (C) - JUST COMPLETED**

#### ✅ Theme System
- Dark/Light mode toggle in View menu
- Custom colors:
  - Light shell: #F5F4ED
  - Light canvas: #FAF9F5
  - Dark shell: #212020
  - Dark canvas: #191817

#### ✅ Tool Options System
- Dynamic options bar based on active tool
- Option components: Checkbox, Number, ButtonGroup, Slider
- Tool-specific options configured

### Just Completed: Crop Tool Implementation

**Implementation Details:**
- Uses modern Fabric.js `clipPath` approach (not the deprecated `clipTo`)
- Non-destructive cropping that preserves original image data
- Features:
  - Click and drag to create crop selection
  - Works in all directions (left-to-right, right-to-left, etc.)
  - Aspect ratio support (hold Shift)
  - Keyboard shortcuts:
    - Enter: Apply crop
    - Escape: Cancel crop
  - Canvas resizes to crop dimensions
  - Works with multiple objects on canvas

**Key Code Pattern:**
```typescript
// Apply clipPath to objects instead of actually cropping
const clipPath = new Rect({
  left: cropLeft,
  top: cropTop,
  width: cropWidth,
  height: cropHeight,
  absolutePositioned: true  // Important!
})
obj.clipPath = clipPath
```

### Established Patterns

#### Tool Implementation Pattern
```typescript
export const toolName: Tool = {
  id: TOOL_IDS.TOOL_NAME,
  name: 'Tool Name',
  icon: IconComponent,
  cursor: 'cursor-type',
  shortcut: 'X',
  isImplemented: true,
  
  onMouseDown: (event: ToolEvent) => { /* ... */ },
  onMouseMove: (event: ToolEvent) => { /* ... */ },
  onMouseUp: (event: ToolEvent) => { /* ... */ },
  onActivate: (canvas: Canvas) => { 
    // Set up tool, add keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => { /* ... */ }
    window.addEventListener('keydown', handleKeyDown)
    // Store handler for cleanup
    ;(canvas as any)._toolKeyHandler = handleKeyDown
  },
  onDeactivate: (canvas: Canvas) => { 
    // Clean up, remove listeners
    const handler = (canvas as any)._toolKeyHandler
    if (handler) {
      window.removeEventListener('keydown', handler)
      delete (canvas as any)._toolKeyHandler
    }
  }
}
```

#### Fabric.js Import Pattern
```typescript
// Import specific classes, not namespace
import { Rect, FabricImage, Circle, Group } from 'fabric'
import type { Canvas, FabricObject, TPointerEvent } from 'fabric'
```

### Next Steps (Priority Order)

1. **Fix Tool Selection UI** ✅
   - The active tool highlight needs to be a perfect square
   - Currently in the todo list

2. **Implement Remaining Selection Tools**
   - Elliptical Marquee Tool
   - Lasso Tool  
   - Magic Wand Tool
   - All should follow the established tool pattern

3. **Selection Operations**
   - Add/Subtract/Intersect modes
   - Should work with all selection tools
   - UI already exists in options bar

4. **Type Tool**
   - Basic text input functionality
   - Font selection
   - Size and style options

5. **Local Save Implementation**
   - Save files locally in the repo
   - Persistence between sessions
   - Integration with document store

### Known Issues & Gotchas

1. **Fabric.js Version**: Using latest version which has `clipPath` instead of `clipTo`
2. **TypeScript Strictness**: No `any` types or ESLint suppressions allowed
3. **Canvas Reference**: Always check for null/undefined
4. **Event Types**: Use `TPointerEvent` for mouse events in Fabric.js
5. **Keyboard Handlers**: Must be properly cleaned up in `onDeactivate`

### Testing Instructions

To test the crop tool:
1. Open any image
2. Select Crop Tool (C)
3. Click and drag to create selection
4. Hold Shift for aspect ratio constraint
5. Press Enter to apply or Escape to cancel

### Development Commands
```bash
# Linting and type checking (run before commits)
bun lint && bun typecheck

# Development server
bun dev

# For database operations (if needed)
bun db:push
```

### Agent Handoff Notes

The crop tool implementation just went through several iterations:
1. First attempt used a complex overlay system (didn't work properly)
2. Second attempt tried to use canvas extraction (deleted images on Enter)
3. Final implementation uses the proper `clipPath` approach

The user was frustrated with the first attempts, so ensure any new implementations:
- Are thoroughly researched first
- Follow established Fabric.js patterns
- Are tested before claiming completion

The codebase is in a good state with all linting/type checking passing. The tool system is well-established, so new tools should follow the existing patterns exactly. 