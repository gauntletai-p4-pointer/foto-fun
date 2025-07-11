# Epic: Complete Migration to Object-Based Canvas Architecture

## 🎯 MISSION CRITICAL: Zero Technical Debt, Full Functionality

**Current State**: 389 TypeScript errors (down from 434)  
**Target State**: 0 errors, fully functional, senior-level codebase  
**Success Criteria**: Complete functionality with zero hacks, suppressions, or quick fixes

## 📊 CRITICAL INSIGHT: Error Distribution Analysis

Based on comprehensive analysis and agent reports, the 389 errors break down as:

1. **CanvasObject Import Errors** (~120 files): Wrong import paths from old location
2. **Layer-Based References** (~80 files): Old `canvas.state.layers` patterns that need object-based equivalents
3. **AI Tool Lifecycle Methods** (~40 files): Missing setupTool/cleanupTool causing inheritance errors
4. **AI Event Payload Mismatches** (~25 files): Missing toolId in AI events
5. **Adapter Registry Type Issues** (~30 files): UnifiedToolAdapter lacks metadata, causing registry failures
6. **Schema Type Mismatches** (~25 files): Zod schema input/output type incompatibilities
7. **Canvas Manager Method Missing** (~15 files): getSelectedObjects() method not implemented
8. **Missing Dependencies** (~10 files): Deleted files still referenced

## 🚨 CRITICAL REQUIREMENTS FOR ALL AGENTS

### **NO ARTIFICIAL LIMITS**
- **NO 3-TRY LIMIT**: Keep working until the task is 100% complete
- **NO SHORTCUTS**: Fix the hard things comprehensively, don't skip them
- **NO MOVING ON**: Don't move to next task until current one is FULLY complete
- **COMPREHENSIVE**: Fix ALL instances, not just examples

### **FILE OWNERSHIP RULES**
- Each agent owns specific directories/files - **NO OVERLAP**
- If you encounter a file outside your scope, **STOP and escalate**
- Update only files explicitly assigned to you
- Document any cross-dependencies for other agents

---

## 📋 TEAM ALPHA: FOUNDATION INFRASTRUCTURE (Must Complete First)

### **ALPHA AGENT 1: Import Path Unification**
**CRITICAL BLOCKER**: Must complete before any other agent can proceed  
**Estimated Impact**: Fixes ~120 type errors  
**File Ownership**: ALL files with CanvasObject imports

#### **EXCLUSIVE FILE SCOPE**:
```bash
# YOU OWN THESE DIRECTORIES COMPLETELY:
components/editor/Panels/CharacterPanel/
components/editor/Panels/GlyphsPanel/  
components/editor/Panels/ParagraphPanel/
components/editor/Panels/TextEffectsPanel/
lib/ai/adapters/base.ts
lib/ai/adapters/tools/ (ALL FILES)
types/index.ts

# SEARCH AND FIX IN ENTIRE CODEBASE:
# Any file importing CanvasObject from wrong location
```

#### **TASKS - COMPLETE ALL, NO EXCEPTIONS**:

1. **Global Import Path Fix** (PRIORITY 1):
   ```bash
   # Find ALL files with wrong imports:
   grep -r "from '@/lib/editor/canvas/types'" --include="*.ts" --include="*.tsx" .
   
   # Replace EVERY SINGLE ONE:
   # FROM: import { CanvasObject } from '@/lib/editor/canvas/types'
   # TO:   import { CanvasObject } from '@/lib/editor/objects/types'
   ```

2. **Verify Single Source of Truth**:
   - Ensure `lib/editor/objects/types.ts` is the ONLY CanvasObject definition
   - Remove any duplicate definitions in `lib/editor/canvas/types.ts`
   - Update re-exports in `types/index.ts`

3. **Cross-Reference Validation**:
   - Run `bun typecheck` after EVERY batch of 10 fixes
   - Document exact error count reduction
   - Don't stop until ALL import errors are gone

**SUCCESS CRITERIA**:
- ZERO files importing CanvasObject from `@/lib/editor/canvas/types`
- ALL imports use `@/lib/editor/objects/types`
- TypeScript errors reduced by exactly ~120
- `grep -r "from '@/lib/editor/canvas/types'" . --include="*.ts" --include="*.tsx"` returns ZERO results

---

### **ALPHA AGENT 2: Layer-to-Object Migration**
**Estimated Impact**: Fixes ~80 type errors  
**File Ownership**: ALL files with layer-based canvas operations

