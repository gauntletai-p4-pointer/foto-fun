import { BaseExecutionAgent } from './BaseExecutionAgent'
import type { StepResult, AgentResult } from './types'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { adapterRegistry } from '@/lib/ai/adapters/registry'

// Plan schema for sequential workflow planning
const planSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    tool: z.string(),
    description: z.string(),
    params: z.record(z.unknown()),
    dependencies: z.array(z.string()).optional(),
    estimatedConfidence: z.number().min(0).max(1),
    confidenceFactors: z.object({
      parameterAppropriate: z.number().min(0).max(1),
      canvasContext: z.number().min(0).max(1),
      toolSuitability: z.number().min(0).max(1),
      riskLevel: z.number().min(0).max(1)
    })
  })),
  reasoning: z.string(),
  overallComplexity: z.enum(['low', 'medium', 'high']),
  riskAssessment: z.string(),
  overallConfidence: z.number().min(0).max(1)
})

export class SequentialEditingAgent extends BaseExecutionAgent {
  name = 'sequential-editor'
  description = 'Executes editing operations in planned sequence with workflow-level approval'
  
  private planObject: z.infer<typeof planSchema> | null = null

  async execute(request: string): Promise<AgentResult> {
    try {
      // Step 1: Generate detailed plan using AI SDK v5 generateObject
      const plan = await this.generatePlan(request)
      this.planObject = plan
      
      // Step 2: Build system prompt for execution
      const systemPrompt = this.buildSequentialSystemPrompt(request, plan)
      
      // Step 3: Execute using BaseExecutionAgent's AI SDK v5 pattern
      // This will handle workflow-level approval automatically
      const result = await this.executeWithAISDK(request, systemPrompt)
      
      return result
    } catch (error) {
      console.error('[SequentialEditingAgent] Error in execute:', error)
      
      // Re-throw ApprovalRequiredError so it can be handled by the chat route
      if (error instanceof Error && error.name === 'ApprovalRequiredError') {
        throw error
      }
      
      return {
        completed: false,
        results: [],
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Generate detailed plan using AI SDK v5 generateObject
  private async generatePlan(request: string): Promise<z.infer<typeof planSchema>> {
    await this.analyzeCanvas()
    
    const availableTools = Array.from(adapterRegistry.getAll()).map(a => ({
      name: a.aiName,
      description: a.description
    }))
    
    const { object: plan } = await generateObject({
      model: openai('gpt-4o'),
      schema: planSchema,
      prompt: `Create a detailed step-by-step plan for: "${request}"

Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}
- Object count: ${this.context.canvasAnalysis.objectCount}

Available tools:
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

PLANNING REQUIREMENTS:
1. Create specific, executable steps with exact parameters
2. Consider dependencies between steps
3. Calculate confidence for each step based on 4 factors:
   - Parameter Appropriateness: Are values reasonable and safe?
   - Canvas Context: Does canvas state support this operation?
   - Tool Suitability: Is this the optimal tool for the effect?
   - Risk Level: How likely is this to produce intended result?

PARAMETER GUIDELINES:
- brightness/contrast/saturation: -100 to 100
- crop: exact pixel coordinates within canvas bounds
- blur/sharpen: radius 0 to 50
- rotate: degrees (90, 180, 270 for common rotations)

CONFIDENCE CALCULATION:
- Calculate estimatedConfidence as weighted average of the 4 factors
- Be conservative: lower confidence for experimental operations
- Higher confidence for well-tested, safe operations

Provide a complete plan with reasoning and risk assessment.`
    })
    
    console.log('[SequentialEditingAgent] Generated plan:', plan)
    return plan
  }

  // Build system prompt for AI SDK v5 execution
  private buildSequentialSystemPrompt(request: string, plan: z.infer<typeof planSchema>): string {
    const availableTools = Array.from(adapterRegistry.getAll()).map(a => ({
      name: a.aiName,
      description: a.description
    }))
    
    return `You are a Sequential Editing Agent executing a planned photo editing workflow.

Original request: "${request}"

EXECUTION PLAN:
${plan.steps.map((step, index) => `
${index + 1}. ${step.description}
   - Tool: ${step.tool}
   - Parameters: ${JSON.stringify(step.params)}
   - Confidence: ${step.estimatedConfidence}
   - Dependencies: ${step.dependencies?.join(', ') || 'none'}
`).join('')}

PLAN REASONING: ${plan.reasoning}
OVERALL COMPLEXITY: ${plan.overallComplexity}
RISK ASSESSMENT: ${plan.riskAssessment}

EXECUTION STRATEGY:
1. Execute each step in sequence using the planned parameters
2. Maintain canvas context between steps
3. Handle dependencies properly
4. Monitor confidence levels

Available tools:
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Execute the planned workflow step by step. Use the exact parameters from the plan unless you detect an issue that requires adjustment.`
  }

  // Override confidence calculation to use plan-based confidence
  protected calculateStepConfidence(
    toolCall: { toolCallId: string; toolName: string; input: unknown },
    toolResult: { toolCallId: string; output: unknown; error?: unknown; confidence?: number }
  ): number {
    // If we have a plan, use the estimated confidence from planning
    if (this.planObject) {
      const planStep = this.planObject.steps.find(s => s.tool === toolCall.toolName)
      if (planStep) {
        return planStep.estimatedConfidence
      }
    }
    
    // Fall back to default confidence calculation
    return super.calculateStepConfidence(toolCall, toolResult)
  }

  // Override approval logic to consider plan confidence
  protected shouldRequestApproval(result: StepResult): boolean {
    // If we have plan data, use it for approval decisions
    if (this.planObject && result.data && typeof result.data === 'object' && 'toolName' in result.data) {
      const toolName = (result.data as { toolName: string }).toolName
      const planStep = this.planObject.steps.find(s => s.tool === toolName)
      
      if (planStep) {
        // Use plan-based confidence for approval decision
        return planStep.estimatedConfidence < this.context.userPreferences.autoApprovalThreshold
      }
    }
    
    // Fall back to default approval logic
    return super.shouldRequestApproval(result)
  }

  // Simple evaluation of completed steps
  private async evaluateSteps(stepResults: unknown[], originalRequest: string) {
    // Calculate average confidence from step results
    const validResults = stepResults.filter(result => 
      result && typeof result === 'object' && 'confidence' in result
    ) as Array<{ confidence: number }>
    
    const avgConfidence = validResults.length > 0 
      ? validResults.reduce((sum, result) => sum + result.confidence, 0) / validResults.length
      : 0.5
    
    // Generate suggestions based on request and results
    const suggestions: string[] = []
    if (avgConfidence < 0.6) {
      suggestions.push('Consider using higher quality settings')
    }
    if (originalRequest.includes('professional') && avgConfidence < 0.8) {
      suggestions.push('Professional requests may need manual review')
    }
    if (stepResults.length > 5) {
      suggestions.push('Complex workflows may benefit from step-by-step review')
    }
    
    return {
      overallConfidence: avgConfidence,
      suggestions
    }
  }
} 