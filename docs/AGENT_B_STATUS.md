# Agent B Status - UI Components & Tool Integration

## Overview
**Agent**: Agent B (UI Components & Tool Integration)  
**Status**: 🟡 IN PROGRESS - Phase 6 (Technical Debt & Cleanup)  
**Current Focus**: Migrating AI adapters to UnifiedToolAdapter (18 remaining)

## ⚠️ HANDOFF NOTES FOR NEW CONTEXT

### Critical Information:
1. **Adapter Migration**: 18 adapters need migration from old base classes to UnifiedToolAdapter
2. **Type Errors**: 100+ type errors exist - fix AFTER adapter migration complete
3. **Event System**: AI events not implemented yet
4. **AI SDK v5**: We're using AI SDK v5 - use `inputSchema` not `parameters`, `input` not `args`

### Your Immediate Tasks (Agent B):
1. Complete migration of 18 remaining adapters to UnifiedToolAdapter
2. Delete old adapter base classes (BaseToolAdapter, CanvasToolAdapter, FilterToolAdapter)
3. Update adapter registry to remove old base class imports
4. Implement AI event system
5. Fix all type errors (~100+)
6. Integration testing

---

## ESTABLISHED MIGRATION PATTERNS

### 1. AI SDK v5 Compliance
```typescript
// UnifiedToolAdapter now has toAITool() method that returns proper AI SDK v5 tool:
toAITool(): unknown {
  return tool({
    description: this.description,
    inputSchema: this.inputSchema as z.ZodSchema,  // NOT parameters
    execute: async (input: unknown) => {           // NOT args
      // Server-side placeholder
      return {
        success: true,
        message: `Tool ${this.aiName} will be executed on the client`,
        clientExecutionRequired: true,
        input  // NOT params
      }
    }
  })
}
```

### 2. Filter/Adjustment Adapter Pattern
For adapters that apply adjustments (brightness, contrast, saturation, etc.):

```typescript
export class SomeAdjustmentAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'adjustment-name'
  aiName = 'adjust_something'
  description = '...'
  inputSchema = z.object({
    adjustment: z.number().min(-100).max(100).describe('...')
  })
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    const targets = this.getTargets(context)
    const imageObjects = targets.filter(obj => obj.type === 'image')
    
    if (imageObjects.length === 0) {
      return {
        success: false,
        adjustment: params.adjustment,
        message: 'No image objects found to adjust',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of imageObjects) {
      const adjustments = obj.adjustments || []
      
      // Remove existing adjustments of same type
      const filteredAdjustments = adjustments.filter(adj => adj.type !== 'adjustment-type')
      
      // Add new adjustment if not zero
      if (params.adjustment !== 0) {
        filteredAdjustments.push({
          id: `adjustment-type-${Date.now()}`,
          type: 'adjustment-type',
          params: { value: params.adjustment },
          enabled: true
        })
      }
      
      await context.canvas.updateObject(obj.id, {
        adjustments: filteredAdjustments
      })
      
      affectedObjects.push(obj.id)
    }
    
    return {
      success: true,
      adjustment: params.adjustment,
      message: `Adjusted by ${params.adjustment}% on ${affectedObjects.length} object(s)`,
      affectedObjects
    }
  }
}
```

### 3. Canvas Operation Adapter Pattern
For adapters that transform objects (move, rotate, resize, etc.):

```typescript
export class SomeTransformAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'transform-name'
  aiName = 'transform_something'
  description = '...'
  inputSchema = z.object({
    // transform parameters
  })
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    const targets = this.getTargets(context)
    
    if (targets.length === 0) {
      return {
        success: false,
        message: 'No objects selected',
        affectedObjects: []
      }
    }
    
    const affectedObjects: string[] = []
    
    for (const obj of targets) {
      // Apply transformation
      await context.canvas.updateObject(obj.id, {
        x: obj.x + params.deltaX,
        y: obj.y + params.deltaY,
        // other transform properties
      })
      
      affectedObjects.push(obj.id)
    }
    
    return {
      success: true,
      message: `Transformed ${affectedObjects.length} object(s)`,
      affectedObjects
    }
  }
}
```

