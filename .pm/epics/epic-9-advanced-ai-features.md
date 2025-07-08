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

### Epic Start Process

Before implementing advanced features:

1. **Deep Dive Analysis** (Required)
   - Study AI SDK v5 image generation docs
   - Analyze existing canvas-to-image pipelines
   - Understand current selection systems
   - Document autonomous agent patterns
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study DALL-E API capabilities/limits
   - Research inpainting algorithms
   - Investigate computer use patterns
   - Compare batch processing approaches

3. **Gap Identification**
   - Image generation integration
   - Mask creation for inpainting
   - Screenshot capture mechanism
   - Batch processing infrastructure

### Epic End Process

1. **Quality Validation**
   - Image generation <10s response
   - Inpainting blends seamlessly
   - Autonomous agent reliable
   - Batch processing efficient

2. **Integration Testing**
   - Test with various prompts
   - Test inpainting edge cases
   - Test autonomous agent scenarios
   - Verify API rate limits

3. **Documentation**
   - Image generation guide
   - Computer use patterns
   - Batch processing docs

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

### 9. Semantic Region Detection & Targeting

**File to Create**: `lib/ai/vision/object-detector.ts`
```typescript
import { generateObject } from 'ai'
import { z } from 'zod'

const DetectedObjectSchema = z.object({
  id: z.string(),
  label: z.string(),
  confidence: z.number(),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }),
  polygon: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  attributes: z.record(z.string()).optional() // e.g., color, size, position
})

const ObjectDetectionSchema = z.object({
  objects: z.array(DetectedObjectSchema),
  relationships: z.array(z.object({
    subject: z.string(), // object id
    predicate: z.string(), // relationship type
    object: z.string() // related object id
  })).optional()
})

export class ObjectDetector {
  static async detectObjects(
    image: string,
    query: string // "the hat", "his shirt", "the person's face"
  ): Promise<DetectedObject[]> {
    const { object: detection } = await generateObject({
      model: openai('gpt-4o-vision'),
      schema: ObjectDetectionSchema,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Identify and provide precise bounding boxes for: "${query}". Include polygon outlines for complex shapes.`
          },
          { type: 'image', image }
        ]
      }]
    })
    
    return detection.objects.filter(obj => 
      this.matchesQuery(obj, query, detection.relationships)
    )
  }
  
  private static matchesQuery(
    object: DetectedObject,
    query: string,
    relationships?: Relationship[]
  ): boolean {
    // Implement smart matching logic
    // Handle queries like "the person's hat" using relationships
    return true // placeholder
  }
}
```

**File to Create**: `lib/ai/vision/semantic-analyzer.ts`
```typescript
const ImageRegionsSchema = z.object({
  people: z.array(z.object({
    id: z.string(),
    bounds: BoundsSchema,
    pose: z.enum(['standing', 'sitting', 'lying', 'other']).optional(),
    parts: z.object({
      face: BoundsSchema.optional(),
      hair: BoundsSchema.optional(),
      torso: BoundsSchema.optional(),
      shirt: BoundsSchema.optional(),
      pants: BoundsSchema.optional(),
      shoes: BoundsSchema.optional()
    }).optional(),
    attributes: z.object({
      age: z.enum(['child', 'teen', 'adult', 'elderly']).optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      emotion: z.string().optional()
    }).optional()
  })),
  objects: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    bounds: BoundsSchema,
    wornBy: z.string().optional(), // person id
    heldBy: z.string().optional(), // person id
    color: z.string().optional(),
    material: z.string().optional()
  })),
  text: z.array(z.object({
    content: z.string(),
    bounds: BoundsSchema,
    fontSize: z.number().optional(),
    fontFamily: z.string().optional(),
    color: z.string().optional()
  })),
  regions: z.array(z.object({
    type: z.enum(['sky', 'ground', 'water', 'building', 'vegetation', 'other']),
    bounds: BoundsSchema,
    label: z.string()
  })),
  emptyAreas: z.array(z.object({
    bounds: BoundsSchema,
    suitableFor: z.array(z.enum(['text', 'logo', 'object', 'person'])),
    backgroundColor: z.string().optional()
  }))
})

