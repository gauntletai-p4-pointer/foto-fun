# Epic 16: AI Image Generation

## Overview
This epic implements AI-powered image generation capabilities using OpenAI's DALL-E API. Users can generate images from text prompts, edit existing images with AI, and create variations. The feature works for both self-hosted (with API key) and cloud deployments.

## Goals
1. **Text-to-image generation** - Create images from natural language
2. **Image editing** - Modify parts of existing images with AI
3. **Variations** - Generate similar versions of existing images
4. **Style transfer** - Apply artistic styles to photos
5. **Smart templates** - AI-powered design suggestions

## Current State Analysis

### Existing Foundation
- **AI Integration**: Established pattern in `lib/ai/` with adapters
- **Canvas System**: Fabric.js integration for image manipulation
- **Tool Architecture**: Adapter pattern can be extended for generation
- **API Routes**: Next.js API routes in `app/api/ai/`
- **No generation capability** currently exists

### Integration Points
- AI tool adapter system can handle generation tools
- Canvas can display and manipulate generated images
- Command pattern enables undo/redo of generations

## Technical Approach

### Phase 1: OpenAI Integration

Extend AI provider configuration:

```typescript
// lib/ai/providers/openai-images.ts
import OpenAI from 'openai'
import { z } from 'zod'

export const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.enum(['dall-e-2', 'dall-e-3']).default('dall-e-3'),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).optional(),
  n: z.number().min(1).max(10).default(1)
})

export const imageEditSchema = z.object({
  image: z.instanceof(File), // Original image
  mask: z.instanceof(File).optional(), // Mask for editing area
  prompt: z.string().min(1).max(4000),
  model: z.enum(['dall-e-2']).default('dall-e-2'), // Only DALL-E 2 supports editing
  size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
  n: z.number().min(1).max(10).default(1)
})

export const imageVariationSchema = z.object({
  image: z.instanceof(File),
  model: z.enum(['dall-e-2']).default('dall-e-2'), // Only DALL-E 2 supports variations
  size: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
  n: z.number().min(1).max(10).default(1)
})

export class OpenAIImageProvider {
  private client: OpenAI
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }
  
  async generateImage(params: z.infer<typeof imageGenerationSchema>) {
    const validated = imageGenerationSchema.parse(params)
    
    try {
      const response = await this.client.images.generate({
        model: validated.model,
        prompt: validated.prompt,
        size: validated.size as any,
        quality: validated.quality as any,
        style: validated.style as any,
        n: validated.n,
        response_format: 'b64_json' // For easier canvas integration
      })
      
      return response.data.map(img => ({
        b64_json: img.b64_json!,
        revised_prompt: img.revised_prompt
      }))
    } catch (error) {
      if (error.code === 'content_policy_violation') {
        throw new Error('Your prompt was rejected due to content policy. Please try a different prompt.')
      }
      throw error
    }
  }
  
  async editImage(params: z.infer<typeof imageEditSchema>) {
    const validated = imageEditSchema.parse(params)
    
    const response = await this.client.images.edit({
      model: 'dall-e-2',
      image: validated.image,
      mask: validated.mask,
      prompt: validated.prompt,
      size: validated.size as any,
      n: validated.n,
      response_format: 'b64_json'
    })
    
    return response.data.map(img => ({
      b64_json: img.b64_json!
    }))
  }
  
  async createVariations(params: z.infer<typeof imageVariationSchema>) {
    const validated = imageVariationSchema.parse(params)
    
    const response = await this.client.images.createVariation({
      model: 'dall-e-2',
      image: validated.image,
      size: validated.size as any,
      n: validated.n,
      response_format: 'b64_json'
    })
    
    return response.data.map(img => ({
      b64_json: img.b64_json!
    }))
  }
}
```

### Phase 2: Generation Tools

Create AI generation tools following existing patterns:

```typescript
// lib/ai/adapters/tools/generateImage.ts
import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import { FabricImage } from 'fabric'
import type { Canvas } from 'fabric'

const generateImageInputSchema = z.object({
  prompt: z.string().describe('Detailed description of the image to generate'),
  style: z.enum(['photorealistic', 'artistic', 'cartoon', 'abstract']).optional(),
  placement: z.enum(['center', 'fill', 'fit']).default('center')
})

export class GenerateImageAdapter extends BaseToolAdapter<
  z.infer<typeof generateImageInputSchema>,
  { success: boolean; imageId?: string; message: string }
> {
  tool = {} as Tool // Placeholder since this is AI-only
  aiName = 'generateImage'
  description = `Generate a new image from a text description. You MUST provide detailed, specific prompts.
Examples:
- "photorealistic golden retriever puppy playing in autumn leaves"
- "abstract geometric pattern with blue and purple gradients"
- "cartoon style robot chef cooking in a futuristic kitchen"
- "oil painting of a sunset over mountain landscape"
The more detailed your description, the better the result.`
  
  inputSchema = generateImageInputSchema
  
  async execute(params: z.infer<typeof generateImageInputSchema>, context: { canvas: Canvas }) {
    try {
      // Map style to DALL-E parameters
      const dalleParams = this.mapStyleToParams(params.style)
      
      // Call generation API
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          ...dalleParams
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Generation failed')
      }
      
      const { images } = await response.json()
      const imageData = images[0].b64_json
      
      // Add to canvas
      const imgUrl = `data:image/png;base64,${imageData}`
      const fabricImage = await FabricImage.fromURL(imgUrl)
      
      // Position based on placement
      this.positionImage(fabricImage, context.canvas, params.placement)
      
      // Add with command for undo
      const command = new AddObjectCommand(context.canvas, fabricImage)
      await useHistoryStore.getState().executeCommand(command)
      
      return {
        success: true,
        imageId: fabricImage.get('id') as string,
        message: 'Image generated successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate image'
      }
    }
  }
  
  private mapStyleToParams(style?: string) {
    switch (style) {
      case 'photorealistic':
        return { model: 'dall-e-3', style: 'natural', quality: 'hd' }
      case 'artistic':
        return { model: 'dall-e-3', style: 'vivid', quality: 'standard' }
      default:
        return { model: 'dall-e-3', style: 'natural', quality: 'standard' }
    }
  }
}
```

### Phase 3: Inpainting Tool

AI-powered image editing within selections:

```typescript
// lib/editor/tools/ai/inpaintingTool.ts
import { BaseTool } from '../base/BaseTool'
import { TOOL_IDS } from '@/constants'
import type { Canvas, TPointerEventInfo } from 'fabric'

class InpaintingTool extends BaseTool {
  id = TOOL_IDS.AI_INPAINT
  name = 'AI Inpaint'
  icon = 'Wand2'
  cursor = 'crosshair'
  category = 'ai'
  
  private isDrawing = false
  private maskCanvas: HTMLCanvasElement | null = null
  private maskCtx: CanvasRenderingContext2D | null = null
  
  protected setupTool(canvas: Canvas): void {
    // Create mask canvas overlay
    this.maskCanvas = document.createElement('canvas')
    this.maskCanvas.width = canvas.getWidth()
    this.maskCanvas.height = canvas.getHeight()
    this.maskCtx = this.maskCanvas.getContext('2d')!
    
    // Set up drawing
    this.maskCtx.fillStyle = 'rgba(255, 0, 0, 0.5)'
    this.maskCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    this.maskCtx.lineWidth = 20
    this.maskCtx.lineCap = 'round'
    
    // Add event handlers
    this.addCanvasEvent('mouse:down', this.startDrawing)
    this.addCanvasEvent('mouse:move', this.draw)
    this.addCanvasEvent('mouse:up', this.stopDrawing)
  }
  
  private startDrawing = (e: TPointerEventInfo<MouseEvent>) => {
    this.isDrawing = true
    const point = e.absolutePointer!
    this.maskCtx?.beginPath()
    this.maskCtx?.moveTo(point.x, point.y)
  }
  
  private draw = (e: TPointerEventInfo<MouseEvent>) => {
    if (!this.isDrawing) return
    
    const point = e.absolutePointer!
    this.maskCtx?.lineTo(point.x, point.y)
    this.maskCtx?.stroke()
    
    // Update visual feedback
    this.updateMaskOverlay()
  }
  
  private stopDrawing = async (e: TPointerEventInfo<MouseEvent>) => {
    if (!this.isDrawing) return
    this.isDrawing = false
    
    // Show prompt dialog
    const prompt = await this.showPromptDialog()
    if (!prompt) return
    
    // Generate mask and original image files
    const mask = await this.canvasToFile(this.maskCanvas!, 'mask.png')
    const original = await this.canvasToFile(this.canvas!.getElement(), 'original.png')
    
    // Call inpainting API
    await this.performInpainting(original, mask, prompt)
  }
  
  private async performInpainting(image: File, mask: File, prompt: string) {
    const formData = new FormData()
    formData.append('image', image)
    formData.append('mask', mask)
    formData.append('prompt', prompt)
    
    const response = await fetch('/api/ai/inpaint', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    // Apply result to canvas
    await this.applyInpaintingResult(result)
  }
}

export const inpaintingTool = new InpaintingTool()
```

