# Epic 9: Advanced AI Features (Generation & Computer Use)

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-9-advanced-ai`
2. **Base Branch**: Branch off from `main` 
3. **Commits**: Use conventional commits (e.g., `feat: add image generation`, `fix: inpainting blend algorithm`)
4. **Pull Request**: 
   - Title: "Epic 9: Advanced AI Features (Generation & Computer Use)"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**: 
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Ensure Epic 5 (Core Tools) and Epic 6 (Orchestration) are merged
   
2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed
   
3. **Testing Requirements**:
   - Test image generation with various prompts
   - Test inpainting/outpainting seamless blending
   - Test autonomous agent goal achievement
   - Test batch processing with 10+ images
   - Test style transfer quality
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Coordination
- Check #dev-canvas channel in Slack/Discord for updates
- Don't modify files being worked on in other epics
- If you need changes in shared files (e.g., constants, types), coordinate with team

---

## Overview
This epic integrates cutting-edge AI capabilities including AI image generation, inpainting/outpainting, computer use for complex workflows, and autonomous editing agents. We'll leverage AI SDK v5's image generation and implement computer use patterns for advanced automation.

## References
- [AI SDK v5 Image Generation](https://v5.ai-sdk.dev/docs/ai-sdk-core/image-generation)
- [Computer Use Guide](https://v5.ai-sdk.dev/cookbook/guides/computer-use)
- [Multi-Step Tool Usage](https://v5.ai-sdk.dev/docs/foundations/agents#multi-step-tool-usage)
- [Autonomous Agents](https://v5.ai-sdk.dev/docs/foundations/agents)

## Key Implementation Details

### 1. AI Image Generation Integration

**File to Create**: `lib/ai/generation/image-generator.ts`
```typescript
import { generateImage } from 'ai'
import { openai } from '@/lib/ai/providers'
import { z } from 'zod'

const ImageGenerationSchema = z.object({
  prompt: z.string(),
  style: z.enum(['photorealistic', 'artistic', 'digital-art', 'oil-painting', 'watercolor']).optional(),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  n: z.number().min(1).max(4).optional()
})

export class ImageGenerator {
  static async generate(params: z.infer<typeof ImageGenerationSchema>) {
    const { image } = await generateImage({
      model: openai.image('dall-e-3'),
      prompt: this.enhancePrompt(params.prompt, params.style),
      size: params.size || '1024x1024',
      quality: params.quality || 'standard',
      n: params.n || 1
    })
    
    return {
      images: image.base64 ? [image.base64] : [],
      revisedPrompt: image.revisedPrompt
    }
  }
  
  private static enhancePrompt(prompt: string, style?: string): string {
    const styleModifiers = {
      'photorealistic': 'photorealistic, high detail, professional photography',
      'artistic': 'artistic interpretation, creative style',
      'digital-art': 'digital art, modern illustration',
      'oil-painting': 'oil painting style, classical art technique',
      'watercolor': 'watercolor painting, soft colors, fluid strokes'
    }
    
    return style ? `${prompt}, ${styleModifiers[style]}` : prompt
  }
}
```

### 2. Inpainting/Outpainting System

**File to Create**: `lib/ai/generation/inpainting.ts`
```typescript
export class InpaintingSystem {
  static async inpaint(
    image: string,        // base64
    mask: string,         // base64 mask where white = edit area
    prompt: string,
    context: CanvasContext
  ): Promise<InpaintResult> {
    // For DALL-E 2 (supports editing)
    const { image: result } = await generateImage({
      model: openai.image('dall-e-2'),
      image,
      mask,
      prompt,
      size: this.getClosestSize(context.width, context.height)
    })
    
    return {
      editedImage: result.base64!,
      blendedImage: await this.blendWithOriginal(image, result.base64!, mask)
    }
  }
  
