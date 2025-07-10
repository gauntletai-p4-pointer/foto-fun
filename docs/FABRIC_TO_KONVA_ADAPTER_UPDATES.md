# Fabric to Konva Migration - AI Adapter Updates

This document summarizes the updates made to AI adapter files to migrate from Fabric.js to Konva.

## Files Updated

### 1. `/lib/ai/execution/SelectionSnapshot.ts`
- **Changes:**
  - Replaced `FabricObject` imports with `CanvasObject` from `@/lib/editor/canvas/types`
  - Replaced `Canvas` imports with `CanvasManager` from `@/lib/editor/canvas/CanvasManager`
  - Updated all method signatures to use new types
  - Updated `verifyIntegrity` and `getValidObjects` to use `CanvasManager.findObject()` instead of direct object references
  - Updated `fromCanvas` to use the new selection system (`canvas.state.selection`)
  - Updated `fromCanvasWithFallback` to iterate through layers for objects
  - Simplified object ID access (no type assertions needed as `CanvasObject` has `id` property)
  - Updated text object type checks to include `'verticalText'`

### 2. `/lib/ai/adapters/tools/canvasSelectionManager.ts`
- **Changes:**
  - Replaced `FabricObject` import with `CanvasObject`
  - Updated selection counting to use `canvas.state.selection` instead of `canvas.getActiveObjects()`
  - Updated object retrieval to use `canvas.findObject()` instead of filtering arrays
  - Made all context manager operations async (prepareForOperation, selectObjects, clearSelection)
  - Updated get-info to iterate through layers and use the new selection system

### 3. `/lib/ai/adapters/tools/hue.ts`
- **Changes:**
  - Replaced `Canvas` import with `CanvasManager`
  - Updated `canExecute` method to check for images by iterating through layers

### 4. `/lib/ai/adapters/tools/analyzeCanvas.ts`
- **Changes:**
  - Replaced `Canvas` import with `CanvasManager`
  - Updated object collection to iterate through layers
  - Updated canvas dimensions access to use `canvas.state.width/height`
  - Disabled thumbnail generation (requires Konva stage access - needs client-side implementation)
  - Updated object position/size access to use transform properties

### 5. `/lib/ai/adapters/tools/exposure.ts`
- **Changes:**
  - Replaced `Canvas` import with `CanvasManager`
  - Updated `canExecute` method to check for images by iterating through layers

### 6. `/lib/ai/adapters/tools/contrast.ts`
- **Status:** Already updated with correct imports
  - Uses `Filter` type from `@/lib/editor/canvas/types`
  - `createFilter` returns proper Filter object with `type` and `params`

## Key Migration Patterns

1. **Type Imports:**
   ```typescript
   // Old
   import type { FabricObject } from 'fabric'
   import type { Canvas } from 'fabric'
   
   // New
   import type { CanvasObject } from '@/lib/editor/canvas/types'
   import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
   ```

2. **Object Access:**
   ```typescript
   // Old
   canvas.getObjects()
   
   // New
   const objects: CanvasObject[] = []
   canvas.state.layers.forEach(layer => {
     objects.push(...layer.objects)
   })
   ```

3. **Selection Access:**
   ```typescript
   // Old
   canvas.getActiveObjects()
   
   // New
   const selection = canvas.state.selection
   const selectedObjects: CanvasObject[] = []
   if (selection?.type === 'objects') {
     selection.objectIds.forEach(id => {
       const obj = canvas.findObject(id)
       if (obj) selectedObjects.push(obj)
     })
   }
   ```

4. **Finding Objects:**
   ```typescript
   // Old
   const obj = allObjects.find(o => o.id === targetId)
   
   // New
   const obj = canvas.findObject(targetId)
   ```

5. **Canvas Properties:**
   ```typescript
   // Old
   canvas.getWidth()
   canvas.getHeight()
   
   // New
   canvas.state.width
   canvas.state.height
   ```

6. **Filter Creation:**
   ```typescript
   // Old
   return { type: 'contrast', contrast: value }
   
   // New
   return { 
     type: 'contrast',
     params: { value: adjustment }
   }
   ```

## Notes

- All async operations (selection changes, object updates) now properly await their completion
- The new architecture separates state management from the rendering layer
- Object IDs are now guaranteed on the `CanvasObject` type, eliminating need for type assertions
- Text object types now include `'verticalText'` in addition to `'text'`