#### **EXCLUSIVE FILE SCOPE**:
```bash
# YOU OWN THESE FILES COMPLETELY:
lib/editor/commands/text/EditTextCommand.ts
lib/editor/commands/base/TransactionalCommand.ts
lib/editor/canvas/services/LayerManager.ts
lib/editor/canvas/services/RenderPipeline.ts
lib/editor/tools/base/DrawingTool.ts
lib/editor/tools/base/BaseTextTool.ts
lib/editor/tools/base/EnhancedDrawingTool.ts
lib/editor/tools/base/BasePixelTool.ts
lib/editor/tools/base/WebGLFilterTool.ts
lib/editor/tools/text/VerticalTypeTool.ts
lib/editor/tools/text/HorizontalTypeTool.ts
lib/editor/tools/transform/flipTool.ts
lib/editor/tools/ai-native/imageGenerationCanvasTool.ts
lib/events/execution/EventBasedToolChain.ts
lib/ai/canvas/EnhancedCanvasContext.ts
lib/ai/execution/SelectionSnapshot.ts
lib/ai/adapters/base.ts (lines 368, 514, 580 - layer references only)
lib/ai/agents/WorkflowMemory.ts
lib/ai/tools/canvas-bridge.ts
lib/store/canvas/CanvasStore.ts (getActiveLayer method)
lib/store/canvas/TypedCanvasStore.ts (getActiveLayer method)
```

#### **TASKS - COMPLETE ALL, NO EXCEPTIONS**:

1. **Canvas State Reference Migration** (PRIORITY 1):
   ```typescript
   // FIND AND REPLACE EVERY SINGLE INSTANCE:
   
   // Pattern 1: Layer access
   canvas.state.layers → canvas.getAllObjects()
   
   // Pattern 2: Active layer
   canvas.getActiveLayer() → canvas.getSelectedObjects()[0] || null
   
   // Pattern 3: Active layer ID
   canvas.state.activeLayerId → Array.from(canvas.state.selectedObjectIds)[0] || null
   
   // Pattern 4: Document bounds
   canvas.state.documentBounds → { width: canvas.state.canvasWidth, height: canvas.state.canvasHeight }
   
   // Pattern 5: Layer iteration
   for (const layer of canvas.state.layers) → for (const object of canvas.getAllObjects())
   
   // Pattern 6: Layer finding
   canvas.state.layers.find(...) → canvas.getAllObjects().find(...)
   ```

2. **Method Signature Updates**:
   - Update ALL method calls to use object-based APIs
   - Ensure proper error handling for missing objects
   - Maintain existing functionality with new patterns
   - Update return types from Layer to CanvasObject

3. **State Management Updates**:
   - Replace layer-based state with object-based state
   - Update event emissions to use object IDs instead of layer IDs
   - Fix selection management to work with objects

**SUCCESS CRITERIA**:
- ZERO references to `canvas.state.layers` in your files
- ZERO calls to `getActiveLayer()` in your files  
- ALL canvas operations use object-based model
- ALL files compile without layer-related errors
- `grep -r "canvas\.state\.layers\|getActiveLayer" your_files` returns ZERO results

---

### **ALPHA AGENT 3: Missing Dependencies & Core Fixes**
**Estimated Impact**: Fixes ~45 type errors  
**File Ownership**: Core infrastructure and missing dependencies

#### **EXCLUSIVE FILE SCOPE**:
```bash
# YOU OWN THESE FILES COMPLETELY:
lib/ai/adapters/registry.ts
lib/ai/adapters/tools/imageGeneration.ts (restore if missing)
lib/ai/adapters/tools/canvasSelectionManager.ts
lib/core/ServiceContainer.ts
lib/core/AppInitializer.ts
lib/editor/canvas/CanvasManager.ts (add missing methods only)
components/editor/dialogs/ImageGenerationDialog.tsx
components/editor/Panels/TextEffectsPanel/TextPresetsSection.tsx
components/editor/Panels/TextEffectsPanel/TextWarpSection.tsx
```

#### **TASKS - COMPLETE ALL, NO EXCEPTIONS**:

1. **Missing Dependencies** (PRIORITY 1):
   ```bash
   # Check if imageGeneration adapter exists:
   ls -la lib/ai/adapters/tools/imageGeneration.ts
   
   # If missing, either:
   # A) Rename ImageGenerationAdapter.ts to imageGeneration.ts
   # B) Update registry import to use ImageGenerationAdapter.ts
   # C) Create proper imageGeneration.ts that exports ImageGenerationAdapter
   ```