### 4. Important Notes
- Use `context.canvas.getAllObjects()` not `canvas.state.layers`
- Use `context.canvas.getSelectedObjects()` not `canvas.state.selection`
- Canvas dimensions are `state.canvasWidth` and `state.canvasHeight`, NOT `documentBounds`
- Import CanvasObject from `@/lib/editor/objects/types` NOT `@/lib/editor/canvas/types`
- Adjustment type uses `params: Record<string, any>` not direct properties

---

## Completed Work Summary

### Phase 1-3: ✅ ALL COMPLETED
- Migrated all UI components to object-based model
- Deleted layer-related components and files
- Updated export system for objects
- Created object-based commands

### Phase 6.4: AI Adapter Migration 🟡 IN PROGRESS

**Completed Migrations (3/21):**
- ✅ BrightnessToolAdapter - Migrated to UnifiedToolAdapter
- ✅ ContrastToolAdapter - Migrated to UnifiedToolAdapter
- ✅ SaturationToolAdapter - Migrated to UnifiedToolAdapter

**🔴 Remaining Adapters to Migrate (18):**

### Filter/Adjustment Adapters (6):
1. **ExposureToolAdapter** - `lib/ai/adapters/tools/exposure.ts`
   - Current: extends BaseToolAdapter
   - Pattern: Use adjustment pattern above
   
2. **HueToolAdapter** - `lib/ai/adapters/tools/hue.ts`
   - Current: extends BaseToolAdapter
   - Pattern: Use adjustment pattern above
   
3. **BlurToolAdapter** - `lib/ai/adapters/tools/blur.ts`
   - Current: extends FilterToolAdapter
   - Pattern: Use filter pattern (add to filters array instead of adjustments)
   
4. **SharpenAdapter** - `lib/ai/adapters/tools/sharpen.ts`
   - Current: extends BaseToolAdapter
   - Pattern: Use filter pattern
   
5. **GrayscaleToolAdapter** - `lib/ai/adapters/tools/grayscale.ts`
   - Current: extends FilterToolAdapter
   - Pattern: Use filter pattern
   
6. **InvertToolAdapter** - `lib/ai/adapters/tools/invert.ts`
   - Current: extends FilterToolAdapter
   - Pattern: Use filter pattern
   
7. **VintageEffectsToolAdapter** - `lib/ai/adapters/tools/vintageEffects.ts`
   - Current: extends BaseToolAdapter
   - Pattern: Use filter pattern

### Canvas Operation Adapters (7):
8. **CropToolAdapter** - `lib/ai/adapters/tools/crop.ts`
   - Current: extends CanvasToolAdapter
   - Note: Complex - needs to crop object bounds, not canvas
   
9. **MoveToolAdapter** - `lib/ai/adapters/tools/move.ts`
   - Current: extends CanvasToolAdapter
   - Pattern: Update x,y coordinates
   
10. **ResizeToolAdapter** - `lib/ai/adapters/tools/resize.ts`
    - Current: extends BaseToolAdapter
    - Pattern: Update width, height, scaleX, scaleY
    
11. **FlipToolAdapter** - `lib/ai/adapters/tools/flip.ts`
    - Current: extends CanvasToolAdapter
    - Pattern: Update scaleX or scaleY to negative
    
12. **RotateToolAdapter** - `lib/ai/adapters/tools/rotate.ts`
    - Current: extends CanvasToolAdapter
    - Pattern: Update rotation property

### Drawing Tool Adapters (3):
13. **BrushToolAdapter** - `lib/ai/adapters/tools/brush.ts`
    - Current: extends CanvasToolAdapter
    - Note: Complex - needs to create new image object or paint on existing
    
14. **EraserToolAdapter** - `lib/ai/adapters/tools/eraser.ts`
    - Current: extends CanvasToolAdapter
    - Note: Complex - needs to erase from image data
    
