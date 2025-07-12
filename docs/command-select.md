# Command & Selection Systems: Complete Architectural Migration

## 🎯 **MISSION: 100% Senior-Level Architecture with 0% Technical Debt**

**Status:** 🚀 **IN PROGRESS** - Active Implementation  
**Priority:** Critical Foundation  
**Estimated Effort:** 2-3 sprints  
**Risk:** Medium (breaking changes required)  
**Impact:** Complete architectural transformation  

---

## 📊 **CURRENT STATE ANALYSIS (2025-01-12)**

### 🚨 **CRITICAL ISSUES IDENTIFIED**

#### **1. Command System Issues**
- ✅ **Good Foundation**: Event-driven base architecture exists
- ❌ **Inconsistent Patterns**: 3 different command constructor patterns
- ❌ **Mixed Domain Models**: Layer vs Object terminology inconsistency  
- ❌ **Type Safety Issues**: 372 TypeScript errors across command system
- ❌ **Lint Violations**: Multiple eslint errors with `any` types and unused imports

#### **2. Selection System Issues**  
- ❌ **Code Duplication**: 200+ lines of duplicated selection logic across SelectionManager, SelectionOperations, and commands
- ❌ **Poor Abstraction**: Direct pixel manipulation scattered across multiple classes
- ❌ **Inconsistent APIs**: Multiple ways to create and modify selections
- ❌ **Memory Leaks**: Selection contexts not properly cleaned up

#### **3. Domain Model Migration Issues**
- ✅ **Layer References**: Migrated `layerId` → `objectId`, `KonvaObjectAddedEvent` → `ObjectAddedEvent`
- ❌ **Event Names**: Mix of layer-based and object-based event naming (still needs cleanup)
- ❌ **File Structure**: `LayerManager.ts` exists alongside `ObjectManager.ts` (consolidation needed)
- ❌ **Tool Operations**: Tools still reference layer-based patterns instead of object-based operations

### **Current Command Architecture Assessment**

**✅ What's Working:**
- Event-driven command execution with TypedEventBus integration
- Transactional command pattern with rollback capabilities  
- Command metadata and workflow support
- Composite command pattern for complex operations

**❌ Critical Problems:**
- **Constructor Inconsistency**: Commands use 3 different parameter patterns
- **Type Safety**: 65+ TypeScript errors in command files alone
- **Domain Confusion**: Mix of Layer and Object terminology
- **Error Handling**: Inconsistent error patterns across commands

### **Current Selection Architecture Assessment**

**✅ What's Working:**
- Pixel-based selection with ImageData masks
- Boolean operations (add, subtract, intersect, replace)
- Event-driven selection changes
- Selection context for AI workflows

**❌ Critical Problems:**
- **Massive Duplication**: Same pixel operations in 3+ classes
- **Poor Performance**: No optimization for large selections
- **Memory Issues**: Selection contexts not properly disposed
- **API Inconsistency**: 5+ different ways to create selections

---

## 🎯 **COMPREHENSIVE MIGRATION PLAN**

### **Phase 1: Foundation & Domain Migration** (Sprint 1 - Week 1-2)
**Goal**: Establish consistent domain model and eliminate layer references

### **Phase 2: Command System Standardization** (Sprint 1 - Week 3-4)  
**Goal**: Implement consistent command patterns and eliminate type errors

### **Phase 3: Selection System Refactoring** (Sprint 2 - Week 1-2)
**Goal**: Eliminate duplication and create proper abstractions

### **Phase 4: Integration & Optimization** (Sprint 2 - Week 3-4)
**Goal**: Performance optimization and final polish

---

## 🚀 **PHASE 1: FOUNDATION & DOMAIN MIGRATION**

### **✅ COMPLETED TASKS**

*None yet - starting implementation*

### **🔄 IN PROGRESS TASKS**

#### **Task 1.1: Complete Layer → Object Domain Migration**

**Problem**: Mixed terminology causing confusion and type errors

**Status**: ✅ **COMPLETED** - Domain migration in progress

