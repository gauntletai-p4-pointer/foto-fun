# FotoFun Architecture Refactoring Tasks

## Overview

This document outlines critical refactoring tasks to complete the migration from a layer-based, document-centric architecture to an object-based, infinite canvas architecture. The codebase is currently at ~30% completion of this migration, with significant technical debt and performance issues.

**CRITICAL: Each agent must demonstrate EXTREME OWNERSHIP and SENIOR-LEVEL THINKING. You are not just fixing bugs - you are establishing architectural excellence. Proactively identify and fix ANY code that doesn't follow our established patterns.**

## Current State Summary

### Critical Issues
1. **Incomplete Object Migration** - Mixed layer/object paradigms throughout codebase
2. **Performance Bottlenecks** - No dirty rectangle rendering, full layer redraws
3. **Technical Debt** - 50+ TODOs, deprecated methods, console.logs in production
4. **Type Safety Issues** - Excessive use of `any` types and unsafe assertions
5. **Legacy Canvas Dimensions** - Fixed canvas size assumptions vs infinite canvas
6. **Pattern Violations** - Inconsistent use of DI, event-driven architecture, and established patterns

### Architecture Status
- ✅ Well-designed: Event system, Command pattern, Store architecture, Service Container (DI)
- ⚠️ Needs work: Canvas rendering, Tool system, Error handling
- ❌ Critical: Object migration incomplete, Performance issues, Technical debt, Pattern violations

## Core Architectural Principles (MUST BE ENFORCED)

### 1. Dependency Injection
- ALL services must be injected via ServiceContainer
- NO direct imports of singletons (e.g., `getTypedEventBus()`)
- Constructor injection preferred over property injection
- Example of GOOD pattern:
  ```typescript
  constructor(
    eventBus: TypedEventBus,
    canvasManager: ICanvasManager,
    resourceManager: ResourceManager
  ) {
    this.eventBus = eventBus
    // ...
  }
  ```

### 2. Event-Driven Architecture
- ALL state changes must emit events via TypedEventBus
- NO direct method calls between loosely coupled components
- Use event patterns for:
  - Canvas operations
  - Tool state changes
  - Object modifications
  - UI updates

### 3. Command Pattern
- ALL user actions must go through Command pattern
- Commands must emit events for tracking
- Support undo/redo via proper state capture

### 4. Proper Resource Management
- ALL resources must be tracked via ResourceManager
- Cleanup in destroy() methods
- No memory leaks from event listeners or timers

### 5. Type Safety
- NO `any` types
- NO unsafe type assertions
- Proper discriminated unions for variants
- Runtime validation for external data

---

## Task Group 1: Object Migration & Architecture Cleanup

**Goal**: Complete the migration from layer-based to object-based architecture and remove all legacy code while enforcing architectural patterns.

### Context for Agent 1
You are responsible for completing the object-based migration and removing all layer references. The codebase uses Konva.js for canvas rendering and has an event-driven architecture with dependency injection via ServiceContainer. The migration is currently 30% complete with many files still containing layer-based code.

**SENIOR ENGINEER EXPECTATIONS**:
- Don't just fix the listed issues - identify and fix ALL related problems
- Enforce dependency injection patterns - NO singleton imports
- Ensure ALL state changes emit proper events
- Leave the code better than you found it
- Think about future maintainability and extensibility

### Tasks

#### 1.1 Complete CanvasStore Event Migration
**File**: `lib/store/canvas/CanvasStore.ts`
- Fix 5 TODO comments (lines 85, 97, 108, 112, 124)
- Update all event handlers to use new event structure
- Remove commented-out layer-based code
- Ensure all events properly update object state

#### 1.2 Rename LayerManager to ObjectManager
**File**: `lib/editor/canvas/services/LayerManager.ts`
- Rename file to `ObjectManager.ts`
- Update class name from `LayerManager` to `ObjectManager`
- Remove all layer terminology from methods and properties
- Update all imports throughout codebase
- Update method names (e.g., `getActiveLayer` → `getSelectedObjects`)

#### 1.3 Remove Layer References from RenderPipeline
**File**: `lib/editor/canvas/services/RenderPipeline.ts`
- Remove `layers` field from RenderPlan interface
- Update rendering logic to be purely object-based
- Remove all comments referencing layers
- Ensure object-based rendering is consistent

#### 1.4 Update Canvas Types
**File**: `lib/editor/canvas/types.ts`
- Remove deprecated `Layer` interface (lines 51-74)
- Remove layer-related types and interfaces
- Update documentation to reflect object-based model
- Ensure all imports are updated

