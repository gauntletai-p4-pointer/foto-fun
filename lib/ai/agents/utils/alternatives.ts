import type { AgentContext, Alternative } from '../types'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { AdapterRegistry } from '@/lib/ai/adapters/base/AdapterRegistry'
import { CanvasToolBridge } from '@/lib/ai/tools/canvas-bridge'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

// Schema for generating alternatives
const AlternativesSchema = z.object({
  alternatives: z.array(z.object({
    description: z.string(),
    params: z.record(z.any()),
    reasoning: z.string()
  })).max(3)
})

/**
 * Capture the current canvas state as a base64 image
 */
async function captureCanvasState(canvas: CanvasManager): Promise<string> {
  const blob = await canvas.exportImage('png')
  const reader = new FileReader()
  
  return new Promise((resolve) => {
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Generate alternative parameters for a tool
 */
export async function generateAlternatives(
  toolName: string,
  originalParams: Record<string, unknown>,
  context: AgentContext,
  adapterRegistry: AdapterRegistry
): Promise<Alternative[]> {
  try {
    // Get the adapter to understand the tool better
    const adapter = await adapterRegistry.getAdapterByAiName(toolName)
    if (!adapter) return []
    
    // Handle stub adapter that may not have description property
    const description = adapter && typeof adapter === 'object' && 'description' in adapter 
      ? adapter.description 
      : `Tool: ${toolName}`;
    
    // Generate alternatives using AI
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: AlternativesSchema,
      prompt: `Generate 2-3 alternative parameter sets for the ${toolName} tool.
      
      Original parameters: ${JSON.stringify(originalParams, null, 2)}
      Tool description: ${adapter.description}
      
      Canvas state:
      - Dimensions: ${context.canvasAnalysis.dimensions.width}x${context.canvasAnalysis.dimensions.height}
      - Has content: ${context.canvasAnalysis.hasContent}
      
      Generate variations that might better match user intent. For example:
      - If brightness +20, alternatives might be +10 (subtle) or +30 (stronger)
      - If crop 10% edges, alternatives might be 5% (minimal) or 15% (aggressive)
      
      Each alternative should have a clear description and reasoning.`
    })
    
    if (!object || !object.alternatives) return []
    
    // Convert to Alternative objects with confidence scores
    const alternatives: Alternative[] = []
    
    for (const alt of object.alternatives) {
      // Save current canvas state
      const currentState = await captureCanvasState(context.canvas)
      
      // Execute the alternative to generate preview
      const canvasContext = CanvasToolBridge.getCanvasContext()
      if (!canvasContext) {
        console.warn('Canvas context not available for alternative generation')
        continue
      }
      
      await adapter.execute(alt.params, canvasContext)
      const afterState = await captureCanvasState(context.canvas)
      
      // Restore canvas to original state
      // This is simplified - in real implementation, use checkpoint/restore
      
      alternatives.push({
        id: `alt-${Date.now()}-${alternatives.length}`,
        description: alt.description,
        params: alt.params,
        preview: {
          before: currentState,
          after: afterState
        },
        confidence: 0.7 + (Math.random() * 0.2) // Mock confidence 0.7-0.9
      })
    }
    
    return alternatives
  } catch (error) {
    console.error('Error generating alternatives:', error)
    return []
  }
} 