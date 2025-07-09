import { generateObject } from 'ai'
import { z } from 'zod'
import { BaseAgent } from './BaseAgent'
import type { AgentContext, AgentResult, AgentStep } from './types'
import { SequentialEditingAgent } from './SequentialEditingAgent'
import { adapterRegistry } from '../adapters/registry'
import { openai } from '@/lib/ai/providers'
import type { BaseToolAdapter } from '../adapters/base'

const routeAnalysisSchema = z.object({
  requestType: z.enum([
    'text-only',
    'simple-tool',
    'sequential-workflow',
    'evaluator-optimizer',
    'orchestrator-worker',
    'hybrid'
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  complexity: z.enum(['trivial', 'simple', 'moderate', 'complex', 'very-complex']),
  requiresMultipleSteps: z.boolean(),
  requiresQualityOptimization: z.boolean(),
  canParallelize: z.boolean(),
  suggestedTools: z.array(z.string()).optional(),
  estimatedSteps: z.number().optional()
})

export class MasterRoutingAgent extends BaseAgent {
  name = 'master-router'
  description = 'Analyzes requests and routes to appropriate execution strategy'
  
  constructor(context: AgentContext, maxSteps: number = 10) {
    super(context, maxSteps)
  }
  
  protected async plan(): Promise<AgentStep[]> {
    // Master router doesn't use steps itself
    return []
  }
  
  async generateSteps(request: string): Promise<AgentStep[]> {
    // Master router doesn't use the step pattern, it routes to other agents
    // We acknowledge the request parameter is intentionally unused
    void request
    return []
  }
  
  async execute(request: string): Promise<AgentResult> {
    // Track status updates throughout the process
    const statusUpdates: Array<{
      type: string
      message: string
      details?: string
      timestamp: string
    }> = []
    
    // Step 1: Analyze the request
    statusUpdates.push({
      type: 'analyzing-prompt',
      message: 'Understanding your request...',
      timestamp: new Date().toISOString()
    })
    
    const analysis = await this.analyzeRequest(request)
    
    // Step 2: Log routing decision
    statusUpdates.push({
      type: 'routing-decision',
      message: `Routing to ${analysis.requestType === 'sequential-workflow' ? 'Sequential Workflow Agent' : 'Single Tool Execution'}`,
      details: analysis.reasoning,
      timestamp: new Date().toISOString()
    })
    
    // Step 3: Route to appropriate handler
    let result: AgentResult
    
    switch (analysis.requestType) {
      case 'simple-tool':
        // Execute a single tool directly
        if (analysis.suggestedTools?.length === 1) {
          statusUpdates.push({
            type: 'executing-tool',
            message: `Executing ${analysis.suggestedTools[0]} tool`,
            timestamp: new Date().toISOString()
          })
          
          const tool = adapterRegistry.get(analysis.suggestedTools[0])
          if (tool) {
            const params = await this.inferParameters(tool, request)
            result = {
              completed: true,
              results: [{
                success: true,
                data: { 
                  toolName: analysis.suggestedTools[0], 
                  params, 
                  description: tool.description,
                  statusUpdates 
                },
                confidence: analysis.confidence
              }]
            }
            break
          }
        }
        // Fall through to sequential if tool not found
      
      case 'sequential-workflow':
        // Use the sequential agent with status updates
        statusUpdates.push({
          type: 'planning-steps',
          message: `Planning ${analysis.estimatedSteps || 'multiple'} steps to achieve the desired result`,
          timestamp: new Date().toISOString()
        })
        
        const agent = new SequentialEditingAgent(this.context, this.maxSteps)
        result = await agent.execute(request)
        
        // Add status updates to the first result's data
        if (result.results.length > 0) {
          const firstResult = result.results[0]
          if (typeof firstResult.data === 'object' && firstResult.data !== null) {
            firstResult.data = { ...firstResult.data, statusUpdates }
          }
        }
        break
      
      default:
        // Default to sequential
        const defaultAgent = new SequentialEditingAgent(this.context, this.maxSteps)
        result = await defaultAgent.execute(request)
        
        // Add status updates to the first result's data
        if (result.results.length > 0) {
          const firstResult = result.results[0]
          if (typeof firstResult.data === 'object' && firstResult.data !== null) {
            firstResult.data = { ...firstResult.data, statusUpdates }
          }
        }
    }
    
    return result
  }
  
  private async analyzeRequest(
    request: string
  ): Promise<z.infer<typeof routeAnalysisSchema>> {
    try {
      await this.analyzeCanvas()
      
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: routeAnalysisSchema,
        prompt: `Analyze this photo editing request and determine the best execution strategy.

Request: "${request}"

Canvas context:
- Dimensions: ${this.context.canvas?.getWidth?.() || 0}x${this.context.canvas?.getHeight?.() || 0}
- Has content: ${this.context.canvas?.getObjects?.().length > 0}

Consider:
1. Is this just a question that needs a text response?
2. Can this be done with a single tool call?
3. Does it require multiple sequential steps?
4. Would it benefit from quality evaluation and optimization?
5. Can operations be parallelized?

Examples that should be sequential-workflow:
- "make this photo look vintage" (requires multiple effects)
- "enhance this photo" (requires multiple adjustments)
- "make it dramatic" (requires multiple adjustments)
- "professional look" (requires multiple adjustments)

Examples that should be simple-tool:
- "make it brighter" (single brightness adjustment)
- "crop to square" (single crop operation)
- "rotate 90 degrees" (single rotation)

Available tools: ${Array.from(adapterRegistry.getAll()).map(a => a.aiName).join(', ')}`
      })
      
      return object
    } catch (error) {
      console.error('Failed to analyze request:', error)
      // Default to sequential workflow on error
      return {
        requestType: 'sequential-workflow',
        confidence: 0.5,
        reasoning: 'Failed to analyze request, defaulting to sequential workflow',
        complexity: 'moderate',
        requiresMultipleSteps: true,
        requiresQualityOptimization: false,
        canParallelize: false,
        estimatedSteps: 2
      }
    }
  }
  
  private async inferParameters(tool: BaseToolAdapter<unknown, unknown>, request: string): Promise<Record<string, unknown>> {
    try {
      const { object } = await generateObject({
        model: openai('gpt-4o'),
        schema: tool.inputSchema,
        prompt: `Extract parameters for the ${tool.aiName} tool from this request: "${request}"
        
Tool description: ${tool.description}

Provide the parameters that match the tool's input schema.`
      })
      
      return object as Record<string, unknown>
    } catch (error) {
      console.error('Failed to infer parameters:', error)
      // Return empty object as fallback
      return {}
    }
  }
} 