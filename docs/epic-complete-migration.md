# Epic: Complete Migration to Object-Based Canvas Architecture

## 🎯 MISSION CRITICAL: Zero Technical Debt, Full Functionality

**Current State**: 434 TypeScript errors across the codebase  
**Target State**: 0 errors, fully functional, senior-level codebase  
**Success Criteria**: Complete functionality with zero hacks, suppressions, or quick fixes

## 📊 Current Error Analysis

Based on comprehensive codebase analysis, the 434 errors fall into these major categories:

1. **CanvasObject Import Errors** (~120 files): Wrong import paths from old location
2. **Layer-Based References** (~80 files): Old `canvas.state.layers` patterns  
3. **Missing Lifecycle Methods** (~40 files): AI tools missing setupTool/cleanupTool
4. **Adapter Type Mismatches** (~30 files): Registry and metadata inconsistencies
5. **Event Payload Mismatches** (~25 files): Missing toolId in AI events
6. **Missing Dependencies** (~15 files): Deleted files still referenced

## 🚀 TEAM STRUCTURE & PHASES

### **TEAM ALPHA** (Agents 1-3): Core Infrastructure & Imports
**Focus**: Foundation fixes that unblock everything else

### **TEAM BETA** (Agents 4-6): Advanced Features & Integration  
**Focus**: AI tools, adapters, and final polish

---

## 📋 PHASE 1: FOUNDATION FIXES (Team Alpha - Parallel Execution)

### **AGENT 1: Import Path Unification**
**Estimated Impact**: Fixes ~120 type errors  
**Scope**: Systematic import path corrections across entire codebase

#### Tasks:
1. **CanvasObject Import Corrections** (HIGH PRIORITY)
   ```bash
   # Find and replace across entire codebase:
   # FROM: import { CanvasObject } from '@/lib/editor/canvas/types'
   # TO:   import { CanvasObject } from '@/lib/editor/objects/types'
   ```
   
   **Files to Fix** (~50 files):
   - `components/editor/Panels/CharacterPanel/`
   - `components/editor/Panels/GlyphsPanel/`
   - `components/editor/Panels/ParagraphPanel/`
   - `components/editor/Panels/TextEffectsPanel/`
   - `lib/ai/adapters/base.ts`
   - All files in `lib/ai/adapters/tools/`
   - All files in `lib/editor/tools/`
   - Event system files

2. **Verify Import Consistency**
   - Ensure single source of truth: `lib/editor/objects/types.ts`
   - Remove duplicate type definitions
   - Update re-exports in `types/index.ts`

3. **Cross-Reference Validation**
   - Run typecheck after each batch of fixes
   - Document remaining import-related errors

**Success Criteria**:
- All CanvasObject imports use correct path
- No duplicate type definitions
- TypeScript errors reduced by ~120

---

### **AGENT 2: Layer-to-Object Migration**
**Estimated Impact**: Fixes ~80 type errors  
**Scope**: Replace all layer-based patterns with object-based equivalents

#### Tasks:
1. **Canvas State References** (HIGH PRIORITY)
   ```typescript
   // Replace these patterns:
   canvas.state.layers → canvas.getAllObjects()
   canvas.getActiveLayer() → canvas.getSelectedObjects()
   canvas.state.activeLayerId → canvas.state.selectedObjectIds
   canvas.state.documentBounds → { width: canvas.state.canvasWidth, height: canvas.state.canvasHeight }
   ```

2. **File-by-File Migration** (~30 files):
   - `lib/editor/commands/text/EditTextCommand.ts`
   - `lib/editor/commands/base/TransactionalCommand.ts`
   - `lib/editor/canvas/services/LayerManager.ts`
   - `lib/editor/canvas/services/RenderPipeline.ts`
   - `lib/editor/tools/base/DrawingTool.ts`
   - `lib/editor/tools/base/BaseTextTool.ts`
   - `lib/editor/tools/transform/flipTool.ts`
   - `lib/events/execution/EventBasedToolChain.ts`
   - `lib/ai/canvas/EnhancedCanvasContext.ts`
   - All files with `canvas.state.layers` references

3. **Method Signature Updates**
   - Update method calls to use object-based APIs
   - Ensure proper error handling for missing objects
   - Maintain existing functionality with new patterns

**Success Criteria**:
- Zero references to `canvas.state.layers`
- Zero calls to `getActiveLayer()`
- All canvas operations use object-based model
- TypeScript errors reduced by ~80

---

### **AGENT 3: Missing Dependencies & Core Fixes**
**Estimated Impact**: Fixes ~30 type errors  
**Scope**: Restore missing files and fix core dependency issues

#### Tasks:
1. **Restore Missing imageGeneration Adapter** (CRITICAL)
   ```bash
   # File missing but referenced in registry:
   lib/ai/adapters/tools/imageGeneration.ts
   ```
   - Check if `ImageGenerationAdapter.ts` should be renamed/moved
   - Update registry imports in `lib/ai/adapters/registry.ts`
   - Ensure proper export/import chain

