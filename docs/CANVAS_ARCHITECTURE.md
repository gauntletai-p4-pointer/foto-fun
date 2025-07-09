# How the Canvas Works in FotoFun

Based on a comprehensive exploration of the codebase, here's a detailed explanation of how the canvas system works:

## 1. Core Architecture

The canvas system is built on **Fabric.js v6**, a powerful HTML5 canvas library that provides an object-oriented approach to canvas manipulation. The system has three main components:

- **Canvas Component** (`components/editor/Canvas/index.tsx`)
- **Canvas Store** (`store/canvasStore.ts`) - Zustand state management
- **Fabric.js Canvas Instance** - The actual rendering engine

## 2. Canvas Initialization

The canvas initialization flow works as follows:

1. The `Canvas` React component mounts and creates DOM references
2. It calls `initCanvas` from the canvas store with the canvas element and dimensions
3. The store creates a Fabric.js Canvas instance with these settings:
   - Theme-aware background color (light/dark mode)
   - Preserve object stacking
   - Enable selection
   - Auto-render on add/remove

```typescript
const canvas = new Canvas(element, {
  width,
  height,
  backgroundColor: bgColor,
  preserveObjectStacking: true,
  selection: true,
  renderOnAddRemove: true,
})
```

## 3. State Management

The canvas state is managed by Zustand with these key properties:

- `fabricCanvas` - The Fabric.js instance
- `zoom` - Current zoom level (1% to 3200%)
- `isPanning` - Whether the user is panning
- `selectionManager` - Manages pixel-based selections
- `isReady` - Canvas initialization status
- `initializationPromise` - Async initialization tracking

## 4. Zoom System

The canvas supports sophisticated zoom functionality:

- **Zoom Levels**: Predefined steps from 1% to 3200%
- **Mouse Wheel Zoom**: Zoom in/out at cursor position
- **Keyboard Shortcuts**: 
  - Cmd/Ctrl + 0: Zoom to fit
  - Cmd/Ctrl + 1: Actual size (100%)
  - Cmd/Ctrl + +/-: Zoom in/out
- **Zoom Display**: Shows current zoom percentage in the corner

## 5. Pan/Navigation

Users can navigate the canvas through:

- **Space + Drag**: Temporary hand tool for panning
- **Hand Tool**: Dedicated tool for panning
- **Viewport Transform**: Canvas maintains a viewport transform matrix for pan/zoom

## 6. Selection System

FotoFun uses a unique **pixel-based selection system** (not typical for Fabric.js):

- **SelectionManager**: Converts vector paths to pixel masks
- **Boolean Operations**: Add, subtract, intersect selections
- **Selection Modifications**: Expand, contract, feather, invert
- **Marching Ants**: Animated selection borders via SelectionRenderer

## 7. Layer System Integration

Objects on the canvas are organized into layers:

- Each Fabric object has a `layerId` custom property
- Layers control:
  - **Visibility**: Show/hide objects
  - **Opacity**: Layer-wide opacity
  - **Locking**: Prevent editing
  - **Z-order**: Stacking order
- `syncLayersToCanvas()` maintains proper object ordering

## 8. Tool Integration

Tools interact with the canvas through a consistent pattern:

```typescript
class MyTool extends BaseTool {
  protected setupTool(canvas: Canvas): void {
    // Add event handlers
    this.addCanvasEvent('mouse:down', this.handleMouseDown)
    
    // Configure canvas
    canvas.selection = false
    canvas.isDrawingMode = true
  }
}
```

## 9. Drawing Tools

Drawing tools like the Brush use Fabric's built-in drawing mode:

- Enable `canvas.isDrawingMode`
- Configure `canvas.freeDrawingBrush`
- Listen for `path:created` events
- Associate created paths with active layer

## 10. Command Pattern & History

All canvas modifications use the Command pattern:

- Commands encapsulate canvas operations
- Support undo/redo functionality
- Examples: AddObjectCommand, RemoveObjectCommand, TransformCommand

## 11. Event Handling

The canvas handles various events:

- **Mouse Events**: Down, move, up, wheel
- **Keyboard Events**: Shortcuts for tools and actions
- **Object Events**: Selection, modification, transformation
- **Canvas Events**: Render, zoom, pan

## 12. Performance Optimizations

- **RequestAnimationFrame**: Smooth updates during drawing
- **Render on Demand**: `canvas.requestRenderAll()` for efficiency
- **Off-screen Canvas**: Selection system uses separate canvas for pixel operations
- **Viewport Culling**: Fabric.js automatically culls off-screen objects

## 13. AI Tool Integration

AI tools interact with the canvas through:

- **CanvasToolBridge**: Provides canvas context to AI operations
- **Canvas readiness check**: `waitForReady()` ensures canvas is initialized
- **Image data extraction**: For pixel-based AI operations
- **Result application**: Applies AI-generated content back to canvas

## 14. File Handling

The canvas supports:

- **Drag & Drop**: Drop images directly onto canvas
- **File Import**: Load images as new objects
- **PNG Export**: Save canvas content

## 15. Responsive Design

The canvas automatically adjusts to window resizing:

- Monitors window resize events
- Updates canvas dimensions
- Maintains zoom and pan position

## Key Files Reference

- **Canvas Component**: `components/editor/Canvas/index.tsx`
- **Canvas Store**: `store/canvasStore.ts`
- **Selection Manager**: `lib/editor/selection/SelectionManager.ts`
- **Layer Store**: `store/layerStore.ts`
- **Base Tool**: `lib/editor/tools/base/BaseTool.ts`
- **Canvas Bridge**: `lib/ai/tools/canvas-bridge.ts`
- **Constants**: `constants/index.ts`

This canvas system provides a robust foundation for a professional image editor, combining Fabric.js's object model with custom pixel-based selection tools and a sophisticated layer system. 