  static async outpaint(
    image: string,
    direction: 'left' | 'right' | 'top' | 'bottom' | 'all',
    expandBy: number,
    prompt: string
  ): Promise<OutpaintResult> {
    // Create expanded canvas
    const expandedCanvas = await this.createExpandedCanvas(image, direction, expandBy)
    
    // Generate mask for new area
    const mask = await this.createOutpaintMask(
      expandedCanvas.width,
      expandedCanvas.height,
      direction,
      expandBy
    )
    
    // Use inpainting to fill new area
    return await this.inpaint(
      expandedCanvas.image,
      mask,
      prompt,
      expandedCanvas
    )
  }
}
```

### 3. Computer Use Implementation

**File to Create**: `lib/ai/computer-use/screenshot-evaluator.ts`
```typescript
import { tool } from 'ai'
import { z } from 'zod'

export const computerUseTool = tool({
  description: 'Take a screenshot and evaluate the current edit',
  inputSchema: z.object({
    action: z.enum(['screenshot', 'click', 'type', 'scroll']),
    coordinates: z.object({
      x: z.number(),
      y: z.number()
    }).optional(),
    text: z.string().optional()
  }),
  execute: async ({ action, coordinates, text }) => {
    switch (action) {
      case 'screenshot':
        return await captureCanvasState()
      case 'click':
        return await simulateClick(coordinates!)
      case 'type':
        return await simulateTyping(text!)
      case 'scroll':
        return await simulateScroll(coordinates!)
    }
  }
})