2. **Canvas Manager Method Implementation**:
   ```typescript
   // ADD THIS METHOD to CanvasManager if missing:
   getSelectedObjects(): CanvasObject[] {
     const selectedIds = Array.from(this.state.selectedObjectIds)
     return selectedIds
       .map(id => this.getObject(id))
       .filter((obj): obj is CanvasObject => obj !== null)
   }
   ```

3. **Adapter Registry Type Fixes**:
   ```typescript
   // Fix UnifiedToolAdapter metadata issue:
   // Either add metadata property to UnifiedToolAdapter
   // OR update getByCategory logic to handle missing metadata
   ```

4. **Service Container Validation**:
   - Verify all service registrations are correct
   - Fix any missing service dependencies
   - Ensure proper initialization order

**SUCCESS CRITERIA**:
- NO missing file references
- Registry compiles without type errors
- All services properly registered and accessible
- CanvasManager has getSelectedObjects() method
- All import errors resolved

---

## 📋 TEAM BETA: AI INFRASTRUCTURE & ADVANCED FEATURES

### **BETA AGENT 1: AI Tool Lifecycle Methods**
**Estimated Impact**: Fixes ~40 type errors  
**File Ownership**: ALL AI tool lifecycle implementations

#### **EXCLUSIVE FILE SCOPE**:
```bash
# YOU OWN THESE FILES COMPLETELY - ADD LIFECYCLE METHODS:
lib/ai/tools/ObjectRemovalTool.ts
lib/ai/tools/StyleTransferTool.ts  
lib/ai/tools/VariationTool.ts
lib/ai/tools/RelightingTool.ts
lib/ai/tools/UpscalingTool.ts
lib/ai/tools/DepthEstimationTool.ts
lib/ai/tools/InstructionEditingTool.ts
lib/ai/tools/PromptEnhancementTool.ts

# THESE ALREADY HAVE METHODS - VERIFY ONLY:
lib/ai/tools/ImageGenerationTool.ts ✅
lib/ai/tools/BackgroundRemovalTool.ts ✅  
lib/ai/tools/FaceEnhancementTool.ts ✅
lib/ai/tools/InpaintingTool.ts ✅
lib/ai/tools/SemanticSelectionTool.ts ✅
lib/ai/tools/OutpaintingTool.ts ✅
```

#### **TASKS - COMPLETE ALL, NO EXCEPTIONS**:

1. **Add Missing Lifecycle Methods** (PRIORITY 1):
   ```typescript
   // ADD THESE EXACT METHODS to each tool class:
   
   protected setupTool(): void {
     // Initialize tool-specific resources
     // Set default options using this.setOption()
     // Validate API keys/services if needed
     // Initialize any private services
   }
   
   protected cleanupTool(): void {
     // Clean up resources
     // Reset state variables
     // Clear temporary data
     // Null out service references
   }
   ```

2. **Consistent Implementation Patterns**:
   - Follow EXACT patterns from `BackgroundRemovalTool.ts` and `ImageGenerationTool.ts`
   - Ensure proper error handling in setupTool
   - Add appropriate logging for debugging
   - Set reasonable default options

3. **Service Integration**:
   - Initialize ReplicateService in setupTool where needed
   - Handle API key validation gracefully
   - Set up model preferences integration

**SUCCESS CRITERIA**:
- ALL AI tools have setupTool() and cleanupTool() methods
- NO inheritance-related type errors
- ALL tools follow consistent patterns
- ALL tools can be instantiated without errors

---

### **BETA AGENT 2: AI Event System Integration**
**Estimated Impact**: Fixes ~25 type errors  
**File Ownership**: ALL AI event-related files

#### **EXCLUSIVE FILE SCOPE**:
```bash
# YOU OWN THESE FILES COMPLETELY:
lib/events/core/TypedEventBus.ts (event definitions)
lib/ai/tools/ (ALL files - event emission fixes only)
lib/ai/adapters/tools/ (ALL files - event payload fixes only)
lib/editor/tools/ai-native/ (ALL files - event fixes only)
```

#### **TASKS - COMPLETE ALL, NO EXCEPTIONS**:

1. **AI Event Payload Fixes** (PRIORITY 1):
   ```typescript
   // FIND AND FIX ALL AI event emissions to include toolId:
   
   // WRONG:
   this.eventBus.emit('ai.processing.started', {
     taskId: 'task-123',
     description: 'Processing...',
     targetObjectIds: ['obj1', 'obj2']
   })
   
   // CORRECT:
   this.eventBus.emit('ai.processing.started', {
     taskId: 'task-123',
     toolId: this.toolId, // ← ADD THIS
     description: 'Processing...',
     targetObjectIds: ['obj1', 'obj2']
   })
   ```

