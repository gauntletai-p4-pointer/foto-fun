import { openai } from '@ai-sdk/openai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import type { AgentContext, AgentResult } from '../types'

/**
 * Image Improvement Agent using AI SDK v5 Multi-Step Tool Usage pattern
 * Implements evaluator-optimizer pattern for iterative improvements
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
  
  private iterationContext: {
    originalRequest: string
    iterationCount: number
    previousAdjustments: Array<{ tool: string; params: unknown }>
    lastEvaluation?: { score: number; feedback: string }
  } = {
    originalRequest: '',
    iterationCount: 0,
    previousAdjustments: []
  }
  
  /**
   * Execute image improvement workflow using multi-step tool usage
   */
  async execute(request: string, context: AgentContext & {
    iterationData?: {
      iterationCount: number
      previousAdjustments: Array<{ tool: string; params: unknown }>
      lastEvaluation?: { score: number; feedback: string }
      canvasScreenshot?: string // Canvas screenshot from client
    }
  }): Promise<AgentResult> {
    this.statusUpdates = [] // Clear previous updates
    
    // Initialize or update iteration context
    if (context.iterationData) {
      this.iterationContext = {
        originalRequest: this.iterationContext.originalRequest || request,
        ...context.iterationData
      }
    } else {
      this.iterationContext = {
        originalRequest: request,
        iterationCount: 0,
        previousAdjustments: [],
        lastEvaluation: undefined
      }
    }
    
    // Add initial status
    this.addStatusUpdate('analyzing-request', 
      this.iterationContext.iterationCount > 0 ? 'Continuing improvements' : 'Analyzing your request', 
      this.iterationContext.iterationCount > 0 
        ? `Iteration ${this.iterationContext.iterationCount + 1}/3`
        : `Understanding: "${request}"`)
    
    try {
      // Execute multi-step workflow with tools
      const { toolCalls } = await generateText({
        model: openai('gpt-4o'),
        tools: {
          // Capture screenshot for analysis
          captureScreenshot: tool({
            description: 'Capture the current canvas as a screenshot for analysis',
            inputSchema: z.object({
              purpose: z.string().describe('Why we need the screenshot'),
              iterationContext: z.object({
                iterationCount: z.number(),
                isEvaluation: z.boolean()
              }).optional()
            }),
            execute: async ({ purpose, iterationContext }) => {
              this.addStatusUpdate('screenshot', 'Capturing canvas screenshot', purpose)
              
              // Use provided screenshot if available (from client), otherwise placeholder
              const screenshot = context.iterationData?.canvasScreenshot || 'data:image/png;base64,placeholder'
              
              return {
                screenshot,
                dimensions: context.canvasAnalysis.dimensions,
                hasContent: context.canvasAnalysis.hasContent,
                iterationInfo: iterationContext
              }
            }
          }),
          
          // Analyze image with computer vision
          analyzeWithVision: tool({
            description: 'Use OpenAI vision to analyze the image and identify improvements',
            inputSchema: z.object({
              screenshot: z.string().describe('Base64 screenshot'),
              request: z.string().describe('What the user wants to improve'),
              analysisType: z.enum(['initial', 'evaluation']).default('initial'),
              previousAdjustments: z.array(z.object({
                tool: z.string(),
                params: z.any()
              })).optional()
            }),
            execute: async ({ screenshot, request: userRequest, analysisType, previousAdjustments }) => {
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
                          
Previous adjustments applied:
${previousAdjustments?.map(adj => `- ${adj.tool}: ${JSON.stringify(adj.params)}`).join('\n') || 'None'}

Rate success from 0-1 and identify any remaining issues.
If goals are met, explain why.
If not met, suggest NEW adjustments (don't repeat previous ones).`
                      },
                      {
                        type: 'image',
                        image: screenshot
                      }
                    ]
                  }],
                  temperature: 0.3
                })
                
                return { analysis, analysisType, previousAdjustments }
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
              request: z.string().describe('Original request'),
              previousAdjustments: z.array(z.object({
                tool: z.string(),
                params: z.any()
              })).optional()
            }),
            execute: async ({ analysis, previousAdjustments }) => {
              this.addStatusUpdate('planning', 'Creating improvement plan', 
                'Based on AI vision analysis')
              
              const steps = []
              const usedTools = new Set(previousAdjustments?.map(adj => adj.tool) || [])
              
              // Parse analysis for specific adjustments, avoiding duplicates
              const brightnessMatch = analysis.match(/brightness.*?([+-]?\d+)%?/i)
              if (brightnessMatch && !usedTools.has('adjustBrightness')) {
                steps.push({
                  toolName: 'adjustBrightness',
                  params: { adjustment: parseInt(brightnessMatch[1]) },
                  description: `Adjust brightness by ${brightnessMatch[1]}%`,
                  confidence: 0.9
                })
              }
              
              const contrastMatch = analysis.match(/contrast.*?([+-]?\d+)/i)
              if (contrastMatch && !usedTools.has('adjustContrast')) {
                steps.push({
                  toolName: 'adjustContrast',
                  params: { adjustment: parseInt(contrastMatch[1]) },
                  description: `Adjust contrast by ${contrastMatch[1]} points`,
                  confidence: 0.85
                })
              }
              
              const saturationMatch = analysis.match(/saturation.*?([+-]?\d+)%?/i)
              if (saturationMatch && !usedTools.has('adjustSaturation')) {
                steps.push({
                  toolName: 'adjustSaturation',
                  params: { adjustment: parseInt(saturationMatch[1]) },
                  description: `Adjust saturation by ${saturationMatch[1]}%`,
                  confidence: 0.8
                })
              }
              
              // Default plan if no specific adjustments found
              if (steps.length === 0 && (!previousAdjustments || previousAdjustments.length === 0)) {
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
                confidence: steps.length > 0 ? steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length : 0,
                previousAdjustments
              }
            }
          }),
          
          // Evaluate results and decide next action
          evaluateAndDecide: tool({
            description: 'Evaluate the current results and decide whether to continue iterating',
            inputSchema: z.object({
              evaluation: z.string().describe('Evaluation analysis from vision'),
              score: z.number().min(0).max(1).describe('Success score from evaluation'),
              iterationCount: z.number(),
              maxIterations: z.number().default(3)
            }),
            execute: async ({ evaluation, score, iterationCount, maxIterations = 3 }) => {
              this.addStatusUpdate('evaluation', 'Evaluating results', 
                `Score: ${(score * 100).toFixed(0)}%`)
              
              // Store evaluation in context
              this.iterationContext.lastEvaluation = {
                score,
                feedback: evaluation
              }
              
              const goalsMet = score >= 0.85
              const canContinue = iterationCount < maxIterations
              
              return {
                goalsMet,
                canContinue,
                shouldContinue: !goalsMet && canContinue,
                reason: goalsMet 
                  ? 'Image improvements successfully achieved the desired results'
                  : canContinue 
                    ? `Iteration ${iterationCount}/${maxIterations}: Further improvements needed`
                    : 'Maximum iterations reached',
                evaluation
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
        stopWhen: stepCountIs(15), // Increased to support iterations
        system: `You are an expert photo editor using computer vision to improve images iteratively.
        
Your workflow implements the evaluator-optimizer pattern:

INITIAL ITERATION:
1. Use captureScreenshot to get the canvas image
2. Use analyzeWithVision with analysisType='initial' to analyze it
3. Use createPlan to create specific improvements
4. Use provideExecutionPlan to return the plan for approval

AFTER EXECUTION (when called again with iteration context):
1. Use captureScreenshot to get the updated canvas
2. Use analyzeWithVision with analysisType='evaluation' to evaluate results
3. Use evaluateAndDecide to determine if goals are met
4. If NOT met and can continue:
   - Use createPlan with previousAdjustments to create NEW improvements
   - Use provideExecutionPlan to return the new plan
5. If goals ARE met or max iterations reached:
   - Use provideExecutionPlan with empty steps to signal completion

IMPORTANT: 
- Track previousAdjustments to avoid repeating the same changes
- Include iteration context in all relevant tool calls
- Be specific with adjustment values based on vision analysis
- Include the vision analysis results in the visionInsights parameter`,
        prompt: `Improve this image based on: "${request}"
        
Canvas: ${context.canvasAnalysis.dimensions.width}x${context.canvasAnalysis.dimensions.height}, has content: ${context.canvasAnalysis.hasContent}
Iteration: ${this.iterationContext.iterationCount}
Previous adjustments: ${this.iterationContext.previousAdjustments.length}`,
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
              workflowSteps: [
                {
                  step: 1,
                  name: 'Analyzing Request',
                  description: 'Understanding your request',
                  icon: '🤔'
                },
                {
                  step: 2,
                  name: 'Capturing Screenshot',
                  description: 'Taking a snapshot of the current canvas',
                  icon: '📸'
                },
                {
                  step: 3,
                  name: 'Computer Vision Analysis',
                  description: 'Using AI to analyze the image and identify improvements',
                  icon: '🔍'
                },
                {
                  step: 4,
                  name: 'Creating Plan',
                  description: 'Building a specific improvement plan based on analysis',
                  icon: '📝'
                },
                {
                  step: 5,
                  name: 'Finalizing Plan',
                  description: 'Preparing the enhancement plan for execution',
                  icon: '✨'
                }
              ],
              workflow: {
                description: plan.summary,
                steps: plan.steps,
                agentType: 'image-improvement',
                totalSteps: plan.steps.length,
                reasoning: plan.visionInsights || 'Computer vision analysis determined optimal adjustments',
                visionInsights: plan.visionInsights
              },
              agentStatus: {
                confidence: plan.confidence,
                approvalRequired,
                threshold
              },
              supportsIteration: true,
              maxIterations: 3,
              iterationContext: {
                currentIteration: this.iterationContext.iterationCount + 1,
                previousAdjustments: this.iterationContext.previousAdjustments,
                lastEvaluation: this.iterationContext.lastEvaluation
              }
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