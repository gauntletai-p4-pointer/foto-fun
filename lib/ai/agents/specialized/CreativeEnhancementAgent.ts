import { openai } from '@ai-sdk/openai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import type { AgentContext, AgentResult, StepResult } from '../types'
import { agentTools } from '../tools/agent-tools'

/**
 * Creative Enhancement Agent using Multi-Step Tool Usage pattern from AI SDK v5
 * Applies creative and artistic enhancements to images
 */
export class CreativeEnhancementAgent {
  name = 'creative-enhancement'
  description = 'Applies creative and artistic enhancements to images'
  
  async execute(request: string, context: AgentContext): Promise<AgentResult> {
    const results: StepResult[] = []
    
    // Define creative tools
    const tools = {
      ...agentTools,
      
      // Additional creative tools
      applyStyle: tool({
        description: 'Apply an artistic style to the image',
        inputSchema: z.object({
          style: z.enum(['vintage', 'modern', 'dramatic', 'soft', 'vibrant']),
          intensity: z.number().min(0).max(1).describe('Style intensity from 0 to 1')
        }),
        execute: async ({ style, intensity }) => {
          try {
            const { adapterRegistry } = await import('@/lib/ai/adapters/registry')
            const { ServiceContainer } = await import('@/lib/core/ServiceContainer')
            const container = ServiceContainer.getInstance()
            const canvas = container.get('CanvasManager')
            
            if (!canvas) {
              return { success: false, error: 'No canvas available' }
            }
            
            // Map styles to tool combinations
            const styleMap: Record<string, Array<{ tool: string; params: unknown }>> = {
              vintage: [
                { tool: 'applySepia', params: { intensity: intensity * 30 } },
                { tool: 'adjustBrightness', params: { adjustment: -10 * intensity } },
                { tool: 'adjustContrast', params: { adjustment: 5 * intensity } }
              ],
              modern: [
                { tool: 'adjustContrast', params: { adjustment: 20 * intensity } },
                { tool: 'adjustSaturation', params: { adjustment: 15 * intensity } },
                { tool: 'sharpen', params: { amount: 0.5 * intensity } }
              ],
              dramatic: [
                { tool: 'adjustContrast', params: { adjustment: 30 * intensity } },
                { tool: 'adjustBrightness', params: { adjustment: -15 * intensity } },
                { tool: 'adjustSaturation', params: { adjustment: -10 * intensity } }
              ],
              soft: [
                { tool: 'blur', params: { radius: 2 * intensity } },
                { tool: 'adjustBrightness', params: { adjustment: 10 * intensity } },
                { tool: 'adjustSaturation', params: { adjustment: -5 * intensity } }
              ],
              vibrant: [
                { tool: 'adjustSaturation', params: { adjustment: 30 * intensity } },
                { tool: 'adjustContrast', params: { adjustment: 10 * intensity } },
                { tool: 'adjustBrightness', params: { adjustment: 5 * intensity } }
              ]
            }
            
            const steps = styleMap[style] || []
            const appliedSteps = []
            
            for (const step of steps) {
              const adapter = adapterRegistry.get(step.tool)
              if (adapter) {
                await adapter.execute(step.params, {
                  canvas,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  targetImages: canvas.getObjects().filter(obj => obj.type === 'image') as any,
                  targetingMode: 'selection',
                  dimensions: {
                    width: canvas.getWidth(),
                    height: canvas.getHeight()
                  }
                })
                appliedSteps.push(step)
              }
            }
            
            return { 
              success: true, 
              applied: style, 
              intensity,
              steps: appliedSteps 
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Style application failed'
            }
          }
        }
      }),
      
      generateVariations: tool({
        description: 'Generate multiple creative variations of the current image',
        inputSchema: z.object({
          count: z.number().min(1).max(5).default(3).describe('Number of variations to generate'),
          diversity: z.number().min(0).max(1).default(0.5).describe('How different variations should be')
        }),
        execute: async ({ count = 3, diversity = 0.5 }) => {
          try {
            const variations = []
            const styles = ['vintage', 'modern', 'dramatic', 'soft', 'vibrant']
            
            for (let i = 0; i < count; i++) {
              // Generate random but controlled variations
              const style = styles[Math.floor(Math.random() * styles.length)]
              const intensity = 0.3 + (diversity * 0.7 * Math.random())
              
              variations.push({
                id: `var-${i + 1}`,
                style,
                intensity: Math.round(intensity * 100) / 100,
                description: `${style} style at ${Math.round(intensity * 100)}% intensity`
              })
            }
            
            return {
              success: true,
              variations,
              readyToApply: true
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate variations'
            }
          }
        }
      }),
      
      // Final result tool
      provideCreativeResult: tool({
        description: 'Provide the final creative enhancement result',
        inputSchema: z.object({
          summary: z.string().describe('Summary of creative enhancements applied'),
          stylesApplied: z.array(z.object({
            style: z.string(),
            intensity: z.number(),
            satisfaction: z.number().min(0).max(1)
          })),
          variations: z.array(z.object({
            id: z.string(),
            description: z.string(),
            recommended: z.boolean()
          })).optional(),
          artisticNotes: z.string().describe('Notes about the artistic choices made')
        })
        // No execute function - terminates the agent
      })
    }
    
    try {
      const { toolCalls, steps } = await generateText({
        model: openai('gpt-4o'),
        tools,
        toolChoice: 'required',
        stopWhen: stepCountIs(15), // Allow more steps for creative exploration
        system: `You are a creative photo editor specializing in artistic enhancements.
        
        Your workflow:
        1. Analyze the image and understand the user's creative vision
        2. Apply artistic styles using applyStyle based on the request
        3. Generate variations using generateVariations if exploring options
        4. Use traditional tools (brightness, contrast, etc.) for fine-tuning
        5. Evaluate results and iterate if needed
        6. Use provideCreativeResult to summarize your creative work
        
        Be bold with creative choices while respecting the user's intent.
        Consider the mood, atmosphere, and emotional impact of your edits.`,
        prompt: `Apply creative enhancements based on: ${request}
        
        Context:
        - Canvas: ${context.canvasAnalysis.dimensions.width}x${context.canvasAnalysis.dimensions.height}
        - Has content: ${context.canvasAnalysis.hasContent}`
      })
      
      // Process steps
      steps.forEach((step, index) => {
        step.toolCalls?.forEach(toolCall => {
          const stepResult: StepResult = {
            success: true,
            data: {
              stepNumber: index + 1,
              toolName: toolCall.toolName,
              toolInput: toolCall.input,
              toolOutput: step.toolResults?.find(tr => tr.toolCallId === toolCall.toolCallId)?.output
            },
            confidence: 0.85
          }
          results.push(stepResult)
        })
      })
      
      // Find final answer
      const finalAnswer = toolCalls?.find(tc => tc.toolName === 'provideCreativeResult')
      
      return {
        completed: true,
        results,
        reason: finalAnswer ? 
          (finalAnswer.input as { summary: string }).summary : 
          'Creative enhancement workflow completed'
      }
      
    } catch (error) {
      console.error('[CreativeEnhancementAgent] Error:', error)
      return {
        completed: false,
        results,
        reason: `Error during creative enhancement: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
} 