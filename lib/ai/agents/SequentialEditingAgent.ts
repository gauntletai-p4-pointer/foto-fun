import { generateObject } from 'ai'
import { z } from 'zod'
import { openai } from '@/lib/ai/providers'
import { BaseAgent } from './BaseAgent'
import { ToolStep } from './steps/ToolStep'
import type { AgentStep, AgentResult, StepResult } from './types'

// Schema for the AI to generate a plan
const PlanSchema = z.object({
  steps: z.array(z.object({
    id: z.string(),
    tool: z.string(),
    params: z.any(),
    description: z.string(),
    requiresApproval: z.boolean().optional()
  })),
  reasoning: z.string()
})

type Plan = z.infer<typeof PlanSchema>

export class SequentialEditingAgent extends BaseAgent {
  async execute(request: string): Promise<AgentResult> {
    try {
      // Analyze canvas before starting
      await this.analyzeCanvas()
      
      // Generate steps for the request
      const steps = await this.generateSteps(request)
      
      if (steps.length === 0) {
        return {
          completed: false,
          results: [],
          reason: 'No steps generated for the request'
        }
      }
      
      const results: StepResult[] = []
      
      // Execute steps sequentially
      for (const step of steps) {
        if (this.shouldStop()) {
          return {
            completed: false,
            results,
            reason: 'Maximum steps reached'
          }
        }
        
        const result = await this.executeStep(step)
        results.push(result)
        
        if (!result.success) {
          return {
            completed: false,
            results,
            reason: `Step failed: ${step.description}`
          }
        }
      }
      
      return {
        completed: true,
        results
      }
    } catch (error) {
      console.error('Agent execution error:', error)
      return {
        completed: false,
        results: [],
        reason: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async generateSteps(request: string): Promise<AgentStep[]> {
    // Use AI to generate a plan
    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: PlanSchema,
      prompt: `You are an AI photo editing assistant. Generate a step-by-step plan to fulfill this request: "${request}"
      
      Current canvas state:
      - Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
      - Has content: ${this.context.canvasAnalysis.hasContent}
      - Object count: ${this.context.canvasAnalysis.objectCount}
      
      Available tools:
      - crop: Crop the image (params: x, y, width, height)
      - brightness: Adjust brightness (params: value from -100 to 100)
      - contrast: Adjust contrast (params: value from -100 to 100)
      - saturation: Adjust saturation (params: value from -100 to 100)
      - blur: Apply blur effect (params: radius)
      - rotate: Rotate image (params: angle)
      - flip: Flip image (params: direction: 'horizontal' | 'vertical')
      - resize: Resize image (params: width, height, maintainAspectRatio)
      - grayscale: Convert to grayscale (no params)
      - sepia: Apply sepia effect (no params)
      - invert: Invert colors (no params)
      - removeBackground: Remove background (no params)
      
      Generate a plan with specific tools and parameters. Mark steps that significantly change the image as requiresApproval: true.`
    })
    
    if (!object || !object.steps) {
      return []
    }
    
    // Convert plan to AgentSteps
    return object.steps.map((planStep, index) => 
      new ToolStep({
        id: `step-${index}`,
        tool: planStep.tool,
        params: planStep.params,
        description: planStep.description
      })
    )
  }
} 