#### 1.5 Remove Deprecated Methods
**Files**: Multiple
- Remove `getActiveLayer()` from TypedCanvasStore and CanvasStore
- Remove `prepareCanvas()` and `restoreCanvas()` from EventBasedToolChain
- Update all callers to use new methods
- Remove CommandAdapter if being phased out

#### 1.6 Fix Canvas Dimension Legacy Code
**Critical Files**:
- `lib/ai/adapters/resolvers/crop.ts` - Remove canvasWidth/canvasHeight assumptions
- `lib/store/document/EventDocumentStore.ts` - Update document bounds logic
- `components/editor/dialogs/ExportDialog.tsx` - Fix viewport/canvas conflation
- `lib/editor/tools/base/ObjectDrawingTool.ts` - Remove fixed canvas size
- `docs/CANVAS_ARCHITECTURE_REDESIGN.md` - Update outdated references
- `lib/events/core/TypedEventBus.ts` - Remove canvas.resized event

**Actions**:
- Replace all `canvasWidth`/`canvasHeight` references with viewport-based calculations
- Remove assumptions about canvas boundaries or edges
- Update percentage-based calculations to work with infinite canvas
- Ensure all code treats canvas as infinite space, not bounded area
- Remove any "align to canvas edge" functionality
- Update crop resolver to use object bounds instead of canvas bounds

#### 1.7 Enforce Architectural Patterns (CRITICAL)
**Pattern Violations to Fix**:
- Files importing singletons directly (e.g., `getTypedEventBus()`)
- Components not using dependency injection
- State changes without event emissions
- Direct method calls between loosely coupled components
- Missing ResourceManager usage for cleanup

**Files with Pattern Violations**:
- `lib/editor/tools/base/DrawingTool.ts` - Direct import of getTypedEventBus
- `lib/editor/commands/base/Command.ts` - Should inject eventBus via constructor
- `lib/ai/tools/ImageGenerationTool.ts` - Should inject dependencies
- Any file with `ServiceContainer.getInstance()` calls

**Actions**:
- Convert ALL singleton imports to constructor injection
- Ensure ALL tools receive dependencies via constructor
- Update ALL commands to use injected event bus
- Add proper cleanup in ALL destroy() methods

### Success Criteria
- Zero references to "layer" in non-UI code
- All event handlers functioning with object-based model
- No deprecated methods remaining
- Canvas treated as infinite space throughout
- No fixed canvas dimensions anywhere in code
- ALL services use dependency injection
- NO direct singleton imports
- ALL state changes emit events

---

## Task Group 2: Performance & Rendering Optimization

**Goal**: Implement critical performance optimizations and fix rendering bottlenecks while maintaining architectural integrity.

### Context for Agent 2
You are responsible for optimizing the rendering pipeline and fixing performance issues. The current implementation does full layer redraws instead of dirty rectangle rendering, causing significant performance problems. React components lack memoization, and there are memory leaks in various caching systems.

**SENIOR ENGINEER EXPECTATIONS**:
- Profile and measure performance improvements
- Consider mobile and low-end device performance
- Implement scalable solutions, not quick fixes
- Ensure optimizations don't break architectural patterns
- Document performance-critical code sections

### Tasks

#### 2.1 Implement Dirty Rectangle Rendering
**File**: `lib/editor/canvas/services/RenderPipeline.ts`
- Implement true dirty rectangle tracking (TODO at line 219)
- Create efficient rectangle merging algorithm (replace O(n²) at line 327)
- Update render methods to only redraw dirty regions
- Add dirty region visualization for debugging

#### 2.2 Add React Memoization
**Files**: All component files
- Add `React.memo` to all major components:
  - `components/editor/Canvas/index.tsx`
  - `components/editor/ToolPalette/index.tsx`
  - `components/editor/Panels/*.tsx`
  - `components/editor/MenuBar/index.tsx`
  - `components/editor/StatusBar/index.tsx`
- Use `useMemo` for expensive computations
- Implement proper dependency arrays
- Prevent unnecessary re-renders

#### 2.3 Fix Memory Leaks
**Critical Files**:
- `lib/editor/canvas/services/ImageLoaderService.ts`
  - Revoke blob URLs after use (line 189)
  - Implement image cache cleanup
  - Add memory limits to cache
- `lib/editor/fonts/FontManager.ts`
  - Implement cache size limits
  - Add LRU eviction policy
- `lib/editor/text/services/TextToPathConverter.ts`
  - Limit font cache size
  - Clean up unused fonts
- `lib/editor/selection/SelectionContextManager.ts`
  - Reduce cleanup interval from 60s to 10s
  - Add maximum cache size

#### 2.4 Replace Polling with Events
**Files**:
- `components/editor/StatusBar/index.tsx` - Remove 500ms interval
- `components/editor/MenuBar/index.tsx` - Remove polling for object state
- Update to use event-driven updates via TypedEventBus
- Remove any `setInterval` calls without proper cleanup