2. **Fix Adapter Registry Type Issues**
   ```typescript
   // Issue: UnifiedToolAdapter lacks metadata property
   // Solution: Add metadata property or update registry logic
   ```
   - Analyze `lib/ai/adapters/registry.ts` type mismatches
   - Fix `getByCategory` method logic for UnifiedToolAdapter
   - Ensure proper type constraints

3. **Core Service Dependencies**
   - Verify all service container registrations
   - Fix missing service dependencies
   - Ensure proper initialization order

**Success Criteria**:
- No missing file references
- Registry compiles without type errors
- All services properly registered
- TypeScript errors reduced by ~30

---

## 📋 PHASE 2: AI INFRASTRUCTURE (Team Alpha - Sequential After Phase 1)

### **AGENT 1: AI Tool Lifecycle Methods**
**Estimated Impact**: Fixes ~40 type errors  
**Scope**: Add missing setupTool/cleanupTool methods to all AI tools

#### Tasks:
1. **Audit All AI Tools** (`lib/ai/tools/*.ts`):
   - `ObjectRemovalTool.ts`
   - `StyleTransferTool.ts`
   - `VariationTool.ts`
   - `RelightingTool.ts`
   - `UpscalingTool.ts`
   - `DepthEstimationTool.ts`
   - `InstructionEditingTool.ts`
   - `PromptEnhancementTool.ts`

2. **Add Missing Lifecycle Methods**:
   ```typescript
   async setupTool(): Promise<void> {
     // Initialize tool-specific resources
     // Set default options
     // Validate API keys/services
   }
   
   async cleanupTool(): Promise<void> {
     // Clean up resources
     // Reset state
     // Clear temporary data
   }
   ```

3. **Consistent Pattern Implementation**:
   - Follow patterns from `BackgroundRemovalTool.ts`
   - Ensure proper error handling
   - Add appropriate logging

**Success Criteria**:
- All AI tools have setupTool/cleanupTool methods
- Consistent implementation patterns
- No lifecycle-related type errors
- TypeScript errors reduced by ~40

---

### **AGENT 2: Event System Integration**
**Estimated Impact**: Fixes ~25 type errors  
**Scope**: Fix AI event payload mismatches and ensure proper event emission

#### Tasks:
1. **AI Event Payload Fixes**:
   ```typescript
   // Ensure all AI events include required toolId:
   this.eventBus.emit('ai.processing.started', {
     taskId: 'task-123',
     toolId: this.toolId, // ← Add this
     description: 'Processing...',
     targetObjectIds: ['obj1', 'obj2']
   })
   ```

2. **Event Registry Validation**:
   - Verify all AI events are properly defined in `TypedEventBus.ts`
   - Ensure event payload types match usage
   - Fix any missing event definitions

3. **Tool Event Integration**:
   - Update all AI tools to emit proper events
   - Ensure consistent event naming
   - Add proper error event handling

**Success Criteria**:
- All AI events have proper toolId in payload
- Event types match actual usage
- No event-related type errors
- TypeScript errors reduced by ~25

---

### **AGENT 3: Adapter System Completion**
**Estimated Impact**: Fixes ~20 type errors  
**Scope**: Complete the adapter system and ensure proper AI Chat integration

#### Tasks:
1. **Missing AI Chat Adapters**:
   Create adapters for remaining AI tools:
   - `UpscalingAdapter`
   - `ObjectRemovalAdapter`
   - `StyleTransferAdapter`
   - `VariationAdapter`
   - `RelightingAdapter`
   - `PromptEnhancementAdapter`
   - `DepthEstimationAdapter`
   - `InstructionEditingAdapter`

2. **Adapter Pattern Compliance**:
   ```typescript
   export class ToolNameAdapter extends UnifiedToolAdapter<Input, Output> {
     toolId = 'tool-id'
     aiName = 'toolName'
     description = `Clear description with intelligent value calculation guidance`
     inputSchema = zod.object({...})
     
     async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
       // Implementation using this.getTargets(context)
     }
   }
   ```

3. **Registry Integration**:
   - Register all new adapters in `lib/ai/adapters/registry.ts`
   - Ensure proper type compatibility
   - Test AI Chat discovery

**Success Criteria**:
- All AI tools have working adapters
- Adapters follow established patterns
- Registry compiles without errors
- AI Chat can discover all tools

---

## 📋 PHASE 3: ADVANCED FEATURES (Team Beta - Parallel with Phase 2)

### **AGENT 4: UI Integration & Model Selection**
**Estimated Impact**: Complete AI tool UI integration  
**Scope**: Wire ModelQualityToggle into all AI tool options

#### Tasks:
1. **Model Selection UI Integration**:
   - Integrate `ModelQualityToggle.tsx` into tool options for all 15 AI tools
   - Use CSS variables from `app/globals.css` (NO hardcoded styles)
   - Follow existing UI patterns in tool options panels

