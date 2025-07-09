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
  private statusUpdates: Array<{
    type: string
    message: string
    details?: string
    timestamp: string
  }> = []

  async execute(request: string): Promise<AgentResult> {
    try {
      // Clear previous status updates
      this.statusUpdates = []
      
      // Step 1: Generate detailed plan using AI SDK v5 generateObject
      this.addStatusUpdate('planning-steps', 'Generating detailed workflow plan', 
        `Analyzing request: "${request}"`)
      
      const plan = await this.generatePlan(request)
      this.planObject = plan
      
      this.addStatusUpdate('planning-steps', 'Plan generated successfully', 
        `Generated ${plan.steps.length} steps with ${plan.overallComplexity} complexity\nOverall confidence: ${Math.round(plan.overallConfidence * 100)}%`)
      
      // Step 2: Build system prompt for execution
      const systemPrompt = this.buildSequentialSystemPrompt(request, plan)
      
      // Step 3: Execute using BaseExecutionAgent's AI SDK v5 pattern
      this.addStatusUpdate('executing-tool', 'Starting workflow execution', 
        `Executing ${plan.steps.length} steps using AI SDK v5 patterns`)
      
      const result = await this.executeWithAISDK(request, systemPrompt)
      
      // Step 4: Attach workflow information and status updates to result
      if (result.results.length > 0) {
        const firstResult = result.results[0]
        const existingStatusUpdates = (firstResult.data as { statusUpdates?: Array<{
          type: string
          message: string
          details?: string
          timestamp: string
        }> })?.statusUpdates || []
        
        firstResult.data = {
          ...(firstResult.data as Record<string, unknown>),
          // Add workflow information for UI display
          workflow: {
            description: `Sequential workflow: ${request}`,
            steps: plan.steps.map(step => ({
              id: step.id,
              toolName: step.tool,
              params: step.params,
              description: step.description,
              confidence: step.estimatedConfidence
            })),
            agentType: 'sequential-editing',
            totalSteps: plan.steps.length,
            reasoning: plan.reasoning,
            overallComplexity: plan.overallComplexity,
            riskAssessment: plan.riskAssessment,
            overallConfidence: plan.overallConfidence
          },
          statusUpdates: [...existingStatusUpdates, ...this.statusUpdates]
        }
      }
      
      this.addStatusUpdate('generating-response', 'Workflow execution complete', 
        `Completed ${result.results.length} results with success: ${result.completed}`)
      
      return result
    } catch (error) {
      this.addStatusUpdate('generating-response', 'Error in workflow execution', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      console.error('[SequentialEditingAgent] Error in execute:', error)
      
      // Re-throw ApprovalRequiredError so it can be handled by the chat route
      if (error instanceof Error && error.name === 'ApprovalRequiredError') {
        // Attach status updates to the error context if possible
                 if ('workflowContext' in error) {
                       const errorWithContext = error as Error & { workflowContext?: { statusUpdates?: Array<{
              type: string
              message: string
              details?: string
              timestamp: string
            }> } }
           errorWithContext.workflowContext = {
             ...errorWithContext.workflowContext,
             statusUpdates: this.statusUpdates
           }
         }
        throw error
      }
      
      return {
        completed: false,
        results: [{
          success: false,
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            statusUpdates: this.statusUpdates
          },
          confidence: 0
        }],
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Helper method to add status updates with timestamps
  private addStatusUpdate(type: string, message: string, details?: string): void {
    this.statusUpdates.push({
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    })
    console.log(`[SequentialEditingAgent] ${type}: ${message}${details ? ` - ${details}` : ''}`)
  }

  // Generate detailed plan using AI SDK v5 generateObject
  private async generatePlan(request: string): Promise<z.infer<typeof planSchema>> {
    await this.analyzeCanvas()
    
    // Only use canvas-editing tools in workflows - exclude AI-native tools
    const availableTools = adapterRegistry.getCanvasEditingTools().map(a => ({
      name: a.aiName,
      description: a.description
    }))
    
    this.addStatusUpdate('planning-steps', 'Analyzing available canvas-editing tools', 
      `Found ${availableTools.length} canvas-editing tools (excluding AI-native tools)`)
    
    const { object: plan } = await generateObject({
      model: openai('gpt-4o'),
      schema: planSchema,
      prompt: `Create a detailed step-by-step plan for: "${request}"

Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}
- Object count: ${this.context.canvasAnalysis.objectCount}

Available canvas-editing tools (AI-native tools excluded from workflows):
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

IMPORTANT: This is a canvas-editing workflow. DO NOT use AI-native tools like generateImage, upscaleImage, etc.
Only use fast, local canvas-editing tools that modify existing images.

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
    
    this.addStatusUpdate('planning-steps', 'Plan analysis complete', 
      `Steps planned: ${plan.steps.map(s => s.tool).join(' → ')}\nComplexity: ${plan.overallComplexity}\nConfidence: ${Math.round(plan.overallConfidence * 100)}%`)
    
    console.log('[SequentialEditingAgent] Generated plan:', plan)
    return plan
  }

  // Build system prompt for AI SDK v5 execution
  private buildSequentialSystemPrompt(request: string, plan: z.infer<typeof planSchema>): string {
    const availableTools = Array.from(adapterRegistry.getAll()).map(a => ({
      name: a.aiName,
      description: a.description
    }))
    
    this.addStatusUpdate('planning-steps', 'Building execution strategy', 
      `Creating system prompt for ${plan.steps.length} planned steps`)
    
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
        this.addStatusUpdate('executing-tool', `Confidence calculated for ${toolCall.toolName}`, 
          `Plan confidence: ${Math.round(planStep.estimatedConfidence * 100)}%`)
        return planStep.estimatedConfidence
      }
    }
    
    // Fall back to default confidence calculation
    const defaultConfidence = super.calculateStepConfidence(toolCall, toolResult)
    this.addStatusUpdate('executing-tool', `Default confidence calculated for ${toolCall.toolName}`, 
      `Confidence: ${Math.round(defaultConfidence * 100)}%`)
    return defaultConfidence
  }

  // Override approval logic to consider plan confidence
  protected shouldRequestApproval(result: StepResult): boolean {
    // If we have plan data, use it for approval decisions
    if (this.planObject && result.data && typeof result.data === 'object' && 'toolName' in result.data) {
      const toolName = (result.data as { toolName: string }).toolName
      const planStep = this.planObject.steps.find(s => s.tool === toolName)
      
      if (planStep) {
        // Use plan-based confidence for approval decision
        const needsApproval = planStep.estimatedConfidence < this.context.userPreferences.autoApprovalThreshold
        this.addStatusUpdate('executing-tool', `Approval check for ${toolName}`, 
          `Confidence: ${Math.round(planStep.estimatedConfidence * 100)}%, Threshold: ${Math.round(this.context.userPreferences.autoApprovalThreshold * 100)}%, Needs approval: ${needsApproval}`)
        return needsApproval
      }
    }
    
    // Fall back to default approval logic
    const needsApproval = super.shouldRequestApproval(result)
    this.addStatusUpdate('executing-tool', 'Default approval check', 
      `Needs approval: ${needsApproval}`)
    return needsApproval
  }

  // Simple evaluation of completed steps
  private async evaluateSteps(stepResults: unknown[]): Promise<{
    avgConfidence: number
    suggestions: string[]
    quality: 'excellent' | 'good' | 'fair' | 'poor'
  }> {
    // Calculate average confidence from step results
    const validResults = stepResults.filter(result => 
      result && typeof result === 'object' && 'confidence' in result
    ) as Array<{ confidence: number }>
    
    const avgConfidence = validResults.length > 0 
      ? validResults.reduce((sum, result) => sum + result.confidence, 0) / validResults.length
      : 0.5
    
    // Generate suggestions based on request and results
    const suggestions: string[] = []
    let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good'
    
    if (avgConfidence < 0.4) {
      quality = 'poor'
      suggestions.push('Consider using different tools or parameters')
      suggestions.push('Review the original request for clarity')
    } else if (avgConfidence < 0.6) {
      quality = 'fair'
      suggestions.push('Consider using higher quality settings')
      suggestions.push('Some operations may need manual adjustment')
    } else if (avgConfidence < 0.8) {
      quality = 'good'
      suggestions.push('Results look good, minor adjustments possible')
    } else {
      quality = 'excellent'
      suggestions.push('High quality results achieved')
    }
    
    this.addStatusUpdate('evaluating-result', 'Workflow evaluation complete', 
      `Quality: ${quality}, Average confidence: ${Math.round(avgConfidence * 100)}%`)
    
    return {
      avgConfidence,
      suggestions,
      quality
    }
  }
} 