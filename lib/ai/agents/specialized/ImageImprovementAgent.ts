import { openai } from '@ai-sdk/openai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import type { AgentContext, AgentResult } from '../types'

/**
 * Image Improvement Agent using AI SDK v5 Multi-Step Tool Usage pattern
 * Uses computer vision to analyze and plan iterative improvements
 */
export class ImageImprovementAgent {
  name = 'image-improvement'
  description = 'Uses computer vision to analyze and plan image improvements'
  
  private statusUpdates: Array<{
    type: string
    message: string
    details?: string
    timestamp: string
  }> = []
  
  /**
   * Execute image improvement workflow using multi-step tool usage
   */
  async execute(request: string, context: AgentContext): Promise<AgentResult> {
    this.statusUpdates = [] // Clear previous updates
    
    // Add initial status
    this.addStatusUpdate('analyzing-request', 'Analyzing your request', 
      `Understanding: "${request}"`)
    
    try {
      // Execute multi-step workflow with tools
      const { toolCalls } = await generateText({
        model: openai('gpt-4o'),
        tools: {
          // Capture screenshot for analysis
          captureScreenshot: tool({
            description: 'Capture the current canvas as a screenshot for analysis',
            inputSchema: z.object({
              purpose: z.string().describe('Why we need the screenshot')
            }),
            execute: async ({ purpose }) => {
              this.addStatusUpdate('screenshot', 'Capturing canvas screenshot', purpose)
              // In production, client provides the actual screenshot
              return {
                screenshot: 'data:image/png;base64,placeholder',
                dimensions: context.canvasAnalysis.dimensions,
                hasContent: context.canvasAnalysis.hasContent
              }
            }
          }),
          
          // Analyze image with computer vision
          analyzeWithVision: tool({
            description: 'Use OpenAI vision to analyze the image and identify improvements',
            inputSchema: z.object({
              screenshot: z.string().describe('Base64 screenshot'),
              request: z.string().describe('What the user wants to improve'),
              analysisType: z.enum(['initial', 'evaluation']).default('initial')
            }),
            execute: async ({ screenshot, request: userRequest, analysisType }) => {
              this.addStatusUpdate('vision-analysis', 'Analyzing with computer vision', 
                `${analysisType === 'initial' ? 'Identifying improvements' : 'Evaluating results'}`)
              
              try {
                const { text: analysis } = await generateText({
                  model: openai('gpt-4o'),
                  messages: [{
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: analysisType === 'initial' 
                          ? `Analyze this image for: "${userRequest}"
                          
Provide specific recommendations with exact values:
- Brightness adjustment (e.g., +15%)
- Contrast adjustment (e.g., +10 points)
- Saturation adjustment (e.g., +8%)
- Any other specific improvements needed`
                          : `Evaluate if the improvements meet: "${userRequest}"
                          
Rate success from 0-1 and identify any remaining issues.`
                      },
                      {
                        type: 'image',
                        image: screenshot
                      }
                    ]
                  }],
                  temperature: 0.3
                })
                
                return { analysis, analysisType }
              } catch {
                return {
                  analysis: 'Recommend: brightness +15%, contrast +10, saturation +8%',
                  analysisType,
                  fallback: true
                }
              }
            }
          }),
          
          // Create improvement plan
          createPlan: tool({
            description: 'Create a specific improvement plan based on vision analysis',
            inputSchema: z.object({
              analysis: z.string().describe('Vision analysis results'),
              request: z.string().describe('Original request')
            }),
            execute: async ({ analysis }) => {
              this.addStatusUpdate('planning', 'Creating improvement plan', 
                'Based on AI vision analysis')
              
              const steps = []
              
              // Parse analysis for specific adjustments
              const brightnessMatch = analysis.match(/brightness.*?(\d+)%?/i)
              if (brightnessMatch) {
                steps.push({
                  toolName: 'adjustBrightness',
                  params: { adjustment: parseInt(brightnessMatch[1]) },
                  description: `Increase brightness by ${brightnessMatch[1]}%`,
                  confidence: 0.9
                })
              }
              
              const contrastMatch = analysis.match(/contrast.*?(\d+)/i)
              if (contrastMatch) {
                steps.push({
                  toolName: 'adjustContrast',
                  params: { adjustment: parseInt(contrastMatch[1]) },
                  description: `Enhance contrast by ${contrastMatch[1]} points`,
                  confidence: 0.85
                })
              }
              
              const saturationMatch = analysis.match(/saturation.*?(\d+)%?/i)
              if (saturationMatch) {
                steps.push({
                  toolName: 'adjustSaturation',
                  params: { adjustment: parseInt(saturationMatch[1]) },
                  description: `Boost saturation by ${saturationMatch[1]}%`,
                  confidence: 0.8
                })
              }
              
              // Default plan if no specific adjustments found
              if (steps.length === 0) {
                steps.push({
                  toolName: 'adjustBrightness',
                  params: { adjustment: 10 },
                  description: 'Slight brightness increase',
                  confidence: 0.8
                })
              }
              
              return {
                steps,
                totalSteps: steps.length,
                confidence: steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length
              }
            }
          }),
          
          // Provide final execution plan (terminates the agent)
          provideExecutionPlan: tool({
            description: 'Provide the final execution plan for the client',
            inputSchema: z.object({
              steps: z.array(z.object({
                toolName: z.string(),
                params: z.any(),
                description: z.string(),
                confidence: z.number()
              })),
              summary: z.string(),
              confidence: z.number(),
              visionInsights: z.string().optional()
            })
            // No execute function - invoking this terminates the agent
          })
        },
        stopWhen: stepCountIs(6), // Max 6 steps
        system: `You are an expert photo editor using computer vision to improve images.
        
Your workflow:
1. Use captureScreenshot to get the canvas image
2. Use analyzeWithVision to analyze it with computer vision
3. Use createPlan to create specific improvements
4. Use provideExecutionPlan to return the final plan

Be specific with adjustment values based on the vision analysis.`,
        prompt: `Improve this image based on: "${request}"
        
Canvas: ${context.canvasAnalysis.dimensions.width}x${context.canvasAnalysis.dimensions.height}, has content: ${context.canvasAnalysis.hasContent}`,
        onStepFinish: ({ toolCalls: stepToolCalls }) => {
          // Log progress
          stepToolCalls?.forEach(tc => {
            if (tc.toolName !== 'provideExecutionPlan') {
              console.log(`[ImageImprovementAgent] Step: ${tc.toolName}`)
            }
          })
        }
      })
      