**CRITICAL CONTEXT**: We are migrating from a layer-based architecture to an object-based architecture. This affects:

1. **Tool Categories**: All tools now operate on objects, not layers
   - **Object Creation Tools**: Create new `CanvasObject` instances (Frame, Text, Shape tools)
   - **Pixel Manipulation Tools**: Modify pixel data within existing image objects (Brush, Eraser, Filters)
   - **Transform Tools**: Modify object properties and spatial relationships (Move, Crop, Rotate)
   - **Selection Tools**: Create pixel-level selections within image objects (Marquee, Lasso, Magic Wand)
   - **AI-Enhanced Tools**: AI-powered versions of traditional tools (cross-category)

2. **Object vs Filters**: 
   - ✅ **Correct**: `object.filters` (direct property on CanvasObject)
   - ❌ **Incorrect**: `object.metadata?.filterStack` (legacy layer-based pattern)

**Files Requiring Migration:**
- ✅ `lib/events/canvas/ToolEvents.ts` - Line 242: `layerId: string` → `objectId: string` **COMPLETED**
- ✅ `lib/events/canvas/GradientEvents.ts` - Lines 13, 44: `layerId` references → `objectId` **COMPLETED**
- ✅ `lib/editor/tools/text/HorizontalTypeTool.ts` - Line 7: `KonvaObjectAddedEvent` import → `ObjectAddedEvent` **COMPLETED**
- ✅ `lib/editor/tools/text/VerticalTypeTool.ts` - Line 7: `KonvaObjectAddedEvent` import → `ObjectAddedEvent` **COMPLETED**
- ✅ `lib/editor/text/effects/index.ts` - Lines 31-33, 58-60: `.getLayer()` calls → Valid Konva API calls **COMPLETED**
- 🔄 `lib/store/canvas/TypedCanvasStore.ts` - Line 75: `layerId` property → `objectId` **IN PROGRESS**

**Migration Rules:**
```typescript
// Variable/Property Names
layerId → objectId
selectedLayers → selectedObjects  
layerManager → objectManager
layerStore → objectStore
currentLayer → currentObject

// Event Names  
'layer.created' → 'object.created'
'layer.updated' → 'object.updated'
'layer.deleted' → 'object.deleted'
'layer.moved' → 'object.moved'

// Class/Interface Names
KonvaObjectAddedEvent → ObjectAddedEvent
KonvaObjectModifiedEvent → ObjectModifiedEvent
LayerManager → ObjectManager (already exists)

// Method Names
getLayer() → getParent() or remove entirely
```

#### **Task 1.2: Fix Critical Type Errors**

**Problem**: 372 TypeScript errors blocking development

**Priority Issues:**
1. **EnhancedDrawingTool**: 65 errors - missing properties, undefined references
2. **PixelBuffer**: 47 errors - null reference issues, missing layer property
3. **Event Type Mismatches**: Missing event properties in TypedEventBus
4. **Store Type Issues**: Selection and canvas store type mismatches

### **🔲 PENDING TASKS**

#### **Task 1.3: Eliminate All Layer File References**
- [ ] Rename `lib/editor/canvas/services/LayerManager.ts` → `ObjectManager.ts` (if different from existing)
- [ ] Update all imports from LayerManager to ObjectManager
- [ ] Remove any remaining layer-based type definitions

#### **Task 1.4: Standardize Event Registry**
- [ ] Add missing event types to TypedEventBus EventRegistry
- [ ] Fix event property mismatches
- [ ] Ensure all events have proper timestamp properties

---

## 🔧 **PHASE 2: COMMAND SYSTEM STANDARDIZATION**

### **🔲 PENDING TASKS**

#### **Task 2.1: Implement Unified Command Context Pattern**

**Problem**: Commands use inconsistent constructor patterns

**Current Patterns:**
```typescript
// Pattern 1: Direct dependencies
new AddObjectCommand(eventBus, canvas, objectData)

// Pattern 2: Canvas manager first  
new UpdateObjectCommand(eventBus, canvas, objectId, updates)

// Pattern 3: Description first
new CompositeCommand(eventBus, description, commands)
```

