# Epic 5.33: Replicate API Integration for AI Features

## Overview

This epic replaces the self-hosted AI service architecture (Epics 5.5 & 5.75) with a Replicate API integration. This approach dramatically simplifies our infrastructure while providing access to thousands of cutting-edge AI models. Cloud users get $2/month in credits with a 20% markup on additional usage, while self-hosted users bring their own Replicate API key.

## Goals

1. **Replicate Integration** - Clean API client with proper error handling
2. **Core AI Features** - 5 essential AI-Native Tools using best-in-class models
3. **Credit System** - Usage tracking and billing for cloud users
4. **Consistent UX** - Seamless integration with existing AI chat
5. **Extensible Foundation** - Easy to add new models later

## Current State Analysis

### What We Have
- **Tool System** (`lib/editor/tools/`) - Canvas Tools that manipulate Fabric.js
- **Tool Adapters** (`lib/ai/adapters/tools/`) - Make any tool AI-compatible
- **Adapter Registry** - Single registry for all tool adapters
- **AI Chat** - Existing chat interface that invokes tools

### What We Need
- AI-Native Tools (`lib/ai/tools/`) for Replicate models
- Tool Adapters for the new AI-Native Tools
- Replicate API client
- Credit tracking system

## Architecture Design

### Terminology Alignment (Per Epic 5.25)

1. **Canvas Tools** (`lib/editor/tools/`) - Tools that directly manipulate Fabric.js
   - Examples: `cropTool`, `brightnessTool` (camelCase singletons)
   
2. **AI-Native Tools** (`lib/ai/tools/`) - Tools that call external AI services
   - Examples: `BackgroundRemovalTool`, `UpscaleTool` (PascalCase classes)
   - These are what we're creating in this epic
   
3. **Tool Adapters** (`lib/ai/adapters/tools/`) - Make ANY tool AI-compatible
   - Works for both Canvas Tools and AI-Native Tools
   - Examples: `BackgroundRemovalAdapter`, `UpscaleAdapter`
   - All register in the same `adapterRegistry`

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FotoFun Application                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌──────────────────┐                   │
│  │  Canvas Tools   │    │ AI-Native Tools  │                   │
│  │ (lib/editor/)   │    │   (lib/ai/)      │                   │
│  └─────────────────┘    └────────┬─────────┘                   │
│                                   │                              │
│  ┌─────────────────────────────────▼─────────────────────────┐  │
│  │              Tool Adapters (lib/ai/adapters/)             │  │
│  │  - CropToolAdapter (wraps Canvas Tool)                    │  │
│  │  - BackgroundRemovalAdapter (wraps AI-Native Tool)        │  │
│  └─────────────────────────────────┬─────────────────────────┘  │
│                                     │                             │
│                          ┌──────────▼──────────┐                 │
│                          │  Adapter Registry   │                 │
│                          │ (Single registry)   │                 │
│                          └──────────┬──────────┘                 │
└─────────────────────────────────────┼─────────────────────────────┘
                                      │ 
                          ┌───────────▼────────────┐
                          │   Replicate API       │
                          └────────────────────────┘
```

## Implementation Plan

### Phase 1: Replicate Client & Credit System (Day 1)

#### 1.1 Replicate Client
```typescript
// lib/ai/replicate/client.ts
import Replicate from 'replicate'

export class ReplicateClient {
  private client: Replicate
  private apiKey: string
  
  constructor() {
    const isCloud = process.env.NEXT_PUBLIC_DEPLOYMENT === 'cloud'
    this.apiKey = isCloud 
      ? process.env.REPLICATE_API_KEY! // Our key for cloud
      : process.env.NEXT_PUBLIC_REPLICATE_API_KEY! // User's key
      
    this.client = new Replicate({
      auth: this.apiKey,
    })
  }
  
  async run(
    model: string,
    options: {
      input: Record<string, any>
      wait?: boolean
      webhook?: string
    }
  ): Promise<any> {
    try {
      const output = await this.client.run(model, options)
      return output
    } catch (error) {
      if (error.message?.includes('rate limit')) {
        throw new ReplicateError('RATE_LIMIT', 'Too many requests. Please try again later.')
      }
      if (error.message?.includes('payment')) {
        throw new ReplicateError('PAYMENT_REQUIRED', 'Please add credits to continue.')
      }
      throw error
    }
  }
  
  async getModel(model: string): Promise<ModelInfo> {
    const [owner, name] = model.split('/')
    return this.client.models.get(owner, name)
  }
}
```

#### 1.2 Simple Credit Manager
```typescript
// lib/ai/credits/manager.ts
export class CreditManager {
  private static MARKUP_RATE = 1.20 // 20% markup for cloud users
  
