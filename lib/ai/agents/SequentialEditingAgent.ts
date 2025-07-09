import { BaseAgent } from './BaseAgent'
import type { AgentStep, StepResult, AgentResult } from './types'
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
    requiresApproval: z.boolean().optional(),
    estimatedConfidence: z.number().min(0).max(1).optional()
  })),
  reasoning: z.string()
})

export class SequentialEditingAgent extends BaseAgent {
  async execute(request: string): Promise<AgentResult> {
    try {
      // Analyze canvas before starting
      await this.analyzeCanvas()
      
      // Generate steps for the request
      const steps = await this.generateSteps(request)
      
      // Execute steps sequentially
      const results: StepResult[] = []
      for (const step of steps) {
        console.log(`[SequentialEditingAgent] Executing step: ${step.description}`)
        
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
      }
      
      return {
        completed: true,
        results
      }
    } catch (error) {
      return {
        completed: false,
        results: [],
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    }
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

Return a list of steps with tool names and parameters.`
    })
    
    console.log('[SequentialEditingAgent] Generated plan:', object)
    
    // Convert plan to executable steps
    return object.steps.map((step, index) => {
      const toolStep = new ToolStep({
        id: `step-${index}`,
        tool: step.tool,
        params: step.params,
        description: step.description
      })
      
      // Override requiresApproval if specified in the plan
      if (step.requiresApproval !== undefined || step.estimatedConfidence !== undefined) {
        const originalRequiresApproval = toolStep.requiresApproval.bind(toolStep)
        toolStep.requiresApproval = (result: StepResult) => {
          // Use plan's requiresApproval if explicitly set
          if (step.requiresApproval !== undefined) {
            return step.requiresApproval
          }
          // Use confidence threshold if provided
          if (step.estimatedConfidence !== undefined) {
            return step.estimatedConfidence < 0.8
          }
          // Otherwise use default logic
          return originalRequiresApproval(result)
        }
      }
      
      return toolStep
    })
  }
} 