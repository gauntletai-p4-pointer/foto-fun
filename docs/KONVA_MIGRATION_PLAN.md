# Konva Migration Plan - Complete Fabric.js Removal

## Executive Summary

This document outlines a comprehensive plan to complete the migration from Fabric.js to Konva, ensuring all Fabric dependencies are removed and the codebase follows best practices and established architectural patterns.

## Current State Analysis

### Migration Progress
- ✅ Core infrastructure migrated (CanvasManager, TypedCanvasStore, TypedEventBus)
- ✅ Event-driven architecture established
- ✅ Basic tool infrastructure with BaseTool
- ⚠️ 51 files still importing Fabric.js
- ⚠️ Mixed type system causing conflicts
- ❌ Command system not migrated
- ❌ AI integration using old Fabric patterns
- ❌ UI components expecting Fabric canvas

### Critical Dependencies
1. **Selection System** - Core functionality blocked
2. **Command Pattern** - Undo/redo functionality broken
3. **Text Tools** - Complex text features unavailable
4. **AI Tools** - All adapters need rewriting

## Migration Phases

### Phase 1: Foundation & Type Safety (Week 1)
**Goal**: Establish clean type system and remove all Fabric imports

#### 1.1 Type System Cleanup
- [ ] Create migration mapping: `/lib/migration/fabric-to-konva-types.ts`
- [ ] Update `/types/index.ts` to remove Fabric-specific types
- [ ] Create type guards for safe migration
- [ ] Add strict TypeScript checks for migration boundary

#### 1.2 Remove Fabric Dependencies
- [ ] Remove `fabric` from package.json
- [ ] Create Fabric polyfills for gradual migration
- [ ] Update all import statements
- [ ] Fix resulting type errors

#### 1.3 Canvas State Unification
- [ ] Remove dual canvas state (fabricCanvas vs konvaStage)
- [ ] Update CanvasStore to use only Konva state
- [ ] Migrate canvas initialization logic

### Phase 2: Core Systems Migration (Week 2)

#### 2.1 Selection System
```typescript
// New selection architecture
interface SelectionManager {
  // Pixel-based selection
  createPixelSelection(bounds: Rect, mask: ImageData): void
  
  // Object-based selection
  selectObjects(objectIds: string[]): void
  
  // Selection operations
  expandSelection(pixels: number): void
  contractSelection(pixels: number): void
  featherSelection(pixels: number): void
}
```

- [ ] Implement pixel-based selection with Konva
- [ ] Create selection visualization layer
- [ ] Migrate selection events to TypedEventBus
- [ ] Update all selection-dependent features

#### 2.2 Command System
```typescript
// New command pattern for Konva
abstract class KonvaCommand implements Command {
  abstract execute(context: CommandContext): Promise<void>
  abstract undo(context: CommandContext): Promise<void>
  
  protected emitEvent(event: CanvasEvent): void {
    this.context.eventBus.emit(event.type, event.data)
  }
}
```

- [ ] Create new command base classes
- [ ] Migrate all canvas commands
- [ ] Implement proper event emission
- [ ] Update history store integration

#### 2.3 Object Management
- [ ] Create object factory for Konva nodes
- [ ] Implement object serialization/deserialization
- [ ] Add object metadata system
- [ ] Create object transformation utilities

### Phase 3: Tool Migration (Week 3)

#### 3.1 Selection Tools
- [ ] Marquee tools with pixel selection
- [ ] Lasso tool with path selection
- [ ] Magic wand with color-based selection
- [ ] Quick selection with edge detection

#### 3.2 Drawing Tools
- [ ] Brush tool with pressure sensitivity
- [ ] Eraser with true transparency
- [ ] Shape tools with Konva shapes
- [ ] Path tools with bezier curves

#### 3.3 Text Tools
```typescript
// Text system architecture
class KonvaTextManager {
  createText(options: TextOptions): KonvaText
  warpText(text: KonvaText, warpStyle: WarpStyle): void
  convertToPath(text: KonvaText): KonvaPath
}
```

- [ ] Basic text creation and editing
- [ ] Text effects (warp, path text)
- [ ] Typography controls
- [ ] Text-to-path conversion

#### 3.4 Transform Tools
- [ ] Move tool with snapping
- [ ] Rotate with pivot points
- [ ] Scale with aspect ratio lock
- [ ] Crop with aspect ratios

### Phase 4: AI Integration (Week 4)

#### 4.1 AI Tool Adapters
```typescript
// New AI adapter pattern
abstract class KonvaAIAdapter extends BaseToolAdapter {
  protected async getCanvasContext(): Promise<AICanvasContext> {
    const manager = this.canvasManager
    return {
      objects: manager.getSelectedObjects(),
      bounds: manager.getSelectionBounds(),
      imageData: await manager.getImageData()
    }
  }
}
```