#### 2.5 Optimize WebGL Filters
**File**: `lib/editor/filters/WebGLFilterEngine.ts`
- Implement filter result caching
- Add cache invalidation logic
- Optimize filter chaining
- Implement Gaussian blur in WebGL
- Preload WebGL library instead of on-demand loading

#### 2.6 Implement Progressive Image Loading
**File**: `lib/editor/canvas/services/ImageLoaderService.ts`
- Add progressive loading for large images
- Implement thumbnail generation
- Add streaming support for files > 10MB
- Show loading progress to user
- Optimize concurrent load limit (currently 3)

#### 2.7 Ensure Event-Driven Updates (CRITICAL)
**Pattern Enforcement**:
- Replace ALL polling mechanisms with event subscriptions
- Ensure performance optimizations use TypedEventBus
- No direct state reading in intervals/timeouts
- Proper cleanup of all event listeners

**Files Needing Event-Driven Refactor**:
- Any component using setInterval for state checks
- Tools checking canvas state in loops
- UI components polling for updates

### Success Criteria
- Dirty rectangle rendering fully functional
- 50%+ reduction in unnecessary React re-renders
- No memory leaks in production
- All updates event-driven (no polling)
- WebGL filters cached and optimized
- Large images load progressively
- ALL polling replaced with events
- Proper resource cleanup verified

---

## Task Group 3: Type Safety & Error Handling

**Goal**: Eliminate type safety issues, implement proper error handling, and remove all console.logs while establishing robust error recovery patterns.

### Context for Agent 3
You are responsible for improving type safety and error handling throughout the codebase. There are currently 21+ instances of `any` types, 60+ console.log statements, and many silent error failures. The application lacks React error boundaries and proper user notifications.

**SENIOR ENGINEER EXPECTATIONS**:
- Design comprehensive error handling strategy
- Create reusable error patterns for the team
- Think about error recovery, not just reporting
- Implement telemetry-ready error tracking
- Consider user experience in all error scenarios
- Enforce type safety as a development practice

### Tasks

#### 3.1 Remove All `any` Types
**Files with `any` types**:
- `types/index.ts` - Replace `target?: any` and `data?: any`
- `lib/editor/tools/types/tool-options.ts` - Fix function signatures (lines 199, 212)
- `lib/ai/agents/specialized/ImageImprovementAgent.ts` - Replace `z.any()` schemas
- `lib/ai/agents/tools/agent-tools.ts` - Define proper parameter types
- `lib/ai/adapters/base/BaseToolAdapter.ts` - Remove `as unknown as` casts

**Actions**:
- Replace `any` with specific types or `unknown`
- Add proper type definitions for all data structures
- Use discriminated unions where appropriate
- Add type guards for runtime validation

#### 3.2 Fix Type Assertions
**Critical Files**:
- `lib/editor/clipboard/ClipboardManager.ts` - Validate parsed JSON (line 73)
- `lib/auth/actions.ts` - Validate form data before assertion
- `lib/ai/adapters/base/BaseToolAdapter.ts` - Remove `as unknown` casts
- `lib/core/middleware/MiddlewarePipeline.ts` - Check lastError exists

**Actions**:
- Add runtime validation for external data
- Use type guards instead of assertions
- Implement proper error handling for invalid data
- Add Zod schemas for validation

#### 3.3 Remove Console.log Statements
**Files**: 60+ instances across codebase
- Create proper logging service in `lib/utils/logger.ts`
- Replace all console.* with logger
- Add log levels (debug, info, warn, error)
- Ensure no logs in production builds
- Critical files:
  - `lib/editor/shortcuts/ShortcutManager.ts`
  - `lib/ai/client/tool-executor.ts`
  - `lib/events/execution/EventBasedToolChain.ts`

#### 3.4 Implement Error Boundaries
**Files**: Create new error boundary components
- Create `components/ui/ErrorBoundary.tsx` component
- Add error boundaries at strategic levels:
  - Around Canvas component
  - Around tool panels
  - Around AI chat interface
- Implement fallback UI for errors
- Add error reporting mechanism

#### 3.5 Fix Silent Error Failures
**Critical Files**:
- `lib/store/base/BaseStore.ts` (line 92-94) - Propagate listener errors
- `lib/editor/autosave/AutoSaveManager.ts` - Notify user of save failures
- `lib/editor/clipboard/ClipboardManager.ts` (line 46-48, 72) - Show clipboard errors
- `lib/db/supabase/server.ts` (line 20) - Handle missing env vars
- `lib/core/AppInitializer.ts` - Propagate initialization failures