15. **GradientToolAdapter** - `lib/ai/adapters/tools/gradient.ts`
    - Current: extends CanvasToolAdapter
    - Note: Apply gradient as new object or style

### Text/Analysis Adapters (2):
16. **AddTextToolAdapter** - `lib/ai/adapters/tools/addText.ts`
    - Current: extends CanvasToolAdapter
    - Pattern: Create new text object with proper data
    
17. **AnalyzeCanvasAdapter** - `lib/ai/adapters/tools/analyzeCanvas.ts`
    - Current: extends BaseToolAdapter
    - Pattern: Analyze objects, not layers

### Special Cases (2):
18. **CanvasSelectionManagerAdapter** - `lib/ai/adapters/tools/canvasSelectionManager.ts`
    - Current: extends BaseToolAdapter
    - Note: Update to use selectedObjectIds
    
19. **ImageGenerationAdapter** - `lib/ai/adapters/tools/imageGeneration.ts`
    - Current: extends CanvasToolAdapter
    - Note: Check if duplicate with ImageGenerationAdapter.ts (capital I)

### DELETED Tools (Not in list):
- ❌ CloneStampTool - Deleted (replaced by AI inpainting)
- ❌ HealingBrushTool - Deleted (replaced by AI inpainting)

---

## 🔴 REMAINING WORK - After Adapter Migration

### 1. Delete Old Base Classes
After all adapters are migrated, delete these files:
```bash
rm lib/ai/adapters/base.ts  # Contains BaseToolAdapter, CanvasToolAdapter, FilterToolAdapter
```

### 2. Update Adapter Registry
Update `lib/ai/adapters/registry.ts`:
```typescript
// Remove these imports:
import type { ToolAdapter } from './base'

// Change to:
import type { UnifiedToolAdapter } from './base/UnifiedToolAdapter'

// Update registry to use UnifiedToolAdapter type
```

### 3. Implement AI Event System
Create in `lib/events/ai/`:
```typescript
// AIEvents.ts
import { Event } from '../core/Event'

export class AIGenerationStartedEvent extends Event {
  constructor(
    public toolId: string,
    public prompt: string,
    public metadata: Record<string, unknown>
  ) {
    super('ai.generation.started', metadata)
  }
}

export class AIGenerationCompletedEvent extends Event {
  constructor(
    public toolId: string,
    public objectId: string,
    public metadata: Record<string, unknown>
  ) {
    super('ai.generation.completed', metadata)
  }
}

export class AIGenerationFailedEvent extends Event {
  constructor(
    public toolId: string,
    public error: string,
    public metadata: Record<string, unknown>
  ) {
    super('ai.generation.failed', metadata)
  }
}

// Similar for enhancement and selection events
```

### 4. Fix Type Errors
Run `bun typecheck` after migration. Common fixes:
- Import paths for CanvasObject
- Remove `layers` references
- Update `selection` to `selectedObjectIds`
- Fix EventBus emit calls to use proper event instances

### 5. Integration Testing Checklist
For each migrated adapter:
- [ ] Can be called from AI chat
- [ ] Executes without errors
- [ ] Properly targets objects (not layers)
- [ ] Returns correct output format
- [ ] Updates canvas state correctly

---

## Key Architecture Reminders

1. **No Layers**: Everything is a flat object model
2. **Object Types**: 'image' | 'text' | 'shape' | 'group'
3. **Adjustments vs Filters**: 
   - Adjustments: brightness, contrast, saturation, hue, exposure (value-based)
   - Filters: blur, sharpen, grayscale, invert, vintage effects (effect-based)
4. **Groups**: Objects with type='group' and children array
5. **Selection**: Use selectedObjectIds Set, not selection object

---

## Success Metrics
1. All 18 remaining adapters migrated to UnifiedToolAdapter
2. Old base classes deleted
3. Zero type errors in adapter files
4. AI events properly integrated
5. All adapters callable from AI chat
6. Integration tests pass 