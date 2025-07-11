# Agent A Status - Architecture & Core Systems

## Overview
**Agent**: Agent A (Lead - Architecture & Core Systems)  
**Status**: ✅ COMPLETED - Phase 3 (AI Integration Architecture + UI Integration)  
**Current Focus**: Phase 4 - Smart Object Behaviors (NOT STARTED)

## ⚠️ HANDOFF NOTES FOR NEW CONTEXT

### Critical Information:
1. **Replicate API Key**: Already configured in `.env` (see `.env.example`)
2. **AI Tools**: Currently using MOCK implementations - need real Replicate integration
3. **WebGL Filters**: Phase 5 is UNASSIGNED and critical for filter tools to work
4. **Type Errors**: 100+ type errors exist - will be fixed by Agent B after adapter migration

### Your Immediate Tasks (Agent A):
1. Implement Phase 4: Smart Object Behaviors
2. Implement Phase 5: WebGL Filter Integration 
3. Add real Replicate integration to AI tools
4. Fix AI tool type errors (missing methods, EventBus issues)

---

## Completed Work Summary

### Phase 1: Foundation Cleanup ✅ COMPLETED
- Renamed SimpleCanvasManager to CanvasManager
- Updated CanvasState to remove layers
- Added all required object-based methods

### Phase 2: Tool System Overhaul ✅ COMPLETED
- Created ObjectTool, ObjectDrawingTool, ObjectWebGLFilterTool base classes
- Migrated all selection tools (marquee, lasso, magic wand)
- Migrated all transform tools (move, crop, rotate, resize)

### Phase 3: AI Integration + UI ✅ COMPLETED
- Created UnifiedToolAdapter base class
- Created ReplicateService (but using mock implementation)
- Created 11 AI tools (all with mock implementations)
- Redesigned tool palette with AI tools section
- Created comprehensive UI/UX documentation

---

## 🔴 REMAINING WORK - PHASE 4: Smart Object Behaviors

### 4.1 Effect Groups Implementation
Add to `CanvasManager`:
```typescript
async applyEffectWithGroup(
  targetObject: CanvasObject,
  effectType: string,
  effectData: Partial<CanvasObject>
): Promise<string> {
  // Create effect group
  const groupId = await this.addObject({
    type: 'group',
    name: `${targetObject.name} (${effectType})`,
    metadata: { 
      isEffectGroup: true,
      effectType,
      originalObjectId: targetObject.id
    }
  })
  
  // Move original to group
  await this.moveObjectToGroup(targetObject.id, groupId)
  
  // Add effect object
  const effectId = await this.addObject({
    ...effectData,
    metadata: {
      ...effectData.metadata,
      parentGroup: groupId
    }
  })
  
  await this.moveObjectToGroup(effectId, groupId)
  
  // Select the group
  this.selectObject(groupId)
  
  return groupId
}
```

### 4.2 Smart Selection Logic
Update `CanvasManager`:
```typescript
handleObjectClick(clickedId: string, event: MouseEvent): void {
  const clicked = this.getObject(clickedId)
  if (!clicked) return
  
  // Check if part of effect group
  const parentGroup = this.findParentGroup(clicked)
  if (parentGroup?.metadata?.isEffectGroup) {
    // Alt-click selects individual object
    if (event.altKey) {
      this.selectObject(clickedId)
    } else {
      // Normal click selects whole group
      this.selectObject(parentGroup.id)
    }
  } else {
    this.selectObject(clickedId)
  }
}
```

---

## 🔴 REMAINING WORK - PHASE 5: WebGL Filter Integration