**Actions**:
- Add user notifications for errors (toast/modal)
- Implement error recovery mechanisms
- Log errors to error tracking service
- Never silently fail operations

#### 3.6 Implement Custom Error Classes
**File**: `lib/ai/errors/index.ts`
- Use existing error hierarchy consistently:
  - `FotoFunError`, `CanvasError`, `ToolError`, etc.
- Replace generic Error throws with specific types
- Add error codes for common failures
- Implement error serialization for API responses
- Don't expose error details in production (line in route.ts)

#### 3.7 Fix Non-null Assertions
**Critical Files**:
- `lib/env.ts` - Add validation for environment variables
- `lib/core/middleware/MiddlewarePipeline.ts` - Check lastError exists
- `lib/editor/canvas/CanvasManager.ts` - Check selectionManager exists

**Actions**:
- Provide helpful error messages for missing config
- Use default values where appropriate
- Fail fast with clear errors
- Add proper null checks before assertions

#### 3.8 Establish Error Recovery Patterns (CRITICAL)
**Error Recovery Strategy**:
- Create consistent retry mechanisms for transient failures
- Implement graceful degradation for feature failures
- Design offline-capable error handling
- Create error recovery UI components

**Patterns to Implement**:
- Exponential backoff for API retries
- Circuit breaker for failing services
- Fallback rendering for component errors
- State recovery after crashes

#### 3.9 Enforce Architectural Patterns in Error Handling
**Pattern Requirements**:
- All errors must be proper Error subclasses
- Error handling must use event system for notification
- Logging service must be injected, not imported
- Error boundaries must report via TypedEventBus

### Success Criteria
- Zero `any` types in codebase
- Zero console.log statements
- All errors handled with user notification
- React error boundaries implemented
- Type-safe external data handling
- No non-null assertions without checks
- Comprehensive error recovery strategy
- All errors follow architectural patterns

---

## Execution Instructions

### For Each Agent

1. **Start with your task group** - Focus only on your assigned tasks
2. **Read file context** - Understand the current implementation before making changes
3. **Follow patterns** - Match existing code style and architecture patterns
4. **Test changes** - Ensure no regressions with your modifications
5. **Update imports** - Fix all import statements when renaming/moving files
6. **Document changes** - Add comments for complex refactoring decisions
7. **ENFORCE PATTERNS** - Proactively fix any code that violates our architectural principles

### Senior Engineering Principles

**EXTREME OWNERSHIP means**:
- If you see a problem, fix it - even if not explicitly listed
- Leave every file better than you found it
- Think about the next developer who will work on this code
- Consider edge cases and failure modes
- Write code that scales and maintains consistency

**Pattern Enforcement**:
- Dependency Injection: NO singleton imports, ALL services injected
- Event-Driven: ALL state changes emit events
- Command Pattern: ALL user actions use commands
- Resource Management: ALL resources properly cleaned up
- Type Safety: NO any types, NO unsafe assertions

### Order of Operations

While agents work in parallel, some tasks have dependencies:
- Agent 1 should complete LayerManager rename early (affects other agents)
- Agent 2's dirty rectangle implementation may require Agent 1's object migration
- Agent 3 can work independently on type safety
- ALL agents must enforce architectural patterns in their areas

### Validation

After completing tasks, run:
```bash
npm run typecheck  # Should pass with no errors
npm run lint       # Should pass with no errors
npm run build      # Should complete successfully
```

### Communication

If you encounter blockers or need clarification:
- Document the issue clearly
- Propose a solution
- Continue with other tasks while waiting
- Share pattern violations you find with other agents

---

## Expected Outcomes

Upon completion of all tasks:

1. **Architecture**: 
   - Clean object-based architecture with no layer references
   - 100% dependency injection compliance
   - Fully event-driven state management
   - Consistent command pattern usage

2. **Performance**: 
   - 50%+ improvement in rendering performance
   - Zero memory leaks
   - Efficient dirty rectangle rendering
   - Optimized React component rendering

3. **Type Safety**: 
   - 100% type coverage, no unsafe assertions
   - Zero `any` types
   - Runtime validation for all external data
   - Type-safe event system

4. **Error Handling**: 
   - Robust error handling with user notifications
   - Comprehensive error recovery strategies
   - React error boundaries at all levels
   - Zero console.log statements

5. **Code Quality**: 
   - No technical debt
   - Clean, maintainable codebase
   - Consistent architectural patterns
   - Ready for rapid feature development

6. **Developer Experience**:
   - Self-documenting code
   - Clear architectural boundaries
   - Easy to extend and maintain
   - Predictable behavior

This refactoring will establish a solid foundation for the infinite canvas photo editor with AI-native tools, setting a new standard for code quality and architectural excellence.