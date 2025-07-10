# Konva Migration Completion Plan

## Overview
This document outlines a systematic plan to complete the Fabric to Konva migration by fixing all lint and type errors. The errors have been analyzed and categorized into two sections for parallel work by two Claude Code instances.

## Error Summary
- **Total Lint Errors**: ~150+ errors
- **Total Type Errors**: ~200+ errors
- **Main Categories**:
  1. Missing store imports (old stores removed)
  2. Unused imports and variables
  3. `any` type usage
  4. Missing type declarations
  5. Incorrect method calls on migrated classes
  6. React hook dependency issues
  7. `require()` imports that need conversion

## Section 1: Core Infrastructure & Stores (First Instance)

### 1.1 Store Import Resolution
**Files to fix**:
- `app/editor/page.tsx` - Missing store imports
- `components/dialogs/NewDocumentDialog.tsx` - Missing documentStore
- `components/editor/dialogs/ImageGenerationDialog.tsx` - Missing canvasStore
- `components/editor/MenuBar/index.tsx` - Multiple missing stores
- `components/editor/Panels/AIChat/*.tsx` - Missing canvasStore
- `components/editor/Panels/LayersPanel/index.tsx` - Missing historyStore
- `components/editor/Panels/TextEffectsPanel/TextWarpSection.tsx` - Missing stores
- `components/editor/ToolOptions/*.tsx` - Missing toolOptionsStore, colorStore
- `hooks/useCanvasReady.ts` - Missing canvasStore
- `hooks/useFileHandler.ts` - Missing documentStore

**Action**: Update imports to use new event-driven stores from proper locations

### 1.2 Core Library Files
**Files to fix**:
- `lib/core/AppInitializer.ts` - Convert all `require()` to ES imports
- `lib/core/ResourceManager.ts` - Replace `any` types with proper interfaces
- `lib/core/ServiceContainer.ts` - Fix `any` types and improve type safety
- `lib/events/core/TypedEventBus.ts` - Remove unused imports, fix Function type
- `lib/store/base/BaseStore.ts` - Fix `any` types and method signatures
- `lib/ai/adapters/base.ts` - Fix adapter type issues
- `lib/commands/enhanced/Command.ts` - Convert `require()` imports, fix `any` types

### 1.3 Canvas Infrastructure
**Files to fix**:
- `lib/editor/canvas/CanvasManager.ts` - Fix method signatures for Konva
- `lib/editor/canvas/types.ts` - Ensure all types align with Konva
- `lib/store/canvas/CanvasStore.ts` - Fix event handler methods
- `lib/store/canvas/TypedCanvasStore.ts` - Remove unused imports, fix `any` types

### 1.4 Event System Files
**Files to fix**:
- `lib/events/canvas/CanvasEvents.ts` - Remove unused `_currentState` parameters
- `lib/events/canvas/DocumentEvents.ts` - Fix type mismatches
- `lib/events/canvas/LayerEvents.ts` - Remove unused parameters
- `lib/events/canvas/SelectionEvents.ts` - Remove unused parameters
- `lib/events/canvas/ToolEvents.ts` - Fix `any` types and unused parameters

## Section 2: Tools & UI Components (Second Instance)

### 2.1 Tool Migration Fixes
**Files to fix**:
- `lib/editor/tools/base/BaseTool.ts` - Fix abstract method implementations
- `lib/editor/tools/base/SelectionTool.ts` - Update for Konva API (no more fabric methods)
- `lib/editor/tools/base/WebGLFilterTool.ts` - Fix null vs undefined types
- `lib/editor/tools/drawing/brushTool.ts` - Fix stage property and type issues
- `lib/editor/tools/text/*.ts` - Update all text tools for Konva
- `lib/editor/tools/transform/*.ts` - Fix hand and zoom tools
- `lib/editor/tools/eyedropperTool.ts` - Update for Konva pixel access
- `lib/editor/tools/filters/vintageEffectsTool.ts` - Ensure WebGL compatibility
- `lib/editor/tools/index.ts` - Fix export names

### 2.2 UI Components
**Files to fix**:
- `components/editor/Canvas/index.tsx` - Remove unused TypedEventBus, fix ref cleanup
- `components/editor/StatusBar/index.tsx` - Remove unused useStore
- `components/editor/ToolOptions/index.tsx` - Remove unused state variables
- `components/editor/ToolOptions/VintageEffectsOptions.tsx` - Add missing dependencies
- `components/editor/ToolPalette/index.tsx` - Fix `any` type
- `components/editor/Panels/*Panel/index.tsx` - Fix all `any` types in panel components

### 2.3 AI Integration
**Files to fix**:
- `lib/ai/adapters/tools/brightness.ts` - Fix `any` types
- `lib/ai/execution/ChainAdapter.ts` - Update for new event system
- Other tool adapters as needed

### 2.4 Miscellaneous Components
**Files to fix**:
- `components/debug/*.tsx` - Fix observer and debug component issues
- `components/dialogs/*.tsx` - Fix implicit `any` parameters
- `lib/utils/*.ts` - Update utility functions for Konva

## Implementation Guidelines

### Type Safety Rules
1. **Never use `any`** - Replace with proper types or `unknown` if type is truly dynamic
2. **Define interfaces** for all data structures
3. **Use generics** where appropriate for reusable components
4. **Leverage TypeScript inference** where possible

### Import Resolution
1. Check `@/lib/di/api` for dependency injection imports
2. Use event-driven stores from `@/lib/store/*/Event*Store`
3. Convert all `require()` to ES module imports
4. Remove imports for deleted files (like historyStore.ts)

### Konva-Specific Updates
1. Replace Fabric methods with Konva equivalents:
   - `canvas.getPointer()` → `stage.getPointerPosition()`
   - `canvas.findTarget()` → `stage.getIntersection()`
   - `canvas.renderAll()` → `layer.batchDraw()`
   - Object properties differ between Fabric and Konva

### React Best Practices
1. Fix all hook dependency warnings
2. Properly handle ref cleanups
3. Remove unused state variables

## Execution Order

### Phase 1: Foundation (Both instances start here)
1. Fix store imports to unblock components
2. Update core infrastructure files
3. Ensure event system is properly typed

### Phase 2: Implementation
- **Instance 1**: Continue with canvas infrastructure and event files
- **Instance 2**: Begin tool migration fixes

### Phase 3: UI & Integration
- **Instance 1**: Help with remaining UI components if needed
- **Instance 2**: Complete tool updates and AI integration

### Phase 4: Verification
1. Run `bun lint` - should show 0 errors
2. Run `bun typecheck` - should show 0 errors
3. Test core functionality to ensure nothing broke

## Success Criteria
- Zero lint errors
- Zero type errors
- All tools working with Konva
- Proper event-driven architecture throughout
- No suppressed errors (unless absolutely justified)
- Clean, type-safe codebase ready for production