export class ScreenshotEvaluator {
  static async evaluateEdit(
    screenshot: string,
    expectedResult: string
  ): Promise<EvaluationResult> {
    const { object: evaluation } = await generateObject({
      model: openai('gpt-4o-vision'),
      schema: ScreenshotEvaluationSchema,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Evaluate if this screenshot matches the expected result: ${expectedResult}`
          },
          { type: 'image', image: screenshot }
        ]
      }]
    })
    
    return evaluation
  }
}
```

### 4. Autonomous Editing Agent

**File to Create**: `lib/ai/agents/autonomous-editor.ts`
```typescript
export class AutonomousEditingAgent {
  private maxAttempts = 3
  private satisfactionThreshold = 0.85
  
  async editUntilSatisfactory(
    image: string,
    goal: string,
    constraints: EditConstraints
  ): Promise<AutonomousEditResult> {
    let currentImage = image
    let attempts = 0
    const history: EditAttempt[] = []
    
    while (attempts < this.maxAttempts) {
      // Plan the edit
      const plan = await this.planEdit(currentImage, goal, history)
      
      // Execute the plan
      const result = await this.executePlan(plan, currentImage)
      
      // Take screenshot and evaluate
      const screenshot = await computerUseTool.execute({ action: 'screenshot' })
      const evaluation = await ScreenshotEvaluator.evaluateEdit(
        screenshot.image,
        goal
      )
      
      // Record attempt
      history.push({
        attempt: attempts + 1,
        plan,
        result,
        evaluation,
        image: result.image
      })
      
      // Check satisfaction
      if (evaluation.satisfactionScore >= this.satisfactionThreshold) {
        return {
          success: true,
          finalImage: result.image,
          attempts: attempts + 1,
          history
        }
      }
      
      // Learn from failure and adjust
      currentImage = result.image
      attempts++
    }
    
    // Return best attempt
    const bestAttempt = history.reduce((best, current) => 
      current.evaluation.satisfactionScore > best.evaluation.satisfactionScore 
        ? current : best
    )
    
    return {
      success: false,
      finalImage: bestAttempt.image,
      attempts,
      history
    }
  }
}
```

### 5. Batch Processing with AI

**File to Create**: `lib/ai/batch/batch-processor.ts`
```typescript
export class AIBatchProcessor {
  static async processBatch(
    images: string[],
    operations: BatchOperation[],
    options: BatchOptions = {}
  ): Promise<BatchResult> {
    const results: ProcessedImage[] = []
    const errors: BatchError[] = []
    
    // Create progress tracker
    const progress = new BatchProgress(images.length)
    
    // Process in parallel with concurrency limit
    const concurrency = options.concurrency || 3
    const chunks = this.chunkArray(images, concurrency)
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(async (image, index) => {
          try {
            // Apply AI-guided operations
            let processedImage = image
            
            for (const operation of operations) {
              if (operation.type === 'ai-enhance') {
                // Use AI to determine best enhancements
                const enhancements = await this.determineEnhancements(processedImage)
                processedImage = await this.applyEnhancements(processedImage, enhancements)
              } else {
                processedImage = await this.applyOperation(processedImage, operation)
              }
            }
            
            // AI quality check
            if (options.qualityCheck) {
              const quality = await QualityEvaluator.evaluate(
                image,
                processedImage,
                'batch processing',
                operations.map(op => op.type)
              )
              
              if (quality.overallScore < options.minQuality!) {
                throw new Error(`Quality below threshold: ${quality.overallScore}`)
              }
            }
            
            progress.increment()
            
            return {
              original: image,
              processed: processedImage,
              metadata: await this.generateMetadata(image, processedImage)
            }
          } catch (error) {
            errors.push({
              imageIndex: index,
              error: error.message,
              operation: operations[operations.length - 1]
            })
            throw error
          }
        })
      )
      
      // Collect successful results
      chunkResults.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        }
      })
    }
    
    return {
      successful: results,
      failed: errors,
      totalProcessed: results.length,
      totalFailed: errors.length
    }
  }
}
```

### 6. Style Transfer

**File to Create**: `lib/ai/style/style-transfer.ts`
```typescript
export class StyleTransfer {
  static async transferStyle(
    contentImage: string,
    styleReference: string | StylePreset,
    strength: number = 0.7
  ): Promise<StyleTransferResult> {
    // If using a preset, get the reference image
    const styleImage = typeof styleReference === 'string' 
      ? styleReference 
      : await this.getPresetImage(styleReference)
    
    // Generate style transfer prompt
    const prompt = await this.generateStylePrompt(contentImage, styleImage)
    
    // Use image generation with image-to-image
    const { image } = await generateImage({
      model: openai.image('dall-e-2'),
      image: contentImage,
      prompt: `${prompt}, style transfer strength: ${strength}`,
      n: 1
    })
    
    // Blend with original based on strength
    const blended = await this.blendImages(
      contentImage,
      image.base64!,
      strength
    )
    
    return {
      styledImage: blended,
      styleAnalysis: await this.analyzeStyle(styleImage),
      appliedStrength: strength
    }
  }
  
  static async extractStyle(image: string): Promise<StyleAnalysis> {
    const { object: analysis } = await generateObject({
      model: openai('gpt-4o-vision'),
      schema: StyleAnalysisSchema,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze the artistic style of this image in detail'
          },
          { type: 'image', image }
        ]
      }]
    })
    
    return analysis
  }
}
```

### 7. AI-Powered Selection Tools

**File to Create**: `lib/ai/tools/selection/ai-select.ts`
```typescript
export const aiSelectTool = ToolFactory.createTool({
  name: 'aiSelect',
  category: 'selection',
  description: 'AI-powered object selection',
  inputSchema: z.object({
    prompt: z.string().describe('What to select (e.g., "the person", "the sky", "all red objects")'),
    mode: z.enum(['add', 'subtract', 'intersect']).optional(),
    precision: z.enum(['fast', 'balanced', 'precise']).optional()
  }),
  outputSchema: z.object({
    mask: z.string(), // base64 mask
    objects: z.array(z.object({
      label: z.string(),
      confidence: z.number(),
      bounds: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number()
      })
    }))
  }),
  executionSide: 'both',
  requiresCanvas: true,
  
  clientExecutor: async (input, context) => {
    // Use segmentation model to create selection
    const segmentation = await runSegmentationModel(
      context.canvas!,
      input.prompt
    )
    
    // Convert to selection mask
    const mask = await createSelectionMask(segmentation)
    
    // Apply to canvas selection
    await applyMaskToSelection(context.canvas!, mask, input.mode)
    
    return {
      success: true,
      mask,
      objects: segmentation.objects
    }
  }
})
```

### 8. Generative Fill

**File to Create**: `lib/ai/tools/generation/generative-fill.ts`
```typescript
export const generativeFillTool = ToolFactory.createTool({
  name: 'generativeFill',
  category: 'edit',
  description: 'Fill selected area with AI-generated content',
  inputSchema: z.object({
    prompt: z.string().describe('What to fill the selection with'),
    seamlessBlend: z.boolean().default(true),
    variations: z.number().min(1).max(4).default(1)
  }),
  outputSchema: z.object({
    fills: z.array(z.object({
      image: z.string(),
      confidence: z.number()
    }))
  }),
  executionSide: 'both',
  requiresCanvas: true,
  requiresSelection: true,
  
  serverExecutor: async (input) => {
    // Get selection mask and context
    const { image, mask, context } = await getSelectionContext()
    
    // Generate multiple variations
    const fills = await Promise.all(
      Array.from({ length: input.variations }, async () => {
        const result = await ImageGenerator.inpaint(
          image,
          mask,
          input.prompt,
          context
        )
        
        return {
          image: input.seamlessBlend 
            ? await seamlessBlend(result.editedImage, image, mask)
            : result.editedImage,
          confidence: 0.85 // TODO: Calculate actual confidence
        }
      })
    )
    
    return {
      success: true,
      fills
    }
  }
})
```

### 9. Integration with Chat

**File to Modify**: `app/api/ai/chat/route.ts`
```typescript
// Add new tools
import { aiSelectTool } from '@/lib/ai/tools/selection/ai-select'
import { generativeFillTool } from '@/lib/ai/tools/generation/generative-fill'
import { computerUseTool } from '@/lib/ai/computer-use/screenshot-evaluator'

// Register advanced tools
toolRegistry.registerMany([
  aiSelectTool,
  generativeFillTool,
  // ... other advanced tools
])

// Add computer use to tools
const tools = {
  ...toolRegistry.toAISDKTools(),
  computerUse: computerUseTool,
  generateImage: tool({
    description: 'Generate a new image from text',
    inputSchema: ImageGenerationSchema,
    execute: async (params) => ImageGenerator.generate(params)
  })
}
```

### 10. Advanced Features UI

**File to Create**: `components/editor/AdvancedAI/GenerativePanel.tsx`
```typescript
export function GenerativePanel() {
  const [mode, setMode] = useState<'generate' | 'inpaint' | 'outpaint'>('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Button
          variant={mode === 'generate' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('generate')}
        >
          Generate
        </Button>
        <Button
          variant={mode === 'inpaint' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('inpaint')}
        >
          Inpaint
        </Button>
        <Button
          variant={mode === 'outpaint' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('outpaint')}
        >
          Outpaint
        </Button>
      </div>
      
      {mode === 'generate' && <GenerateImageForm />}
      {mode === 'inpaint' && <InpaintForm />}
      {mode === 'outpaint' && <OutpaintForm />}
    </div>
  )
}
```

## Testing Requirements

**Files to Create**:
- `__tests__/ai/generation/image-generator.test.ts`
- `__tests__/ai/agents/autonomous-editor.test.ts`
- `__tests__/ai/computer-use/screenshot-evaluator.test.ts`

## Success Criteria
1. Image generation completes in <10 seconds
2. Inpainting blends seamlessly with original
3. Autonomous agent achieves goal in ≤3 attempts
4. Batch processing handles 100+ images
5. Style transfer preserves content structure
6. AI selection accuracy >90% for common objects

## Dependencies
- Epic 5 (Core Tools) for base infrastructure
- Epic 6 (Orchestration) for multi-step workflows
- DALL-E API access for image generation
- Segmentation model for AI selection

## Estimated Effort
- 1 developer × 8-10 days
- Requires expertise in:
  - Image generation APIs
  - Computer vision
  - Autonomous agent design
  - Batch processing patterns 