export class SemanticAnalyzer {
  static async analyzeImageRegions(image: string): Promise<ImageRegions> {
    const { object: regions } = await generateObject({
      model: openai('gpt-4o-vision'),
      schema: ImageRegionsSchema,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this image comprehensively. Identify all people, objects, text, regions, and empty areas suitable for additions. For people, identify body parts and clothing items.'
          },
          { type: 'image', image }
        ]
      }]
    })
    
    return regions
  }
  
  static async findTargetArea(
    regions: ImageRegions,
    target: string // "on his shirt", "next to the car"
  ): Promise<TargetArea> {
    // Parse the target description
    const parsed = await this.parseTargetDescription(target)
    
    // Find the referenced area
    if (parsed.type === 'on-object') {
      return this.findObjectArea(regions, parsed.object, parsed.modifier)
    } else if (parsed.type === 'relative-position') {
      return this.findRelativeArea(regions, parsed.reference, parsed.position)
    }
    
    throw new Error(`Could not find target area: ${target}`)
  }
}
```

**File to Create**: `lib/ai/vision/placement-advisor.ts`
```typescript
export class PlacementAdvisor {
  static async suggestTextPlacement(
    image: string,
    target: string, // "on his shirt"
    textContent: string,
    style?: TextStyle
  ): Promise<PlacementSuggestion> {
    // Analyze image for suitable placement
    const regions = await SemanticAnalyzer.analyzeImageRegions(image)
    
    // Find target area
    const targetArea = await SemanticAnalyzer.findTargetArea(regions, target)
    
    // Calculate optimal placement
    const placement = await this.calculateOptimalPlacement(
      image,
      targetArea,
      textContent,
      style
    )
    
    return {
      position: placement.position,
      maxWidth: targetArea.width * 0.8,
      maxHeight: targetArea.height * 0.8,
      suggestedFontSize: placement.fontSize,
      rotation: targetArea.estimatedAngle || 0,
      color: await this.suggestContrastingColor(image, targetArea),
      backgroundColor: placement.needsBackground ? 
        await this.suggestBackgroundColor(image, targetArea) : undefined,
      textAlign: placement.alignment
    }
  }
  