- [ ] Rewrite all AI tool adapters
- [ ] Update canvas context for AI operations
- [ ] Implement preview generation with Konva
- [ ] Add proper error handling

#### 4.2 AI-Canvas Bridge
- [ ] Update CanvasToolBridge for Konva
- [ ] Implement selection snapshot system
- [ ] Add AI operation locks
- [ ] Create AI preview layer

### Phase 5: UI Component Updates (Week 5)

#### 5.1 Panel Components
- [ ] Layers panel with Konva layers
- [ ] Properties panel for Konva objects
- [ ] Text panels with new text system
- [ ] Tool options with Konva parameters

#### 5.2 Canvas Component
- [ ] Remove all Fabric canvas references
- [ ] Update mouse event handling
- [ ] Implement proper canvas sizing
- [ ] Add performance optimizations

#### 5.3 Dialogs and Modals
- [ ] Image generation dialog
- [ ] Export dialog with Konva
- [ ] Document settings
- [ ] Tool-specific dialogs

### Phase 6: Testing & Optimization (Week 6)

#### 6.1 Testing Strategy
- [ ] Unit tests for all migrated systems
- [ ] Integration tests for workflows
- [ ] Performance benchmarks
- [ ] Visual regression tests

#### 6.2 Performance Optimization
- [ ] Implement Konva caching strategies
- [ ] Optimize layer rendering
- [ ] Add WebGL acceleration where needed
- [ ] Memory usage optimization

#### 6.3 Migration Validation
- [ ] Verify no Fabric imports remain
- [ ] Check all features work correctly
- [ ] Validate performance improvements
- [ ] User acceptance testing

## Implementation Guidelines

### 1. Event-Driven Architecture
All state changes MUST go through the event system:
```typescript
// Good
await eventStore.append(new ObjectAddedEvent(object))

// Bad
canvasManager.objects.push(object)
```

### 2. Type Safety
Use strict types throughout:
```typescript
// Good
function updateObject(id: string, updates: Partial<CanvasObject>): void

// Bad
function updateObject(id: any, updates: any): void
```

### 3. Resource Management
Always clean up resources:
```typescript
class Tool extends BaseTool {
  protected setupTool(): void {
    this.registerInterval('update', () => this.update(), 100)
    this.registerEventListener('mousemove', this.handleMove)
  }
  // Cleanup automatic via BaseTool
}
```

### 4. Performance Considerations
- Use Konva's built-in caching
- Batch operations with `batchDraw()`
- Implement viewport culling
- Use WebGL layers for filters

### 5. Error Handling
```typescript
try {
  await canvasManager.applyFilter(filter)
} catch (error) {
  eventBus.emit('error', {
    code: 'FILTER_FAILED',
    message: error.message,
    context: { filter }
  })
}
```

## Migration Checklist

### Pre-Migration
- [ ] Create migration branch
- [ ] Set up migration tracking
- [ ] Document current functionality
- [ ] Create rollback plan

### During Migration
- [ ] Follow phase plan strictly
- [ ] Update tests as you go
- [ ] Document breaking changes
- [ ] Regular team sync meetings

### Post-Migration
- [ ] Remove all Fabric code
- [ ] Update documentation
- [ ] Performance validation
- [ ] User training materials

## Success Criteria

1. **No Fabric Dependencies**: Zero imports from 'fabric' package
2. **Type Safety**: 100% TypeScript coverage with strict mode
3. **Performance**: 50%+ improvement in filter operations
4. **Memory**: 30% reduction in memory usage
5. **Features**: All existing features work correctly
6. **Architecture**: Clean event-driven architecture throughout

## Risk Mitigation

### Technical Risks
- **Text Features**: Complex text effects may need custom implementation
- **Performance**: Some operations might be slower initially
- **Compatibility**: Third-party integrations may break

### Mitigation Strategies
- Incremental migration with feature flags
- Comprehensive testing at each phase
- Performance profiling throughout
- Clear rollback procedures

## Timeline Summary

- **Week 1**: Foundation & Type Safety
- **Week 2**: Core Systems (Selection, Commands, Objects)
- **Week 3**: Tool Migration
- **Week 4**: AI Integration
- **Week 5**: UI Components
- **Week 6**: Testing & Optimization

Total Duration: 6 weeks with dedicated team

## Next Steps

1. Review and approve migration plan
2. Assign team members to phases
3. Set up migration tracking dashboard
4. Begin Phase 1 implementation
5. Daily standups during migration

---

This plan ensures complete removal of Fabric.js while maintaining code quality, performance, and following established architectural patterns. The phased approach allows for incremental progress with validation at each step.