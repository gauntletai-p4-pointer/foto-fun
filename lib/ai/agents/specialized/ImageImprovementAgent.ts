import { openai } from '@ai-sdk/openai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import type { AgentContext, AgentResult } from '../types'
import { agentTools } from '../tools/agent-tools'

/**
 * Image Improvement Agent using Multi-Step Tool Usage pattern from AI SDK v5
 * This agent PLANS improvements but does NOT execute them.
 * It returns a list of tool executions for the client to perform.
 */
export class ImageImprovementAgent {
  name = 'image-improvement'
  description = 'Plans image quality improvements and returns execution instructions'
  
  private statusUpdates: Array<{
    type: string
    message: string
    details?: string
    timestamp: string
  }> = []
  
  /**
   * Plan the image improvement workflow
   * Returns a plan of tools to execute on the client
   */
  async execute(request: string, context: AgentContext): Promise<AgentResult> {
    this.statusUpdates = [] // Clear previous updates
    
    // Add initial status
    this.addStatusUpdate('analyzing-prompt', 'Analyzing image improvement request', 
      `Request: "${request}"`)
    
    // Define planning tools (no execution tools)
    const tools = {
      analyzeImage: agentTools.analyzeImage,
      planImprovements: agentTools.planImprovements,
      planStep: agentTools.planStep,
      generateAlternatives: agentTools.generateAlternatives,
      
      // Final result tool to provide the execution plan
      provideExecutionPlan: tool({
        description: 'Provide the final execution plan for image improvement',
        inputSchema: z.object({
          summary: z.string().describe('Summary of planned improvements'),
          executionSteps: z.array(z.object({
            toolName: z.string(),
            params: z.any(),
            description: z.string(),
            confidence: z.number().min(0).max(1)
          })).describe('Ordered list of tools to execute on the client'),
          estimatedQualityImprovement: z.number().min(0).max(100).describe('Estimated percentage quality improvement'),
          reasoning: z.string().describe('Explanation of why these steps were chosen'),
          alternatives: z.array(z.object({
            toolName: z.string(),
            params: z.any(),
            description: z.string()
          })).optional().describe('Alternative approaches if primary plan fails')
        })
        // No execute function - invoking it will terminate the agent
      })
    }
    
    try {
      this.addStatusUpdate('planning-steps', 'Starting AI-powered image analysis', 
        'Planning improvements based on image analysis')
      
      // Create canvas context for planning
      const canvasContext = {
        dimensions: context.canvasAnalysis.dimensions,
        hasContent: context.canvasAnalysis.hasContent,
        objectCount: context.canvasAnalysis.objectCount || 0,
        // In production, we'd include a screenshot here
        screenshot: undefined
      }
      
      // Execute the planning workflow
      const { steps } = await generateText({
        model: openai('gpt-4o'),
        tools,
        toolChoice: 'required',
        stopWhen: stepCountIs(8), // Maximum 8 planning steps
        system: `You are an expert photo editor creating improvement plans.
        
        Your workflow:
        1. Analyze the image context using analyzeImage
        2. Create an improvement plan using planImprovements
        3. Optionally generate alternatives for key adjustments
        4. Use provideExecutionPlan to return the final plan
        
        Important:
        - You are PLANNING only, not executing
        - Be conservative with adjustments - subtle changes are often better
        - Consider the user's specific request carefully
        - Provide clear descriptions for each planned step`,
        prompt: `Create an improvement plan for this image based on the user's request: ${request}
        
        Canvas Context:
        - Dimensions: ${canvasContext.dimensions.width}x${canvasContext.dimensions.height}
        - Has content: ${canvasContext.hasContent}
        - Object count: ${canvasContext.objectCount}`,
        onStepFinish: ({ toolCalls: stepToolCalls }) => {
          // Log each planning step
          stepToolCalls?.forEach(tc => {
            this.addStatusUpdate('planning-tool', `Planning with ${tc.toolName}`, 
              `Tool: ${tc.toolName}`)
          })
        }
      })
      
      // Extract the execution plan from the results
      let executionPlan: Array<{
        toolName: string
        params: unknown
        description: string
        confidence: number
      }> = []
      
      let overallConfidence = 0.85
      let planSummary = ''
      let planReasoning = ''
      
      // Process all steps to build the plan
      steps.forEach((step) => {
        step.toolCalls?.forEach(toolCall => {
          const toolResult = step.toolResults?.find(tr => tr.toolCallId === toolCall.toolCallId)?.output
          
          // Extract plan from planImprovements tool
          if (toolCall.toolName === 'planImprovements' && toolResult) {
            const planOutput = toolResult as {
              success?: boolean
              steps?: Array<{
                toolName: string
                params: unknown
                description: string
                confidence: number
              }>
              confidence?: number
            }
            
            if (planOutput.success && planOutput.steps) {
              executionPlan = planOutput.steps
              overallConfidence = planOutput.confidence || 0.85
              
              this.addStatusUpdate('plan-created', 'Created improvement plan', 
                `${executionPlan.length} steps planned`)
            }
          }
          
          // Extract final plan from provideExecutionPlan
          if (toolCall.toolName === 'provideExecutionPlan') {
            const finalPlan = toolCall.input as {
              summary: string
              executionSteps: Array<{
                toolName: string
                params: unknown
                description: string
                confidence: number
              }>
              reasoning: string
            }
            
            executionPlan = finalPlan.executionSteps
            planSummary = finalPlan.summary
            planReasoning = finalPlan.reasoning
            
            // Calculate overall confidence
            if (executionPlan.length > 0) {
              overallConfidence = executionPlan.reduce((sum, step) => sum + step.confidence, 0) / executionPlan.length
            }
          }
        })
      })
      
      // If no execution plan was extracted, create a default one
      if (executionPlan.length === 0) {
        this.addStatusUpdate('default-plan', 'Creating default improvement plan', 
          'No specific plan generated, using defaults')
        
        // Default conservative improvements
        executionPlan = [
          {
            toolName: 'adjustExposure',
            params: { adjustment: 10 },
            description: 'Slight brightness increase',
            confidence: 0.8
          },
          {
            toolName: 'adjustContrast',
            params: { adjustment: 5 },
            description: 'Subtle contrast enhancement',
            confidence: 0.75
          }
        ]
        planSummary = 'Basic image enhancement'
        planReasoning = 'Applied conservative improvements for general enhancement'
      }
      
      this.addStatusUpdate('generating-response', 'Improvement plan ready', 
        `${executionPlan.length} tools ready for execution`)
      
      // Return the execution plan in the expected format
      return {
        completed: true,
        results: [{
          success: true,
          data: {
            type: 'execution-plan',
            toolExecutions: executionPlan,
            statusUpdates: this.statusUpdates,
            workflow: {
              description: planSummary || `Image improvement plan: ${request}`,
              steps: executionPlan,
              agentType: 'image-improvement',
              totalSteps: executionPlan.length,
              reasoning: planReasoning || 'AI-powered analysis determined optimal adjustments'
            },
            agentStatus: {
              confidence: overallConfidence,
              approvalRequired: overallConfidence < (context.userPreferences?.autoApprovalThreshold || 0.8),
              threshold: context.userPreferences?.autoApprovalThreshold || 0.8
            }
          },
          confidence: overallConfidence
        }],
        reason: planSummary || `Planned ${executionPlan.length} improvements for: ${request}`
      }
      
    } catch (error) {
      console.error('[ImageImprovementAgent] Error:', error)
      
      this.addStatusUpdate('error', 'Error during planning', 
        error instanceof Error ? error.message : 'Unknown error')
      
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
        reason: `Error during planning: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    console.log(`[ImageImprovementAgent] ${type}: ${message}${details ? ` - ${details}` : ''}`)
  }
} 