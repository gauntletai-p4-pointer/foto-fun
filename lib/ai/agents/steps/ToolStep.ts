import type { AgentStep, AgentContext, StepResult } from '../types'
import { adapterRegistry } from '@/lib/ai/adapters/registry'

export interface ToolStepConfig {
  id: string
  tool: string
  params: Record<string, unknown>
  description: string
}

export class ToolStep implements AgentStep {
  id: string
  type = 'tool' as const
  description: string
  private toolName: string
  private params: Record<string, unknown>
  
  constructor(config: ToolStepConfig) {
    this.id = config.id
    this.toolName = config.tool
    this.params = config.params
    this.description = config.description
  }
  
  get tool(): string {
    return this.toolName
  }
  
  async execute(context: AgentContext): Promise<StepResult> {
    try {
      // Get the tool adapter to validate it exists
      const adapter = adapterRegistry.get(this.toolName)
      if (!adapter) {
        throw new Error(`Tool not found: ${this.toolName}`)
      }
      
      // Calculate AI-driven confidence based on context
      const confidence = await this.calculateConfidence(context)
      
      // Instead of executing, return the tool information for client-side execution
      return {
        success: true,
        data: {
          toolName: this.toolName,
          params: this.params,
          description: this.description
        },
        confidence,
        alternatives: [] // No alternatives for now
      }
    } catch (error) {
      console.error(`Error preparing tool ${this.toolName}:`, error)
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        confidence: 0
      }
    }
  }
  
  private async calculateConfidence(context: AgentContext): Promise<number> {
    try {
      // Use AI to calculate confidence based on multiple factors
      const { generateObject } = await import('ai')
      const { openai } = await import('@/lib/ai/providers')
      const { z } = await import('zod')
      
      const confidenceSchema = z.object({
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
        factors: z.object({
          parameterAppropriate: z.number().min(0).max(1),
          canvasContext: z.number().min(0).max(1),
          toolSuitability: z.number().min(0).max(1),
          riskLevel: z.number().min(0).max(1)
        })
      })
      
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: confidenceSchema,
        prompt: `Evaluate confidence for this photo editing operation:

Tool: ${this.toolName}
Description: ${this.description}
Parameters: ${JSON.stringify(this.params, null, 2)}

Canvas Context:
- Dimensions: ${context.canvasAnalysis.dimensions.width}x${context.canvasAnalysis.dimensions.height}px
- Has content: ${context.canvasAnalysis.hasContent}
- Object count: ${context.canvasAnalysis.objectCount}

Evaluate confidence (0.0-1.0) based on:

1. Parameter Appropriateness (0.0-1.0):
   - Are the parameter values reasonable for this tool?
   - Example: brightness: 50 = good (0.9), brightness: 500 = bad (0.2)

2. Canvas Context Suitability (0.0-1.0):
   - Does the canvas state make sense for this operation?
   - Example: crop on empty canvas = bad (0.1), brightness on image = good (0.9)

3. Tool Suitability (0.0-1.0):
   - Is this the right tool for the intended effect?
   - Example: using blur for "make sharper" = bad (0.2)

4. Risk Level (0.0-1.0):
   - How likely is this to produce the intended result?
   - Conservative operations = high confidence, extreme operations = low confidence

Return overall confidence as weighted average and explain reasoning.`
      })
      
      console.log(`[ToolStep] AI-calculated confidence for ${this.toolName}:`, object)
      
      return object.confidence
    } catch (error) {
      console.error(`Error calculating confidence for ${this.toolName}:`, error)
      // Fallback to medium confidence if AI calculation fails
      return 0.7
    }
  }
  
  canRevert = true
  
  requiresApproval(result: StepResult, context?: AgentContext): boolean {
    // Use user's threshold setting instead of hard-coded value
    const threshold = context?.userPreferences?.autoApprovalThreshold ?? 0.7
    return result.confidence < threshold
  }
} 