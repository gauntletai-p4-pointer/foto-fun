import { BaseAgent } from './BaseAgent'
import type { AgentStep, StepResult, AgentResult, AgentContext, AgentStatus } from './types'
import { ApprovalRequiredError } from './types'
import { ToolStep } from './steps/ToolStep'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { adapterRegistry } from '@/lib/ai/adapters/registry'

const planSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    tool: z.string(),
    description: z.string(),
    params: z.any(),
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
  riskAssessment: z.string()
})

export class SequentialEditingAgent extends BaseAgent {
  private planObject: z.infer<typeof planSchema> | null = null // Store the plan object for workflow context
  
  async execute(request: string): Promise<AgentResult> {
    try {
      // Analyze canvas before starting
      await this.analyzeCanvas()
      
      // Generate steps for the request
      const steps = await this.generateSteps(request)
      
      // Execute steps sequentially
      const results: StepResult[] = []
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        console.log(`[SequentialEditingAgent] Executing step: ${step.description}`)
        
        try {
          // Execute the step using BaseAgent's executeStep method which handles approval
          const result = await this.executeStep(step)
          results.push(result)
          
          if (!result.success) {
            return {
              completed: false,
              results,
              reason: `Step failed: ${step.description}`
            }
          }
          
          // Check if we should stop
          if (this.shouldStop()) {
            return {
              completed: false,
              results,
              reason: 'Maximum steps reached'
            }
          }
        } catch (error) {
          if (error instanceof ApprovalRequiredError) {
            // Add workflow context to the existing error instead of creating a new one
            error.workflowContext = {
              allSteps: steps,
              currentStepIndex: i,
              statusUpdates: this.generateStatusUpdates(steps, i, request),
              reasoning: this.planObject?.reasoning || `Sequential workflow for: ${request}`,
              agentType: 'sequential-editing'
            }
            
            console.log(`[SequentialEditingAgent] Enhanced approval error with workflow context:`, {
              hasWorkflowContext: !!error.workflowContext,
              allStepsCount: error.workflowContext?.allSteps.length,
              currentStepIndex: error.workflowContext?.currentStepIndex,
              agentType: error.workflowContext?.agentType
            })
            
            // Re-throw the enhanced error
            throw error
          }
          // Re-throw other errors
          throw error
        }
      }
      
      return {
        completed: true,
        results
      }
    } catch (error) {
      // If it's an ApprovalRequiredError, re-throw it as-is
      if (error instanceof ApprovalRequiredError) {
        throw error
      }
      
      return {
        completed: false,
        results: [],
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  private generateStatusUpdates(steps: AgentStep[], currentIndex: number, request: string): AgentStatus[] {
    const statusUpdates: AgentStatus[] = [
      {
        type: 'routing-decision',
        message: 'Selected Sequential Editing Agent',
        details: `Analyzed request: "${request}" and determined sequential processing is optimal`,
        timestamp: new Date().toISOString()
      },
      {
        type: 'planning-steps',
        message: `Planned ${steps.length} steps`,
        details: this.planObject?.reasoning || `Generated ${steps.length} sequential steps`,
        timestamp: new Date().toISOString()
      }
    ]
    
    // Add status for each step
    steps.forEach((step, index) => {
      if (index <= currentIndex) {
        statusUpdates.push({
          type: 'executing-tool',
          message: `${index < currentIndex ? 'Completed' : 'Executing'}: ${step.description}`,
          details: `Tool: ${(step as ToolStep).tool || 'unknown'}`,
          timestamp: new Date().toISOString(),
          toolName: (step as ToolStep).tool
        })
      }
    })
    
    return statusUpdates
  }
  
  async generateSteps(request: string): Promise<AgentStep[]> {
    const availableTools = Array.from(adapterRegistry.getAll()).map(a => ({
      name: a.aiName,
      description: a.description
    }))
    
    // Use AI to generate a plan
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: planSchema,
      prompt: `Create a step-by-step plan to: ${request}
      
Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}

Available tools:
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Create a plan with specific parameters for each tool. Be precise with values.
For example:
- brightness: use values between -100 and 100
- contrast: use values between -100 and 100
- saturation: use values between -100 and 100
- crop: use exact pixel coordinates
- blur: use radius values between 0 and 50

For EACH STEP, calculate confidence (0.0-1.0) based on:

1. Parameter Appropriateness (0.0-1.0):
   - Are the parameter values reasonable and safe?
   - Conservative values = higher confidence
   - Extreme values = lower confidence

2. Canvas Context Suitability (0.0-1.0):
   - Does the canvas state support this operation?
   - Operating on existing content = higher confidence
   - Operating on empty canvas = lower confidence (where applicable)

3. Tool Suitability (0.0-1.0):
   - Is this the optimal tool for the intended effect?
   - Direct tool match = higher confidence
   - Indirect/creative use = lower confidence

4. Risk Level (0.0-1.0):
   - How likely is this to produce the intended result?
   - Well-tested operations = higher confidence
   - Complex/experimental operations = lower confidence

Calculate estimatedConfidence as weighted average of these factors.
Also assess overall workflow complexity and risk.

Return a detailed plan with confidence analysis for each step.`
    })
    
    console.log('[SequentialEditingAgent] Generated plan:', object)
    
    // Store the plan object for workflow context
    this.planObject = object
    
    // Convert plan to executable steps
    return object.steps.map((step, index) => {
      const toolStep = new ToolStep({
        id: `step-${index}`,
        tool: step.tool,
        params: step.params,
        description: step.description
      })
      
      // Override requiresApproval based on estimated confidence
      const originalRequiresApproval = toolStep.requiresApproval.bind(toolStep)
      toolStep.requiresApproval = (result: StepResult, context?: AgentContext) => {
        // Use the AI-estimated confidence from planning phase
        // If planning confidence is low, require approval regardless of execution confidence
        if (step.estimatedConfidence < 0.7) {
          return true
        }
        // Otherwise use the execution-time confidence calculation
        return originalRequiresApproval(result, context)
      }
      
      return toolStep
    })
  }
} 