      // Extract the execution plan from the final tool call
      const finalToolCall = toolCalls[toolCalls.length - 1]
      
      if (finalToolCall?.toolName === 'provideExecutionPlan') {
        const plan = finalToolCall.input as {
          steps: Array<{
            toolName: string
            params: unknown
            description: string
            confidence: number
          }>
          summary: string
          confidence: number
          visionInsights?: string
        }
        
        this.addStatusUpdate('plan-ready', 'Improvement plan ready', 
          `${plan.steps.length} adjustments planned`)
        
        // Check if approval is required
        const threshold = context.userPreferences?.autoApprovalThreshold || 0.8
        const approvalRequired = plan.confidence < threshold
        
        return {
          completed: true,
          results: [{
            success: true,
            data: {
              type: 'execution-plan',
              toolExecutions: plan.steps,
              statusUpdates: this.statusUpdates,
              workflow: {
                description: plan.summary,
                steps: plan.steps,
                agentType: 'image-improvement',
                totalSteps: plan.steps.length,
                reasoning: 'Computer vision analysis determined optimal adjustments',
                visionInsights: plan.visionInsights
              },
              agentStatus: {
                confidence: plan.confidence,
                approvalRequired,
                threshold
              },
              supportsIteration: true,
              maxIterations: 3
            },
            confidence: plan.confidence
          }],
          reason: plan.summary
        }
      }
      
      // Fallback if no execution plan was provided
      this.addStatusUpdate('fallback', 'Using default improvements', 
        'No specific plan generated')
      
      return {
        completed: true,
        results: [{
          success: true,
          data: {
            type: 'execution-plan',
            toolExecutions: [{
              toolName: 'adjustBrightness',
              params: { adjustment: 10 },
              description: 'Slight brightness increase',
              confidence: 0.8
            }],
            statusUpdates: this.statusUpdates,
            workflow: {
              description: 'Basic image enhancement',
              steps: [{
                toolName: 'adjustBrightness',
                params: { adjustment: 10 },
                description: 'Slight brightness increase',
                confidence: 0.8
              }],
              agentType: 'image-improvement',
              totalSteps: 1,
              reasoning: 'Applied conservative brightness improvement'
            },
            agentStatus: {
              confidence: 0.8,
              approvalRequired: false,
              threshold: context.userPreferences?.autoApprovalThreshold || 0.8
            }
          },
          confidence: 0.8
        }],
        reason: 'Basic enhancement applied'
      }
      
    } catch (error) {
      console.error('[ImageImprovementAgent] Error:', error)
      
      this.addStatusUpdate('error', 'Error during analysis', 
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
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
  
  // Helper to add status updates
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