import { generateText, type Tool } from 'ai'
import type { AgentContext, AgentResult } from '../types'
import { openai } from '@ai-sdk/openai'

/**
 * Base class for all agents following AI SDK v5 patterns
 * Provides a consistent interface for agent execution with built-in
 * progress tracking, error handling, and result processing
 */
export abstract class BaseAgent {
  /**
   * Unique identifier for the agent
   */
  abstract readonly name: string
  
  /**
   * Human-readable description of what the agent does
   */
  abstract readonly description: string
  
  /**
   * Define the tools available to this agent
   * Should return a record of AI SDK v5 tools
   */
  protected abstract getTools(): Record<string, Tool<unknown, unknown>>
  
  /**
   * Define the system prompt for this agent
   * This guides the agent's behavior and approach
   */
  protected abstract getSystemPrompt(): string
  
  /**
   * Execute the agent with the given request and context
   */
  async execute(request: string, context: AgentContext): Promise<AgentResult> {
    try {
      const result = await generateText({
        model: this.getModel(),
        system: this.getSystemPrompt(),
        prompt: this.buildPrompt(request, context),
        tools: this.getTools(),
        maxRetries: this.getMaxSteps(),
        onStepFinish: (event) => {
          this.handleStepComplete(event)
        }
      })
      
      return this.processResult(result, context)
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  /**
   * Get the AI model to use for this agent
   * Can be overridden by subclasses for different models
   */
  protected getModel() {
    // Default to GPT-4O, can be overridden
    return openai('gpt-4o')
  }
  
  /**
   * Get the maximum number of steps for this agent
   * Can be overridden by subclasses
   */
  protected getMaxSteps(): number {
    return 10
  }
  
  /**
   * Build the prompt for the agent including context
   */
  protected buildPrompt(request: string, context: AgentContext): string {
    const canvasInfo = `Canvas: ${context.canvasAnalysis.dimensions.width}x${context.canvasAnalysis.dimensions.height}px, ` +
                      `has content: ${context.canvasAnalysis.hasContent}, ` +
                      `objects: ${context.canvasAnalysis.objectCount}`
    
    return `${request}\n\nContext:\n${canvasInfo}`
  }
  
  /**
   * Handle completion of a step
   * Can be overridden for custom step tracking
   */
  protected handleStepComplete(event: { toolCalls?: unknown[]; toolResults?: unknown[] }): void {
    const toolCalls = event.toolCalls || []
    console.log(`[${this.name}] Step completed with ${toolCalls.length} tool calls`)
  }
  
  /**
   * Process the AI SDK result into our AgentResult format
   */
  protected abstract processResult(result: unknown, context: AgentContext): AgentResult
  
  /**
   * Handle errors during execution
   */
  protected handleError(error: unknown): AgentResult {
    console.error(`[${this.name}] Error during execution:`, error)
    
    return {
      completed: false,
      results: [{
        success: false,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        confidence: 0
      }],
      reason: error instanceof Error ? error.message : 'Unknown error'
    }
  }
} 