### 5.1 Create ObjectFilterManager
Create `lib/editor/filters/ObjectFilterManager.ts`:
```typescript
export class ObjectFilterManager {
  private webglFilterManager: WebGLFilterManager
  
  async applyFilterToObject(
    objectId: string,
    filter: Filter,
    executionContext?: ExecutionContext
  ): Promise<void> {
    const object = this.canvas.getObject(objectId)
    if (!object) return
    
    // Determine engine type
    const engineType = this.getEngineType(filter.type)
    
    if (engineType === 'webgl') {
      await this.applyWebGLFilter(object, filter, executionContext)
    } else {
      await this.applyKonvaFilter(object, filter, executionContext)
    }
  }
  
  private getEngineType(filterType: string): 'webgl' | 'konva' {
    const webglFilters = [
      'brightness', 'contrast', 'saturation', 'hue',
      'grayscale', 'sepia', 'invert', 'sharpen',
      'vintage', 'brownie', 'kodachrome', 'technicolor',
      'polaroid', 'detectEdges', 'emboss'
    ]
    
    return webglFilters.includes(filterType) ? 'webgl' : 'konva'
  }
}
```

### 5.2 WebGL Performance Targets
- 4K image brightness adjustment: <50ms
- Real-time preview latency: <16ms
- Filter chain (3 filters): <100ms
- Memory usage: <200MB for 10 4K images

---

## 🔴 REMAINING WORK - Real Replicate Integration

### Update ReplicateService
The service exists at `lib/ai/services/replicate.ts` but needs real implementation:

```typescript
import Replicate from 'replicate'

export class ReplicateService {
  private client: Replicate
  
  constructor() {
    // Use API key from environment
    this.client = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    })
  }
  
  async generateImage(prompt: string, options: GenerateOptions): Promise<ImageData> {
    // Real SDXL implementation
    const output = await this.client.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: options.negativePrompt,
          width: options.width || 1024,
          height: options.height || 1024,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 25,
          guidance_scale: 7.5,
          seed: options.seed
        }
      }
    )
    return this.urlToImageData(output[0])
  }
  
  async removeBackground(imageData: ImageData): Promise<ImageData> {
    // Real rembg implementation
    const dataUrl = this.imageDataToDataURL(imageData)
    const output = await this.client.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      {
        input: {
          image: dataUrl
        }
      }
    )
    return this.urlToImageData(output)
  }
  
  // Add other real implementations...
}
```

### Update AI Tools
Each AI tool needs:
1. Remove mock implementations
2. Add real Replicate calls
3. Fix missing methods:
   - Add `id` property
   - Implement `setupTool()` and `cleanupTool()`
   - Fix EventBus type issues (use proper event types)

Example fix for ImageGenerationTool:
```typescript
export class ImageGenerationTool extends ObjectTool {
  id = 'ai-image-generation'
  name = 'AI Image Generation'
  icon = ImageGenerationIcon
  
  setupTool(canvas: CanvasManager): void {
    // Initialize if needed
  }
  
  cleanupTool(): void {
    // Cleanup if needed
  }
  
  private async generateImage(prompt: string, options: GenerateOptions): Promise<void> {
    // Use real ReplicateService
    const service = new ReplicateService()
    const imageData = await service.generateImage(prompt, options)
    
    // Create object with generated image
    await this.createNewObject('image', {
      data: imageData,
      name: `AI Generated: ${prompt.slice(0, 30)}...`
    })
  }
}
```

---

## Known Type Errors to Fix

All AI tools have these errors:
1. Missing `id` property (add it as shown above)
2. Missing `setupTool` and `cleanupTool` methods
3. Icon type mismatch (already fixed with icon components)
4. EventBus emit type issues - need proper event types:
   ```typescript
   // Instead of:
   this.eventBus.emit('tool.message', {...})
   
   // Use proper events or remove EventBus usage
   ```

---

## Division of Work

### Agent A (You) will handle:
- Phase 4: Smart Object Behaviors
- Phase 5: WebGL Filter Integration (CRITICAL - currently unassigned)
- Real Replicate integration for all AI tools
- Fix AI tool type errors

### Agent B is handling:
- Migrating all adapters to UnifiedToolAdapter
- Event system for AI operations
- Fixing remaining type errors after adapter migration
- Integration testing

---

## Success Metrics
1. Effect groups work properly with AI operations
2. WebGL filters render at 60fps
3. All AI tools use real Replicate API
4. No type errors in AI tools
5. Smart selection works for effect groups 