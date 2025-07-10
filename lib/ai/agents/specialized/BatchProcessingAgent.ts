import { openai } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import type { AgentContext, AgentResult } from '../types'

interface BatchImage {
  id: string
  data: string // base64 or URL
  metadata?: Record<string, unknown>
}

interface BatchContext extends AgentContext {
  images: BatchImage[]
  options: {
    allowParallel?: boolean
    parallelLimit?: number
    preserveOriginals?: boolean
  }
}

interface ImageResult {
  imageId: string
  success: boolean
  adjustments?: Array<{ tool: string; params: unknown }>
  error?: string
  processingTime: number
}

/**
 * Batch Processing Agent using Orchestrator-Worker Pattern from AI SDK v5
 * Processes multiple images with consistent parameters
 */
export class BatchProcessingAgent {
  name = 'batch-processing'
  description = 'Processes multiple images with consistent parameters using orchestrator-worker pattern'
  
  async execute(request: string, context: BatchContext): Promise<AgentResult> {
    const startTime = Date.now()
    
    try {
      // Step 1: Orchestrator analyzes the batch
      const { object: batchPlan } = await generateObject({
        model: openai('gpt-4o'),
        schema: z.object({
          commonCharacteristics: z.array(z.string()).describe('Common traits across images'),
          suggestedWorkflow: z.array(z.object({
            tool: z.string(),
            params: z.any(),
            applyToAll: z.boolean()
          })).describe('Tools and parameters to apply'),
          processingStrategy: z.enum(['parallel', 'sequential']),
          estimatedTimePerImage: z.number().describe('Estimated ms per image')
        }),
        system: 'You are analyzing a batch of images to determine optimal processing strategy.',
        prompt: `Analyze these ${context.images.length} images and create a processing plan for: ${request}
        
        Consider:
        - Common characteristics that need adjustment
        - Whether to process in parallel or sequential
        - Consistent parameters across all images
        - User's specific request`
      })
      
      // Step 2: Process images using workers
      const results = await this.processImages(
        context.images,
        batchPlan,
        context.options
      )
      
      // Step 3: Generate summary
      const summary = await this.generateSummary(results, batchPlan)
      
      return {
        completed: true,
        results: [{
          success: true,
          data: {
            plan: batchPlan,
            imageResults: results,
            summary,
            totalImages: context.images.length,
            successfulImages: results.filter(r => r.success).length,
            totalTime: Date.now() - startTime
          },
          confidence: 0.9
        }],
        reason: summary
      }
    } catch (error) {
      return {
        completed: false,
        results: [],
        reason: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
  
  private async processImages(
    images: BatchImage[],
    plan: z.infer<typeof this.getBatchPlanSchema>,
    options: BatchContext['options']
  ): Promise<ImageResult[]> {
    const { processingStrategy, suggestedWorkflow } = plan
    
    if (processingStrategy === 'parallel' && options.allowParallel !== false) {
      // Process in parallel chunks
      const chunkSize = options.parallelLimit || 5
      const chunks = this.chunkArray(images, chunkSize)
      
      const results: ImageResult[] = []
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(img => this.processImage(img, suggestedWorkflow))
        )
        results.push(...chunkResults)
      }
      
      return results
    } else {
      // Sequential processing
      const results: ImageResult[] = []
      for (const image of images) {
        const result = await this.processImage(image, suggestedWorkflow)
        results.push(result)
      }
      
      return results
    }
  }
  
  private async processImage(
    image: BatchImage,
    workflow: Array<{ tool: string; params?: unknown; applyToAll: boolean }>
  ): Promise<ImageResult> {
    const startTime = Date.now()
    
    try {
      // Load image to canvas
      const { ServiceContainer } = await import('@/lib/core/ServiceContainer')
      const { adapterRegistry } = await import('@/lib/ai/adapters/registry')
      const container = ServiceContainer.getInstance()
      const canvas = container.get('CanvasManager')
      
      if (!canvas) {
        throw new Error('No canvas available')
      }
      
      // Apply each tool in the workflow
      const adjustments = []
      for (const step of workflow) {
        if (!step.applyToAll) continue
        
        const adapter = adapterRegistry.get(step.tool)
        if (adapter) {
          const targetImages = canvas.state.layers
            .flatMap(layer => layer.objects)
            .filter(obj => obj.type === 'image')
          
          await adapter.execute(step.params, {
            canvas,
            targetImages,
            targetingMode: 'selection'
          })
          
          adjustments.push({ tool: step.tool, params: step.params })
        }
      }
      
      return {
        imageId: image.id,
        success: true,
        adjustments,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        imageId: image.id,
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        processingTime: Date.now() - startTime
      }
    }
  }
  
  private async generateSummary(
    results: ImageResult[],
    plan: z.infer<typeof this.getBatchPlanSchema>
  ): Promise<string> {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: 'You are summarizing batch image processing results.',
      prompt: `Summarize the batch processing results:
      
      Total images: ${results.length}
      Successful: ${results.filter(r => r.success).length}
      Failed: ${results.filter(r => !r.success).length}
      
      Processing strategy: ${plan.processingStrategy}
      Tools applied: ${plan.suggestedWorkflow.map(w => w.tool).join(', ')}
      
      Average processing time: ${Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length)}ms
      
      Provide a concise summary of what was accomplished.`
    })
    
    return text
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
  
  private getBatchPlanSchema = z.object({
    commonCharacteristics: z.array(z.string()),
    suggestedWorkflow: z.array(z.object({
      tool: z.string(),
      params: z.any(),
      applyToAll: z.boolean()
    })),
    processingStrategy: z.enum(['parallel', 'sequential']),
    estimatedTimePerImage: z.number()
  })
} 