  static async checkCredits(modelId: string, userId: string): Promise<boolean> {
    if (!isCloudDeployment()) return true // Self-hosted users manage their own
    
    const user = await getUser(userId)
    const estimatedCost = await this.estimateCost(modelId)
    
    return user.credits >= estimatedCost
  }
  
  static async deductCredits(modelId: string, userId: string, actualCost: number): Promise<void> {
    if (!isCloudDeployment()) return
    
    const chargedAmount = actualCost * this.MARKUP_RATE
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ credits: sql`credits - ${chargedAmount}` })
        .where(eq(users.id, userId))
        
      await tx.insert(usageLog).values({
        userId,
        modelId,
        cost: actualCost,
        charged: chargedAmount,
        timestamp: new Date()
      })
    })
  }
  
  static async estimateCost(modelId: string): Promise<number> {
    // Simple lookup table for now
    const costs: Record<string, number> = {
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b': 0.00055, // SDXL
      'sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204c56e7c1a0a6f9e4f1ba5f8e7a9': 0.00025, // Face enhance
      'jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a': 0.00055, // Upscale
      'stability-ai/stable-diffusion-inpainting': 0.00055, // Inpainting
    }
    
    return costs[modelId] || 0.001 // Default cost
  }
}
```

### Phase 2: AI-Native Tools (Day 2)

Following Epic 5.25 terminology, we create AI-Native Tools in `lib/ai/tools/`:

#### 2.1 Base AI-Native Tool
```typescript
// lib/ai/tools/base/BaseAITool.ts
export abstract class BaseAITool {
  abstract id: string
  abstract name: string
  abstract modelId: string
  
  protected client: ReplicateClient
  
  constructor() {
    this.client = new ReplicateClient()
  }
  
  abstract execute(params: any): Promise<any>
  
  protected async canvasToBase64(canvas: Canvas): Promise<string> {
    return canvas.toDataURL('image/png')
  }
  
  protected async base64ToFabricImage(base64: string): Promise<fabric.Image> {
    return new Promise((resolve, reject) => {
      fabric.Image.fromURL(base64, (img) => {
        if (img) resolve(img)
        else reject(new Error('Failed to load image'))
      })
    })
  }
}
```

#### 2.2 Background Removal Tool (AI-Native)
```typescript
// lib/ai/tools/BackgroundRemovalTool.ts
import { BaseAITool } from './base/BaseAITool'

export class BackgroundRemovalTool extends BaseAITool {
  id = 'background-removal'
  name = 'Background Removal'
  modelId = 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003'
  
  async execute(params: { image: string, model?: string }): Promise<string> {
    const output = await this.client.run(this.modelId, {
      input: {
        image: params.image,
        model: params.model || 'u2net'
      }
    })
    
    return output as string
  }
}
```

#### 2.3 Other AI-Native Tools
```typescript
// lib/ai/tools/UpscaleTool.ts
export class UpscaleTool extends BaseAITool {
  id = 'upscale'
  name = 'AI Upscaler'
  modelId = 'jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a'
  
  async execute(params: { image: string, scale: number }): Promise<string> {
    // Implementation
  }
}

// lib/ai/tools/FaceEnhancementTool.ts
export class FaceEnhancementTool extends BaseAITool {
  id = 'face-enhancement'
  name = 'Face Enhancement'
  modelId = 'sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204c56e7c1a0a6f9e4f1ba5f8e7a9'
  
  async execute(params: { image: string }): Promise<string> {
    // Implementation
  }
}

// lib/ai/tools/ImageGenerationTool.ts
export class ImageGenerationTool extends BaseAITool {
  id = 'image-generation'
  name = 'Image Generation'
  modelId = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b'
  
  async execute(params: { 
    prompt: string, 
    negative_prompt?: string,
    width?: number,
    height?: number 
  }): Promise<string> {
    // Implementation
  }
}

// lib/ai/tools/InpaintingTool.ts
export class InpaintingTool extends BaseAITool {
  id = 'inpainting'
  name = 'AI Inpainting'
  modelId = 'stability-ai/stable-diffusion-inpainting'
  
  async execute(params: {
    image: string,
    mask: string,
    prompt: string
  }): Promise<string> {
    // Implementation
  }
}
```

### Phase 3: Tool Adapters for AI-Native Tools (Day 2-3)

Following the unified adapter pattern, we create adapters that wrap our AI-Native Tools:

#### 3.1 Base Replicate Tool Adapter
```typescript
// lib/ai/adapters/base/ReplicateToolAdapter.ts
import { BaseToolAdapter } from './BaseToolAdapter'
import { CreditManager } from '@/lib/ai/credits/manager'