### Phase 4: Generation UI Components

Create UI for generation features:

```typescript
// components/editor/AIGeneration/GenerationPanel.tsx
import { useState } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function GenerationPanel() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  
  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          n: 4 // Generate 4 variations
        })
      })
      
      const { images } = await response.json()
      setGeneratedImages(images)
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <div className="generation-panel">
      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="variations">Variations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <PromptInput
            value={prompt}
            onChange={setPrompt}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
          
          <GenerationSettings />
          
          <ImageGrid
            images={generatedImages}
            onSelect={(image) => addToCanvas(image)}
          />
        </TabsContent>
        
        <TabsContent value="edit">
          <InpaintingInterface />
        </TabsContent>
        
        <TabsContent value="variations">
          <VariationsInterface />
        </TabsContent>
        
        <TabsContent value="templates">
          <SmartTemplates />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Prompt enhancement with AI
function PromptInput({ value, onChange, onGenerate, isGenerating }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const enhancePrompt = async () => {
    const enhanced = await fetch('/api/ai/enhance-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: value })
    }).then(r => r.json())
    
    onChange(enhanced.prompt)
  }
  
  return (
    <div className="prompt-input">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe the image you want to generate..."
        rows={3}
      />
      
      <div className="prompt-actions">
        <button onClick={enhancePrompt}>✨ Enhance</button>
        <button onClick={() => setShowSuggestions(!showSuggestions)}>
          💡 Suggestions
        </button>
        <button 
          onClick={onGenerate}
          disabled={!value || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>
      
      {showSuggestions && <PromptSuggestions onSelect={onChange} />}
    </div>
  )
}
```

### Phase 5: Smart Templates

AI-powered design templates:

```typescript
// lib/ai/templates/SmartTemplates.ts
export interface SmartTemplate {
  id: string
  name: string
  category: string
  thumbnail: string
  
  // Template structure
  layout: TemplateLayout
  elements: TemplateElement[]
  
  // AI prompts for customization
  prompts: {
    background?: string
    mainImage?: string
    style?: string
  }
  
  // User inputs
  inputs: TemplateInput[]
}

export interface TemplateElement {
  type: 'text' | 'image' | 'shape' | 'ai-generated'
  position: { x: number; y: number }
  size: { width: number; height: number }
  
  // For AI-generated elements
  promptTemplate?: string // e.g., "Generate a ${style} image of ${subject}"
  regeneratable?: boolean
}

export class SmartTemplateEngine {
  async applyTemplate(
    template: SmartTemplate,
    inputs: Record<string, any>,
    canvas: Canvas
  ): Promise<void> {
    // Clear canvas
    canvas.clear()
    
    // Apply layout
    canvas.setDimensions({
      width: template.layout.width,
      height: template.layout.height
    })
    
    // Process each element
    for (const element of template.elements) {
      if (element.type === 'ai-generated') {
        // Generate AI content
        const prompt = this.interpolatePrompt(element.promptTemplate!, inputs)
        const image = await this.generateImage(prompt)
        this.addToCanvas(canvas, image, element)
      } else {
        // Add regular element
        this.addElement(canvas, element, inputs)
      }
    }
  }
  
  private interpolatePrompt(template: string, inputs: Record<string, any>): string {
    return template.replace(/\${(\w+)}/g, (_, key) => inputs[key] || '')
  }
}

// Example templates
export const templates: SmartTemplate[] = [
  {
    id: 'social-media-post',
    name: 'Social Media Post',
    category: 'Marketing',
    layout: { width: 1080, height: 1080 },
    elements: [
      {
        type: 'ai-generated',
        position: { x: 0, y: 0 },
        size: { width: 1080, height: 1080 },
        promptTemplate: 'Generate a ${style} background with ${mood} mood'
      },
      {
        type: 'text',
        position: { x: 100, y: 100 },
        size: { width: 880, height: 200 },
        content: '${headline}'
      }
    ],
    inputs: [
      { id: 'style', type: 'select', options: ['abstract', 'gradient', 'pattern'] },
      { id: 'mood', type: 'select', options: ['energetic', 'calm', 'professional'] },
      { id: 'headline', type: 'text', placeholder: 'Enter your headline' }
    ]
  }
]
```

## Implementation Plan

### Week 1: OpenAI Integration
- [ ] Set up OpenAI client with proper error handling
- [ ] Create API routes for generation endpoints
- [ ] Implement rate limiting and cost tracking
- [ ] Add API key management (self-hosted)

### Week 2: Generation Tools
- [ ] Create generation tool adapter
- [ ] Implement inpainting tool
- [ ] Add variation generation
- [ ] Build edit mode with masking

### Week 3: UI Components
- [ ] Generation panel with tabs
- [ ] Prompt input with enhancement
- [ ] Image grid with previews
- [ ] Integration with canvas

### Week 4: Smart Features
- [ ] Prompt suggestion system
- [ ] Smart templates engine
- [ ] Style presets
- [ ] Batch generation

### Week 5: Polish & Optimization
- [ ] Caching generated images
- [ ] Progress indicators
- [ ] Error handling UI
- [ ] Cost estimation display

## API Routes

```typescript
// app/api/ai/generate-image/route.ts
export async function POST(request: Request) {
  const body = await request.json()
  
  // Validate user permissions and quotas
  const user = await getUser()
  if (!user) return unauthorized()
  
  const quota = await checkQuota(user.id, 'image-generation')
  if (!quota.allowed) return quotaExceeded()
  
  try {
    // Use configured provider (OpenAI for cloud, user's key for self-hosted)
    const provider = await getImageProvider()
    const results = await provider.generateImage(body)
    
    // Track usage
    await trackUsage(user.id, 'image-generation', results.length)
    
    return NextResponse.json({ images: results })
  } catch (error) {
    return handleError(error)
  }
}
```

## Testing Strategy

1. **Generation Quality**
   - Prompt enhancement accuracy
   - Style consistency
   - Error message clarity

2. **Performance**
   - Generation speed
   - Canvas integration
   - Memory usage with large images

3. **Cost Management**
   - Quota enforcement
   - Usage tracking
   - Cost estimation accuracy

## Deployment Considerations

### Self-Hosted
- User provides OpenAI API key
- No quotas or limits
- Direct API access
- Cost management by user

### Cloud Version
- Managed API keys
- Usage quotas by plan
- Cached generations
- Cost included in subscription

## Success Metrics
- < 10s generation time
- 95% prompt success rate
- < $0.10 average cost per generation
- 80% user satisfaction with results

## Risks & Mitigations
1. **API costs** → Caching, quotas, efficient prompts
2. **Content policy** → Pre-validation, user education
3. **Quality variance** → Prompt enhancement, templates
4. **Rate limits** → Queue system, retry logic

---

**Status**: 📋 Planned
**Estimated Duration**: 5 weeks
**Dependencies**: None (integrates with existing AI system) 