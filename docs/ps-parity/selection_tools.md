# Selection Tools - Photoshop Parity Documentation (80/20 Focus)

## Overview
This document tracks the implementation of essential Photoshop-style selection tools in our Konva-based editor, following the 80/20 principle - focusing on the 20% of tools that handle 80% of use cases.

## Architecture Status

### ✅ Completed Foundation
- **BaseSelectionTool** - Abstract base class for all selection tools
  - Real-time modifier key detection (not stored state)
  - Constraint handling (Shift for square/circle, Alt for center)
  - Visual feedback management
  - Integration with SelectionManager
  
- **SelectionManager** - Core selection state management
  - `applySelection()` method as main entry point
  - Pixel-based selection with ImageData masks
  - Event emission through TypedEventBus
  - Integration with SelectionOperations
  
- **SelectionOperations** - Pure functions for selection modifications
  - Boolean operations: add, subtract, intersect
  - Modifications: expand, contract, feather, smooth
  - Transform operations
  - Gaussian blur and median filter implementations

- **SelectionRenderer** - ✅ Completed
  - Marching ants visualization with edge detection
  - Mode-based preview colors
  - Efficient canvas-based rendering

### ✅ Completed Tools
- **MarqueeRectTool** - Rectangle selection tool
  - All modifier key combinations
  - Anti-aliasing support
  - Visual preview with mode colors
  
- **MarqueeEllipseTool** - Elliptical selection tool
  - All modifier key combinations  
  - Anti-aliasing support
  - Visual preview with mode colors
  - Proper constraint handling (Shift for circle)

## Tool Grouping (Essential Tools Only)

### Marquee Tools Group
- [x] Rectangle Marquee Tool
- [x] Elliptical Marquee Tool

### Lasso Tools Group
- [ ] Lasso Tool (freehand)

### Quick Selection Tools Group
- [ ] Quick Selection Tool
- [ ] Magic Wand Tool

## Implementation Status

### Phase 1: Basic Selection Tools ✅ COMPLETED
- [x] Create base architecture (BaseSelectionTool)
- [x] Update SelectionManager for pixel-based selections
- [x] Create SelectionOperations for modifications
- [x] Create SelectionRenderer for marching ants
- [x] Implement MarqueeRectTool
- [x] Implement MarqueeEllipseTool
- [x] Add tool grouping UI support

### Phase 2: Essential Selection Tools 🚧 IN PROGRESS
- [ ] Implement basic Lasso Tool
- [ ] Implement Magic Wand Tool
- [ ] Implement Quick Selection Tool

### Phase 3: Core Selection Operations
- [ ] Save/Load selections
- [ ] Transform selection
- [ ] Basic selection modifications (expand, contract, feather)

## Tools NOT Being Implemented (80/20 Principle)
These tools handle edge cases and are rarely used:
- ❌ Single Row/Column Marquee Tools - Very niche use
- ❌ Polygonal Lasso Tool - Can use regular lasso with clicks
- ❌ Magnetic Lasso Tool - Complex implementation, limited benefit
- ❌ Select and Mask - Advanced feature beyond core needs
- ❌ Object Selection Tool - AI-based, complex
- ❌ Select Subject - AI-based, complex
- ❌ Color Range - Magic Wand covers most use cases
- ❌ Focus Area - Very specialized

## Modifier Key Behavior (Photoshop Accurate)

### During Tool Use
- **No modifier**: Replace selection
- **Shift**: Add to selection
- **Alt/Option**: Subtract from selection
- **Shift + Alt**: Intersect with selection

### During Drag
- **Shift**: Constrain proportions (square/circle)
- **Alt/Option**: Draw from center
- **Shift + Alt**: Constrain + from center

## Visual Feedback

### Colors
- Replace: Blue (#0066ff)
- Add: Green (#00cc00)
- Subtract: Red (#ff3333)
- Intersect: Purple (#9933ff)

### Marching Ants ✅ COMPLETED
- Edge detection using simplified marching squares
- Smooth animation at 10fps
- Black and white contrast for visibility
- Handles any selection shape

## Event Flow
```
User Input → Tool → SelectionManager → TypedEventBus → UI Updates
                ↓
           Visual Preview
                ↓
           Canvas Update
```

## Migration Notes
- All Fabric selection code has been removed from CanvasManager
- No backwards compatibility or feature flags
- Clean event-driven architecture
- No technical debt
- Following 80/20 principle for feature selection

## Next Steps
1. Implement basic Lasso Tool
2. Implement Magic Wand Tool
3. Implement Quick Selection Tool
4. Add basic selection operations (expand, contract, feather)

## Testing Checklist
- [ ] All modifier key combinations work correctly
- [ ] Selection operations (expand, contract, etc.) work
- [ ] Marching ants display properly
- [ ] Events fire correctly
- [ ] No memory leaks with ImageData
- [ ] Performance with large selections
- [ ] Undo/redo integration

## UI Implementation

### Tool Grouping ✅ COMPLETED
- Photoshop-style grouped tools in palette
- Click and hold to show flyout menu
- Primary tool selection persists
- Visual indicator (chevron) for grouped tools
- Smooth 300ms long-press activation 