export abstract class ReplicateToolAdapter<TInput, TOutput> extends BaseToolAdapter<TInput, TOutput> {
  protected abstract aiNativeTool: BaseAITool
  
  async execute(params: TInput, context: { canvas: Canvas }): Promise<TOutput> {
    // Check credits before running
    const userId = await getCurrentUserId()
    const hasCredits = await CreditManager.checkCredits(this.aiNativeTool.modelId, userId)
    
    if (!hasCredits) {
      throw new Error('Insufficient credits. Please add more credits to continue.')
    }
    
    const startTime = Date.now()
    
    try {
      // Get canvas as base64
      const inputImage = await this.canvasToBase64(context.canvas)
      
      // Prepare params for AI-Native Tool
      const toolParams = await this.prepareToolParams(inputImage, params)
      
      // Execute AI-Native Tool
      const output = await this.aiNativeTool.execute(toolParams)
      
      // Apply result to canvas
      await this.applyToCanvas(output, context.canvas)
      
      // Deduct credits based on actual run time
      const runTime = (Date.now() - startTime) / 1000
      const cost = this.calculateCost(runTime)
      await CreditManager.deductCredits(this.aiNativeTool.modelId, userId, cost)
      
      return this.formatOutput(output, cost)
      
    } catch (error) {
      console.error(`Replicate model ${this.aiNativeTool.modelId} failed:`, error)
      throw error
    }
  }
  
  protected abstract prepareToolParams(inputImage: string, params: TInput): Promise<any>
  protected abstract applyToCanvas(output: any, canvas: Canvas): Promise<void>
  protected abstract formatOutput(output: any, cost: number): TOutput
  
  protected calculateCost(runTimeSeconds: number): number {
    // Most Replicate models charge by second of GPU time
    // This is a simplified calculation
    return runTimeSeconds * 0.0001
  }
}
```

#### 3.2 Background Removal Adapter
```typescript
// lib/ai/adapters/tools/backgroundRemoval.ts
import { z } from 'zod'
import { ReplicateToolAdapter } from '../base/ReplicateToolAdapter'
import { BackgroundRemovalTool } from '@/lib/ai/tools/BackgroundRemovalTool'

export class BackgroundRemovalAdapter extends ReplicateToolAdapter<
  z.infer<typeof inputSchema>,
  { success: boolean; cost: number }
> {
  protected aiNativeTool = new BackgroundRemovalTool()
  
  aiName = 'removeBackground'
  description = 'Remove image background using AI'
  
  inputSchema = z.object({
    model: z.enum(['u2net', 'u2netp', 'u2net_human_seg']).optional()
      .describe('Model to use for background removal')
  })
  
  protected async prepareToolParams(inputImage: string, params: any) {
    return {
      image: inputImage,
      model: params.model || 'u2net'
    }
  }
  
  protected async applyToCanvas(output: string, canvas: Canvas) {
    const img = await this.base64ToFabricImage(output)
    canvas.clear()
    canvas.add(img)
    canvas.renderAll()
  }
  
  protected formatOutput(output: any, cost: number) {
    return { success: true, cost }
  }
}
```

#### 3.3 Other Tool Adapters
```typescript
// lib/ai/adapters/tools/upscale.ts
export class UpscaleAdapter extends ReplicateToolAdapter<
  { scale: '2' | '4' },
  { success: boolean; cost: number }
> {
  protected aiNativeTool = new UpscaleTool()
  
  aiName = 'upscale'
  description = 'Upscale image 2x or 4x with AI enhancement'
  
  inputSchema = z.object({
    scale: z.enum(['2', '4']).describe('Upscaling factor')
  })
  
  // ... implementation
}

// lib/ai/adapters/tools/faceEnhance.ts
export class FaceEnhanceAdapter extends ReplicateToolAdapter<
  Record<string, never>,
  { success: boolean; cost: number }
> {
  protected aiNativeTool = new FaceEnhancementTool()
  
  aiName = 'enhanceFace'
  description = 'Enhance and restore faces in photos'
  
  inputSchema = z.object({})
  
  // ... implementation
}

// lib/ai/adapters/tools/imageGeneration.ts
export class ImageGenerationAdapter extends ReplicateToolAdapter<
  z.infer<typeof inputSchema>,
  { success: boolean; cost: number; generatedImage: string }
> {
  protected aiNativeTool = new ImageGenerationTool()
  
  aiName = 'generateImage'
  description = 'Generate images from text descriptions'
  
  inputSchema = z.object({
    prompt: z.string().describe('What to generate'),
    negative_prompt: z.string().optional().describe('What to avoid'),
    width: z.number().default(1024),
    height: z.number().default(1024)
  })
  
  // ... implementation
}