2. **Event Registry Validation**:
   - Verify ALL AI events are properly defined in `TypedEventBus.ts`
   - Ensure event payload types match actual usage
   - Add any missing event definitions

3. **Tool Event Integration**:
   - Update ALL AI tools to emit proper events
   - Ensure consistent event naming patterns
   - Add proper error event handling

**SUCCESS CRITERIA**:
- ALL AI events have proper toolId in payload
- Event types match actual usage exactly
- NO event-related type errors
- ALL AI tools emit events consistently

---

### **BETA AGENT 3: Schema & Adapter Completion**
**Estimated Impact**: Fixes ~35 type errors  
**File Ownership**: Schema fixes and adapter completion

#### **EXCLUSIVE FILE SCOPE**:
```bash
# YOU OWN THESE FILES COMPLETELY:
lib/ai/adapters/tools/FaceEnhancementAdapter.ts
lib/ai/adapters/tools/ImageGenerationAdapter.ts
components/editor/dialogs/ImageGenerationDialog.tsx
lib/ai/adapters/base/UnifiedToolAdapter.ts (metadata property)

# CREATE THESE NEW ADAPTERS:
lib/ai/adapters/tools/ObjectRemovalAdapter.ts
lib/ai/adapters/tools/StyleTransferAdapter.ts
lib/ai/adapters/tools/VariationAdapter.ts
lib/ai/adapters/tools/RelightingAdapter.ts
lib/ai/adapters/tools/UpscalingAdapter.ts
lib/ai/adapters/tools/DepthEstimationAdapter.ts
lib/ai/adapters/tools/InstructionEditingAdapter.ts
lib/ai/adapters/tools/PromptEnhancementAdapter.ts
```

#### **TASKS - COMPLETE ALL, NO EXCEPTIONS**:

1. **Fix Schema Type Mismatches** (PRIORITY 1):
   ```typescript
   // Fix ImageGenerationAdapter schema issue:
   // Problem: width/height are optional in schema but required in type
   // Solution: Make them required in schema OR optional in type
   
   // Fix FaceEnhancementAdapter schema issue:
   // Problem: modelTier type mismatch between schema and interface
   // Solution: Align the types exactly
   ```

2. **Add Missing Metadata Property**:
   ```typescript
   // Add to UnifiedToolAdapter:
   abstract metadata?: {
     category: 'canvas-editing' | 'ai-native'
     executionType: 'fast' | 'slow' | 'expensive'
     worksOn: 'existing-image' | 'new-image' | 'both'
   }
   ```

3. **Create Missing Adapters**:
   ```typescript
   // Follow EXACT pattern from existing adapters:
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

**SUCCESS CRITERIA**:
- ALL schema type mismatches resolved
- ALL AI tools have working adapters
- Registry compiles without errors
- NO Zod schema type errors

---

## 🎯 EXECUTION PROTOCOL

### **PHASE DEPENDENCIES**:
1. **ALPHA AGENT 1 MUST COMPLETE FIRST** - All other agents blocked until import fixes done
2. **ALPHA AGENTS 2 & 3** can work in parallel after Agent 1 completes
3. **BETA AGENTS** can start after ALPHA AGENT 1 completes

### **PROGRESS REPORTING**:
Each agent must report:
- Exact error count before starting
- Error count after each major fix
- Final error count when complete
- List of all files modified

### **ESCALATION RULES**:
- If you encounter a file outside your scope: **STOP and escalate**
- If you need a method/property from another agent's file: **STOP and escalate**
- If task seems impossible: **STOP and escalate** (don't skip)

### **COMPLETION CRITERIA**:
- **ALPHA TEAM**: ~245 errors eliminated (120+80+45)
- **BETA TEAM**: ~100 errors eliminated (40+25+35)
- **FINAL TARGET**: 0 TypeScript errors, full functionality

## 🚨 CRITICAL SUCCESS FACTORS

1. **NO SHORTCUTS**: Fix the hard things comprehensively
2. **NO ARTIFICIAL LIMITS**: Keep working until 100% complete
3. **RESPECT FILE BOUNDARIES**: Only touch files in your scope
4. **COMPREHENSIVE FIXES**: Fix ALL instances, not just examples
5. **VALIDATE PROGRESS**: Run typecheck frequently and report exact numbers

**Success is not just reaching zero errors - it's reaching zero errors with a fully functional, maintainable, senior-level codebase that follows established architectural patterns.** 