**Target Pattern:**
```typescript
// Unified: Context-based with dependency injection
export interface CommandContext {
  readonly eventBus: TypedEventBus
  readonly canvasManager: CanvasManager
  readonly selectionManager: SelectionManager
  readonly executionId: string
  readonly timestamp: number
}

export abstract class Command {
  constructor(
    description: string,
    context: CommandContext,
    metadata?: Partial<CommandMetadata>
  ) {
    // Standardized constructor
  }
}
```

#### **Task 2.2: Implement Command Factory Pattern**

**Problem**: No standardized way to create commands

**Solution**: Factory with dependency injection
```typescript
export interface CommandFactory {
  createAddObjectCommand(object: CanvasObject): AddObjectCommand
  createUpdateObjectCommand(objectId: string, updates: Partial<CanvasObject>): UpdateObjectCommand
  createRemoveObjectCommand(objectId: string): RemoveObjectCommand
  createSelectionCommand(selection: PixelSelection, mode: SelectionMode): CreateSelectionCommand
  createCompositeCommand(description: string, commands: Command[]): CompositeCommand
}
```

#### **Task 2.3: Implement Result Pattern for Error Handling**

**Problem**: Inconsistent error handling across commands

**Solution**: Standardized Result pattern
```typescript
export type CommandResult<T = void> = 
  | CommandSuccess<T>
  | CommandFailure

export interface CommandSuccess<T> {
  success: true
  data: T
  events: DomainEvent[]
  metadata: ExecutionMetadata
}

export interface CommandFailure {
  success: false
  error: CommandError
  rollback?: () => Promise<void>
}
```

#### **Task 2.4: Command Validation Service**

**Problem**: No validation layer for command parameters

**Solution**: Validation service with Zod schemas
```typescript
export interface CommandValidationService {
  validateCommand(command: Command): ValidationResult
  validateBatch(commands: Command[]): BatchValidationResult
}
```

---

## 🎯 **PHASE 3: SELECTION SYSTEM REFACTORING**

### **🔲 PENDING TASKS**

#### **Task 3.1: Extract Selection Domain Service**

**Problem**: Selection operations duplicated across multiple classes

**Current Duplication:**
- `SelectionManager.applySelectionMode()` - 100+ lines
- `SelectionOperations.combine()` - 80+ lines  
- `CreateSelectionCommand.execute()` - 50+ lines

**Solution**: Centralized domain service
```typescript
export interface SelectionDomainService {
  combineSelections(
    existing: PixelSelection | null,
    newSelection: PixelSelection,
    mode: SelectionMode
  ): PixelSelection

  transformSelection(
    selection: PixelSelection,
    transform: SelectionTransform
  ): PixelSelection

  validateSelection(selection: PixelSelection): ValidationResult
  calculateBounds(mask: ImageData): SelectionBounds
  optimizeSelection(selection: PixelSelection): PixelSelection
}
```

#### **Task 3.2: Selection Performance Optimization**

**Problem**: Poor performance with large selections

**Solutions:**
- Implement dirty rectangle optimization
- Add selection caching
- Optimize pixel operations with WebGL where possible
- Implement selection compression for memory efficiency

#### **Task 3.3: Selection Context Cleanup**

**Problem**: Memory leaks in selection contexts

**Solution**: Proper disposal patterns
```typescript
export class SelectionContextManager {
  private contexts: Map<string, WorkflowSelectionContext> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  dispose(): void {
    this.contexts.clear()
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}
```

---

## 🚀 **PHASE 4: INTEGRATION & OPTIMIZATION**

### **🔲 PENDING TASKS**

#### **Task 4.1: Command Middleware Pipeline**

**Solution**: Cross-cutting concerns handled by middleware
```typescript
export interface CommandMiddleware {
  name: string
  execute(command: Command, next: () => Promise<CommandResult>): Promise<CommandResult>
}

// Built-in middleware:
// - ValidationMiddleware
// - LoggingMiddleware  
// - MetricsMiddleware
// - SecurityMiddleware
```