  static async suggestObjectPlacement(
    image: string,
    objectType: string,
    constraints?: PlacementConstraints
  ): Promise<ObjectPlacementSuggestion[]> {
    const regions = await SemanticAnalyzer.analyzeImageRegions(image)
    
    // Find suitable empty areas
    const candidates = regions.emptyAreas.filter(area =>
      area.suitableFor.includes(objectType as any)
    )
    
    // Rank by suitability
    const ranked = await this.rankPlacementCandidates(
      image,
      candidates,
      objectType,
      constraints
    )
    
    return ranked.slice(0, 3) // Top 3 suggestions
  }
}
```

**File to Create**: `lib/ai/tools/semantic/semantic-erase.ts`
```typescript
export const semanticEraseTool = ToolFactory.createTool({
  name: 'semanticErase',
  category: 'edit',
  description: 'Erase objects by description',
  inputSchema: z.object({
    target: z.string().describe('What to erase (e.g., "the hat", "all text", "the person on the left")'),
    precision: z.enum(['exact', 'generous']).default('exact'),
    fillMode: z.enum(['content-aware', 'transparent', 'background-color']).default('content-aware')
  }),
  outputSchema: z.object({
    erasedObjects: z.array(z.object({
      label: z.string(),
      bounds: BoundsSchema,
      filled: z.boolean()
    })),
    processedImage: z.string().optional()
  }),
  executionSide: 'both',
  requiresCanvas: true,
  
  clientExecutor: async (input, context) => {
    const canvas = context.canvas!
    const image = canvas.toDataURL()
    
    // Detect target objects
    const objects = await ObjectDetector.detectObjects(image, input.target)
    
    if (objects.length === 0) {
      throw new Error(`Could not find "${input.target}" in the image`)
    }
    
    const erasedObjects = []
    
    for (const obj of objects) {
      // Create precise mask from bounds or polygon
      const mask = obj.polygon 
        ? await createMaskFromPolygon(obj.polygon, canvas.width, canvas.height)
        : await createMaskFromBounds(obj.bounds, canvas.width, canvas.height)
      
      // Expand mask if generous precision
      const finalMask = input.precision === 'generous'
        ? await expandMask(mask, 10) // 10px expansion
        : mask
      
      // Apply erasure based on fill mode
      if (input.fillMode === 'content-aware') {
        // Use inpainting for content-aware fill
        const result = await ImageGenerator.inpaint(
          image,
          finalMask,
          'seamlessly fill the area with surrounding content',
          { width: canvas.width, height: canvas.height }
        )
        
        // Apply result to canvas
        await applyImageToCanvas(canvas, result.blendedImage)
      } else {
        // Simple erasure
        await eraseWithMask(canvas, finalMask, input.fillMode)
      }
      
      erasedObjects.push({
        label: obj.label,
        bounds: obj.bounds,
        filled: input.fillMode === 'content-aware'
      })
    }
    
    return {
      success: true,
      erasedObjects,
      processedImage: canvas.toDataURL()
    }
  }
})
```

**File to Create**: `lib/ai/tools/semantic/semantic-text.ts`
```typescript
export const semanticTextTool = ToolFactory.createTool({
  name: 'semanticText',
  category: 'text',
  description: 'Add text with intelligent placement',
  inputSchema: z.object({
    text: z.string().describe('The text to add'),
    placement: z.string().describe('Where to place it (e.g., "on his shirt", "top left corner", "below the logo")'),
    style: z.object({
      fontFamily: z.string().optional(),
      fontSize: z.number().optional(),
      fontWeight: z.string().optional(),
      color: z.string().optional(),
      stroke: z.boolean().optional()
    }).optional(),
    autoSize: z.boolean().default(true),
    autoColor: z.boolean().default(true)
  }),
  outputSchema: z.object({
    placement: PlacementSuggestionSchema,
    applied: z.boolean()
  }),
  executionSide: 'client',
  requiresCanvas: true,
  
  clientExecutor: async (input, context) => {
    const canvas = context.canvas!
    const image = canvas.toDataURL()
    
    // Get intelligent placement suggestion
    const placement = await PlacementAdvisor.suggestTextPlacement(
      image,
      input.placement,
      input.text,
      input.style
    )
    
    // Apply auto-sizing if enabled
    if (input.autoSize && !input.style?.fontSize) {
      placement.suggestedFontSize = placement.suggestedFontSize
    }
    
    // Apply auto-color if enabled
    if (input.autoColor && !input.style?.color) {
      placement.color = placement.color
    }
    
    // Create text object with placement
    const text = new fabric.Text(input.text, {
      left: placement.position.x,
      top: placement.position.y,
      fontSize: input.style?.fontSize || placement.suggestedFontSize,
      fontFamily: input.style?.fontFamily || 'Arial',
      fontWeight: input.style?.fontWeight || 'normal',
      fill: input.style?.color || placement.color,
      angle: placement.rotation,
      textAlign: placement.textAlign,
      originX: 'center',
      originY: 'center'
    })
    
    // Add stroke if needed for visibility
    if (input.style?.stroke || placement.needsStroke) {
      text.set({
        stroke: placement.strokeColor || '#000000',
        strokeWidth: 2
      })
    }
    
    // Add to canvas
    canvas.add(text)
    canvas.renderAll()
    
    return {
      success: true,
      placement,
      applied: true
    }
  }
})
```

**File to Create**: `lib/ai/tools/semantic/semantic-transform.ts`
```typescript
export const semanticTransformTool = ToolFactory.createTool({
  name: 'semanticTransform',
  category: 'transform',
  description: 'Transform specific objects in the image',
  inputSchema: z.object({
    target: z.string().describe('What to transform (e.g., "the car", "her face")'),
    transformation: z.object({
      scale: z.number().optional(),
      rotate: z.number().optional(),
      flipX: z.boolean().optional(),
      flipY: z.boolean().optional(),
      skewX: z.number().optional(),
      skewY: z.number().optional()
    }),
    preserveContext: z.boolean().default(true)
  }),
  outputSchema: z.object({
    transformedObjects: z.array(z.object({
      label: z.string(),
      originalBounds: BoundsSchema,
      newBounds: BoundsSchema
    }))
  }),
  executionSide: 'client',
  requiresCanvas: true,
  
  clientExecutor: async (input, context) => {
    const canvas = context.canvas!
    const image = canvas.toDataURL()
    
    // Detect target objects
    const objects = await ObjectDetector.detectObjects(image, input.target)
    
    if (objects.length === 0) {
      throw new Error(`Could not find "${input.target}" in the image`)
    }
    
    const transformedObjects = []
    
    for (const obj of objects) {
      // Extract object as separate image
      const extractedObject = await extractObjectFromImage(
        image,
        obj.bounds,
        obj.polygon
      )
      
      // Apply transformations
      const transformed = await applyTransformations(
        extractedObject,
        input.transformation
      )
      
      // Calculate new bounds after transformation
      const newBounds = calculateTransformedBounds(
        obj.bounds,
        input.transformation
      )
      
      if (input.preserveContext) {
        // Use inpainting to fill the original area
        const mask = await createMaskFromBounds(obj.bounds)
        const filled = await ImageGenerator.inpaint(
          image,
          mask,
          'seamlessly fill with background',
          { width: canvas.width, height: canvas.height }
        )
        
        // Apply filled background
        await applyImageToCanvas(canvas, filled.blendedImage)
      }
      
      // Place transformed object
      await placeObjectOnCanvas(canvas, transformed, newBounds)
      
      transformedObjects.push({
        label: obj.label,
        originalBounds: obj.bounds,
        newBounds
      })
    }
    
    canvas.renderAll()
    
    return {
      success: true,
      transformedObjects
    }
  }
})
```

### 10. Integration with Chat

**File to Modify**: `app/api/ai/chat/route.ts`
```typescript
// Add new tools
import { aiSelectTool } from '@/lib/ai/tools/selection/ai-select'
import { generativeFillTool } from '@/lib/ai/tools/generation/generative-fill'
import { computerUseTool } from '@/lib/ai/computer-use/screenshot-evaluator'
import { semanticEraseTool } from '@/lib/ai/tools/semantic/semantic-erase'
import { semanticTextTool } from '@/lib/ai/tools/semantic/semantic-text'
import { semanticTransformTool } from '@/lib/ai/tools/semantic/semantic-transform'

// Register advanced tools
toolRegistry.registerMany([
  aiSelectTool,
  generativeFillTool,
  semanticEraseTool,
  semanticTextTool,
  semanticTransformTool,
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

### 11. Advanced Features UI

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
7. Semantic object detection identifies targets with >85% accuracy
8. Text placement suggestions are visually appropriate >90% of time
9. Semantic erase maintains image coherence

## Dependencies
- Epic 5 (Core Tools) for base infrastructure
- Epic 6 (Orchestration) for multi-step workflows
- DALL-E API access for image generation
- GPT-4V for vision analysis and object detection
- Segmentation model for AI selection (optional enhancement)

## Estimated Effort
- 1 developer × 10-12 days (increased from 8-10 due to semantic features)
- Requires expertise in:
  - Image generation APIs
  - Computer vision
  - Vision-language models (GPT-4V)
  - Spatial reasoning algorithms
  - Autonomous agent design
  - Batch processing patterns 