2. **CSS Variable Compliance**:
   ```css
   /* MUST USE THESE - NO HARDCODED STYLES */
   --color-background, --color-foreground, --color-primary
   --color-border, --color-content-background
   --radius-sm, --radius-md, --radius-lg
   .btn, .btn-primary, .card, .input, .hover-lift
   ```

3. **Tool Options Panel Updates**:
   - Add model selection to each AI tool's options
   - Ensure proper state management
   - Maintain existing UX patterns

**Success Criteria**:
- All 15 AI tools have model selection UI
- Zero hardcoded styles (use CSS variables only)
- Consistent with existing UI patterns
- Proper model preference persistence

---

### **AGENT 5: Advanced Canvas Features**
**Estimated Impact**: Complete canvas feature parity  
**Scope**: Ensure all canvas operations work with object-based model

#### Tasks:
1. **Selection System Validation**:
   - Verify object selection works correctly
   - Test multi-object selection
   - Ensure selection events are properly emitted

2. **Transform Operations**:
   - Test all transform tools with object model
   - Verify group operations work correctly
   - Ensure undo/redo functionality

3. **Effect Groups & Smart Selection**:
   - Verify effect groups work with AI operations
   - Test smart selection (Alt+click for individual objects in groups)
   - Ensure proper group/ungroup behavior

**Success Criteria**:
- All canvas operations work with object model
- Selection system fully functional
- Transform operations maintain state correctly
- Effect groups work with AI tools

---

### **AGENT 6: Quality Assurance & Final Polish**
**Estimated Impact**: Zero remaining errors and full functionality  
**Scope**: Final validation, testing, and cleanup

#### Tasks:
1. **Comprehensive Type Checking**:
   ```bash
   bun typecheck  # Must return 0 errors
   bun lint       # Must pass with no suppressions
   ```

2. **Integration Testing**:
   - Test all AI tools end-to-end
   - Verify AI Chat functionality
   - Test canvas operations
   - Verify model selection works

3. **Code Quality Validation**:
   - No `@ts-ignore` or `eslint-disable` comments
   - No `any` types without explicit justification
   - Consistent error handling patterns
   - Proper logging and debugging

**Success Criteria**:
- `bun typecheck` returns 0 errors
- `bun lint` passes without suppressions
- All features fully functional
- Zero technical debt

---

## 🎯 SUCCESS METRICS

### Phase 1 Success (Team Alpha):
- [ ] All CanvasObject imports use correct path (~120 errors fixed)
- [ ] All layer-based references converted to object-based (~80 errors fixed)  
- [ ] All missing dependencies restored (~30 errors fixed)
- [ ] **Total: ~230 errors eliminated**

### Phase 2 Success (Team Alpha):
- [ ] All AI tools have lifecycle methods (~40 errors fixed)
- [ ] All AI events have proper payloads (~25 errors fixed)
- [ ] All adapters created and registered (~20 errors fixed)
- [ ] **Total: ~85 additional errors eliminated**

### Phase 3 Success (Team Beta):
- [ ] All AI tools have model selection UI
- [ ] All canvas features work with object model
- [ ] Zero TypeScript errors (`bun typecheck` passes)
- [ ] Zero lint errors (`bun lint` passes)
- [ ] **Total: All remaining errors eliminated**

## 🚨 CRITICAL REQUIREMENTS

### For All Agents:
1. **NO SHORTCUTS**: No `@ts-ignore`, `eslint-disable`, or `any` types without explicit approval
2. **NO HACKS**: Proper architectural solutions only
3. **SENIOR LEVEL**: Code must meet senior developer standards
4. **FOLLOW PATTERNS**: Use established patterns, don't invent new ones
5. **TEST AS YOU GO**: Run `bun typecheck` frequently to validate progress

### Communication Protocol:
1. **Clear Boundaries**: Each agent owns their specific files/areas
2. **Dependency Order**: Team Alpha Phase 1 must complete before others start
3. **Status Updates**: Regular progress reports with error count reductions
4. **Blocker Escalation**: Immediate escalation if patterns are unclear

### Definition of Done:
- [ ] `bun typecheck` returns 0 errors
- [ ] `bun lint` passes without suppressions  
- [ ] All features fully functional
- [ ] Code follows established patterns
- [ ] Zero technical debt
- [ ] Senior-level code quality

## 🏁 FINAL VALIDATION

Upon completion, the codebase must achieve:
1. **Zero TypeScript errors**
2. **Zero lint suppressions**
3. **Full AI tool functionality** (all 15 tools working)
4. **Complete UI integration** (model selection, tool options)
5. **Robust canvas operations** (object-based model fully functional)
6. **Senior-level architecture** (no hacks, proper patterns)

**Success is not just reaching zero errors - it's reaching zero errors with a fully functional, maintainable, senior-level codebase that follows established architectural patterns.** 