#### **Task 4.2: Performance Optimization**

**Targets:**
- Command execution < 10ms for simple operations
- Selection operations < 50ms for typical selections
- Memory usage stable over long sessions
- Zero memory leaks

#### **Task 4.3: Final Type Safety & Lint Cleanup**

**Goals:**
- 0 TypeScript errors
- 0 ESLint errors  
- 100% strict type coverage
- No `any` types in command/selection code

---

## 📊 **PROGRESS TRACKING**

### **Overall Progress: 5%**
- [x] Current state analysis completed
- [x] Migration plan documented
- [ ] Phase 1: Foundation (0/4 tasks)
- [ ] Phase 2: Commands (0/4 tasks)  
- [ ] Phase 3: Selection (0/3 tasks)
- [ ] Phase 4: Integration (0/3 tasks)

### **Phase 1 Progress: 25%**
- [x] Task 1.1: Domain migration (80% - Major event/tool migrations complete)
- [ ] Task 1.2: Type error fixes (0%)
- [ ] Task 1.3: Layer file cleanup (0%)
- [ ] Task 1.4: Event registry (0%)

### **Critical Metrics**
- **TypeScript Errors**: 372 → Target: 0
- **ESLint Errors**: 25+ → Target: 0
- **Code Duplication**: 200+ lines → Target: 0
- **Layer References**: 15+ → Target: 0

---

## 🎯 **DEFINITION OF DONE**

The migration is ONLY complete when:

### **Code Quality (100% Required)**
- [ ] **Zero TypeScript errors** in command/selection files
- [ ] **Zero ESLint errors** in command/selection files  
- [ ] **Zero `any` types** in command/selection code
- [ ] **100% test coverage** for new domain services

### **Architecture Consistency (100% Required)**
- [ ] **All commands** use unified CommandContext pattern
- [ ] **All selection operations** go through SelectionDomainService
- [ ] **Zero code duplication** in selection logic
- [ ] **Consistent error handling** with Result pattern

### **Domain Model Purity (100% Required)**
- [ ] **Zero layer references** in TypeScript files (except CSS/styling)
- [ ] **All events** use object-based naming (object.created, etc.)
- [ ] **All variables** use object terminology (objectId, selectedObjects)
- [ ] **File structure** reflects object-based architecture

### **Performance Standards (100% Required)**
- [ ] **Command execution** < 10ms for simple operations
- [ ] **Selection operations** < 50ms for typical selections  
- [ ] **Memory usage** stable over 8+ hour sessions
- [ ] **Zero memory leaks** in command/selection systems

### **Senior-Level Patterns (100% Required)**
- [ ] **Dependency injection** for all services (no singletons)
- [ ] **Event-driven communication** (no direct method calls)
- [ ] **Command pattern** for all state changes
- [ ] **Factory pattern** for object creation
- [ ] **Composition over inheritance** in tool design

---

## 🚨 **IMPLEMENTATION NOTES**

### **Breaking Changes Required**
- Command constructor signatures will change
- Selection API methods will be restructured  
- Event names will be updated
- File imports will need updating

### **Migration Strategy**
1. **Gradual Migration**: Update one command type at a time
2. **Backward Compatibility**: Maintain old APIs during transition
3. **Comprehensive Testing**: Test each phase thoroughly
4. **Performance Monitoring**: Track metrics throughout migration

### **Risk Mitigation**
- **Feature Flags**: Quick disable of new system if needed
- **Rollback Plan**: Git branches for each phase
- **Monitoring**: Real-time error tracking during migration
- **Testing**: Extensive unit and integration tests

---

## 🎯 **NEXT STEPS**

1. **Begin Phase 1 Implementation** - Start with domain migration
2. **Fix Critical Type Errors** - Unblock development
3. **Establish Testing Framework** - Ensure quality throughout migration
4. **Set Up Progress Tracking** - Monitor migration success

*This document will be updated in real-time as implementation progresses.* 