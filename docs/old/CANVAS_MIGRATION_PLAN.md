# Canvas Architecture Migration Plan

## Overview

Complete migration from Fabric.js to a modern, pixel-aware canvas architecture using Konva.js as the rendering engine, while maintaining all existing functionality and integrating our robust event-sourced systems.

## Core Principles

1. **No Technical Debt** - Clean architecture from the ground up
2. **Event Sourcing** - All state changes through events
3. **Robust Selection** - ExecutionContext with locked selections
4. **AI Integration** - Tool adapters compatible with AI SDK v5
5. **Pixel + Object Support** - True image editing capabilities

## Architecture Components

### 1. Canvas Manager
- **Status**: ✅ Core implementation complete
- **Features**:
  - Layer management with blend modes
  - Object management (images, text, shapes)
  - Selection system with marching ants
  - Pixel operations (getImageData, putImageData)
  - Event emission with ExecutionContext support
  - Viewport controls (zoom, pan)

### 2. Event System Integration
- **Status**: ✅ Integrated
- **Components**:
  - EventStore for append-only event log
  - ExecutionContext for atomic operations
  - Event-based history for undo/redo
  - Selection snapshot preservation

### 3. Tool System
- **Status**: 🚧 In Progress
- **Base Classes**:
  - `BaseTool` - Core tool interface
  - `SelectionTool` - For selection tools
  - `DrawingTool` - For pixel-based tools
  - `TransformTool` - For object manipulation

### 4. Tool Adapters for AI
- **Status**: 📋 Planned
- **Requirements**:
  - Compatible with AI SDK v5
  - Support for ExecutionContext
  - Event emission during execution
  - Selection preservation

## Migration Phases

### Phase 1: Core Infrastructure ✅
- [x] Canvas types and interfaces
- [x] CanvasManager implementation
- [x] Event system integration
- [x] Basic layer support

### Phase 2: Tool System 🚧
- [ ] Base tool classes
- [ ] Selection tools (rectangle, ellipse, lasso, magic wand)
- [ ] Transform tools (move, rotate, scale, crop)
- [ ] Drawing tools (brush, eraser, clone)
- [ ] Adjustment tools (brightness, contrast, etc.)

### Phase 3: Pixel Operations 📋
- [ ] Filter system with WebGL acceleration
- [ ] Brush engine with pressure support
- [ ] Eraser with true transparency
- [ ] Clone stamp and healing brush
- [ ] Content-aware fill

### Phase 4: AI Integration 📋
- [ ] Update tool adapters for new architecture
- [ ] Migrate ChainAdapter to use new CanvasManager
- [ ] Update AI agents to use new tools
- [ ] Test single and multi-step workflows

### Phase 5: UI Integration 📋
- [ ] Update Canvas component to use CanvasManager
- [ ] Migrate tool palette
- [ ] Update panels (layers, properties, etc.)
- [ ] Connect history UI to EventBasedHistoryStore

### Phase 6: Advanced Features 📋
- [ ] Adjustment layers
- [ ] Layer masks
- [ ] Smart objects
- [ ] Vector path tools
- [ ] Text on path

### Phase 7: Migration & Cleanup 📋
- [ ] Migrate existing documents
- [ ] Remove Fabric.js dependencies
- [ ] Update tests
- [ ] Performance optimization

## Key Differences from Fabric.js

### Object Model
- **Fabric**: Everything is a fabric.Object
- **New**: Separation between pixel layers and vector objects

### Selection
- **Fabric**: Selection is an object property
- **New**: Selection is a separate system with pixel-level support

### Filters
- **Fabric**: Limited filter set, object-based
- **New**: Pixel-based filters with WebGL acceleration

### Tools
- **Fabric**: Tools manipulate objects
- **New**: Tools can manipulate pixels OR objects

### History
- **Fabric**: Command pattern
- **New**: Event sourcing with ExecutionContext

## Implementation Guidelines

### Tool Implementation
```typescript
class BrushTool extends DrawingTool {
  // Pixel-based drawing
  // Pressure support
  // Blend modes
  // Real-time preview
}
```

### Filter Implementation
```typescript
class GaussianBlurFilter implements Filter {
  apply(imageData: ImageData, params: { radius: number }): ImageData {
    // WebGL shader for performance
    // Fallback to CPU implementation
  }
}
```

### AI Adapter Pattern
```typescript
class BrightnessAdapter extends BaseToolAdapter {
  async execute(params, context, executionContext) {
    // Use ExecutionContext for event emission
    // Preserve selection state
    // Apply to correct layer/selection
  }
}
```

## Success Criteria

1. **Feature Parity**: All current features work in new system
2. **Performance**: Better performance for large images
3. **Reliability**: No selection drift or state corruption
4. **AI Integration**: Single and multi-step workflows work flawlessly
5. **User Experience**: Seamless migration for users

## Technical Requirements

- TypeScript with strict typing
- Event sourcing for all state changes
- WebGL for performance-critical operations
- Progressive enhancement (CPU fallbacks)
- Memory efficient for large images
- Extensible architecture for future features 