// lib/ai/adapters/tools/inpainting.ts
export class InpaintingAdapter extends ReplicateToolAdapter<
  z.infer<typeof inputSchema>,
  { success: boolean; cost: number }
> {
  protected aiNativeTool = new InpaintingTool()
  
  aiName = 'removeObject'
  description = 'Remove unwanted objects from images'
  
  inputSchema = z.object({
    prompt: z.string().describe('What should replace the masked area'),
    mask: z.string().describe('Base64 mask image')
  })
  
  // ... implementation
}
```

### Phase 4: Registration & Integration (Day 3-4)

#### 4.1 Tool Registration
```typescript
// lib/ai/adapters/registry.ts
export async function registerReplicateAdapters() {
  // All adapters register in the same registry as Canvas Tool adapters
  const adapters = [
    new BackgroundRemovalAdapter(),
    new UpscaleAdapter(),
    new FaceEnhanceAdapter(),
    new ImageGenerationAdapter(),
    new InpaintingAdapter()
  ]
  
  for (const adapter of adapters) {
    adapterRegistry.register(adapter)
  }
}

// Update autoDiscoverAdapters to include Replicate adapters
export async function autoDiscoverAdapters() {
  // ... existing canvas tool adapters ...
  
  // Register AI-Native Tool adapters
  await registerReplicateAdapters()
}
```

#### 4.2 Usage Tracking UI
```typescript
// components/editor/UsageIndicator.tsx
export function UsageIndicator() {
  const { credits, usage } = useCredits()
  const isCloud = getDeploymentMode() === 'cloud'
  
  if (!isCloud) return null
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <Coins className="w-4 h-4" />
      <span>${credits.toFixed(2)}</span>
      {usage.today > 0 && (
        <span className="text-muted-foreground">
          (${usage.today.toFixed(2)} today)
        </span>
      )}
    </div>
  )
}
```

### Phase 5: Documentation (Day 4-5)

#### 5.1 Self-Hosting Setup
```markdown
# Replicate Integration Setup

## For Self-Hosted Users

1. Get your Replicate API key from https://replicate.com/account
2. Add to your `.env.local`:
   ```
   NEXT_PUBLIC_REPLICATE_API_KEY=r8_xxxxxxxxxxxx
   ```
3. Restart the application
4. AI tools will now be available in the tool palette

## Architecture Overview

Following our established patterns:
- **AI-Native Tools** (`lib/ai/tools/`) - Tools that call Replicate API
- **Tool Adapters** (`lib/ai/adapters/tools/`) - Make tools AI-chat compatible
- **Single Registry** - Both Canvas and AI-Native tools register together

## Available Models

| Tool | AI-Native Tool Class | Adapter | Estimated Cost |
|------|---------------------|---------|----------------|
| Background Removal | BackgroundRemovalTool | BackgroundRemovalAdapter | ~$0.001/image |
| Upscaling | UpscaleTool | UpscaleAdapter | ~$0.002/image |
| Face Enhancement | FaceEnhancementTool | FaceEnhanceAdapter | ~$0.001/image |
| Image Generation | ImageGenerationTool | ImageGenerationAdapter | ~$0.002/image |
| Object Removal | InpaintingTool | InpaintingAdapter | ~$0.002/image |

## Usage

All AI tools are available through:
1. The tool palette (left sidebar)
2. AI chat commands (e.g., "remove background")

The AI chat doesn't distinguish between Canvas Tools and AI-Native Tools - they all work the same way through adapters.
```

## Success Criteria

1. **Architecture Compliance**
   - AI-Native Tools in `lib/ai/tools/` ✓
   - Tool Adapters wrap all tools ✓
   - Single adapter registry ✓
   - Consistent naming conventions ✓

2. **Integration Complete**
   - Replicate client working for both cloud/self-hosted
   - All 5 AI tools functional
   - Credit tracking accurate

3. **Performance**
   - Tool execution < 10 seconds average
   - Clear progress indication
   - Graceful error handling

4. **User Experience**
   - Tools feel native to the app
   - Costs are transparent
   - Easy to understand limits

## Technical Decisions

1. **Why Replicate?**
   - Huge model selection
   - Pay-per-use pricing
   - No infrastructure to manage
   - Consistent API across models

2. **Why These 5 Tools?**
   - Cover most common photo editing AI needs
   - Well-tested, production-ready models
   - Good cost/performance ratio
   - Clear value proposition

3. **Unified Architecture**
   - AI-Native Tools follow same patterns as Canvas Tools
   - All tools use adapters for AI compatibility
   - Single registry maintains consistency
   - Future-proof for adding more tools

---

**Status**: 📋 Planned
**Estimated Duration**: 5 days
**Dependencies**: Existing tool system and Epic 5.25 patterns 