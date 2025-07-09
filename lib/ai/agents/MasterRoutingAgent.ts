import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import type { AgentContext, AgentResult } from './types'
import { SequentialEditingAgent } from './SequentialEditingAgent'
import { adapterRegistry } from '../adapters/registry'
import { openai } from '@/lib/ai/providers'
import type { BaseToolAdapter } from '../adapters/base'

// Route analysis schema for determining execution strategy
const routeAnalysisSchema = z.object({
  requestType: z.enum([
    'text-only',           // Informational responses
    'simple-tool',         // Single tool execution
    'sequential-workflow', // Multi-step sequential processing
    'evaluator-optimizer', // Quality-focused workflows (future)
    'orchestrator-worker'  // Parallel processing workflows (future)
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  complexity: z.enum(['trivial', 'simple', 'moderate', 'complex']),
  suggestedTool: z.string().optional(),
  textResponse: z.string().optional(),
  estimatedSteps: z.number().optional()
})

export class MasterRoutingAgent {
  name = 'master-router'
  description = 'Pure router that analyzes requests and delegates to appropriate execution strategy'
  
  private context: AgentContext
  private statusUpdates: Array<{
    type: string
    message: string
    details?: string
    timestamp: string
  }> = []
  
  constructor(context: AgentContext) {
    this.context = context
  }

  async execute(request: string): Promise<AgentResult> {
    try {
      // Clear previous status updates
      this.statusUpdates = []
      
      // Step 1: Analyze the request to determine routing strategy
      this.addStatusUpdate('analyzing-prompt', 'Analyzing request and determining execution strategy', 
        `Analyzing: "${request}"`)
      
      const analysis = await this.analyzeRequest(request)
      
      this.addStatusUpdate('routing-decision', 'Routing decision made', 
        `Route: ${analysis.requestType} (confidence: ${Math.round(analysis.confidence * 100)}%)\nReasoning: ${analysis.reasoning}`)
      
      // Step 2: Route based on analysis
      let result: AgentResult
      
      switch (analysis.requestType) {
        case 'text-only':
          result = await this.handleTextResponse(analysis)
          break
          
        case 'simple-tool':
          result = await this.handleSimpleToolExecution(request, analysis)
          break
          
        case 'sequential-workflow':
          result = await this.delegateToSequentialAgent(request)
          break
          
        case 'evaluator-optimizer':
          // Future: delegate to EvaluatorOptimizerAgent
          this.addStatusUpdate('routing-decision', 'Fallback to sequential agent', 
            'EvaluatorOptimizerAgent not yet implemented, using SequentialEditingAgent')
          result = await this.delegateToSequentialAgent(request)
          break
          
        case 'orchestrator-worker':
          // Future: delegate to OrchestratorAgent
          this.addStatusUpdate('routing-decision', 'Fallback to sequential agent', 
            'OrchestratorAgent not yet implemented, using SequentialEditingAgent')
          result = await this.delegateToSequentialAgent(request)
          break
          
        default:
          // Default fallback
          this.addStatusUpdate('routing-decision', 'Using default sequential agent', 
            'Unknown route type, defaulting to SequentialEditingAgent')
          result = await this.delegateToSequentialAgent(request)
      }
      
      // Step 3: Attach status updates to the first result
      if (result.results.length > 0) {
        // Merge our status updates with any existing ones
        const firstResult = result.results[0]
        const existingStatusUpdates = (firstResult.data as { statusUpdates?: typeof this.statusUpdates })?.statusUpdates || []
        
        firstResult.data = {
          ...(firstResult.data as Record<string, unknown>),
          statusUpdates: [...this.statusUpdates, ...existingStatusUpdates]
        }
      }
      
      this.addStatusUpdate('generating-response', 'Workflow complete', 
        `Completed with ${result.results.length} results`)
      
      return result
    } catch (error) {
      this.addStatusUpdate('generating-response', 'Error in execution', 
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      console.error('[MasterRoutingAgent] Error in execute:', error)
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
    console.log(`[MasterRoutingAgent] ${type}: ${message}${details ? ` - ${details}` : ''}`)
  }

  // Analyze request using AI SDK v5 generateObject
  private async analyzeRequest(request: string): Promise<z.infer<typeof routeAnalysisSchema>> {
    console.log('[MasterRoutingAgent] === ANALYZING REQUEST ===')
    console.log('[MasterRoutingAgent] Request:', request)
    
    // Update canvas analysis
    await this.analyzeCanvas()
    
    const availableTools = Array.from(adapterRegistry.getAll()).map(a => a.aiName)
    console.log('[MasterRoutingAgent] Available tools:', availableTools)
    console.log('[MasterRoutingAgent] Canvas has content:', this.context.canvasAnalysis.hasContent)
    
    const { object: analysis } = await generateObject({
      model: openai('gpt-4o'),
      schema: routeAnalysisSchema,
      prompt: `Analyze this photo editing request and determine the best execution strategy:

"${request}"

Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}
- Object count: ${this.context.canvasAnalysis.objectCount}

Available tools: ${availableTools.join(', ')}

ROUTING RULES:
1. **text-only**: Questions, help requests, or informational queries
   - Examples: "what tools are available?", "how do I crop?", "what is brightness adjustment?"
   - Provide helpful text response

2. **simple-tool**: Single, straightforward tool operations
   - Examples: "make it brighter", "crop to square", "rotate 90 degrees"
   - Also includes percentage adjustments: "turn exposure down by 10%", "increase brightness by 20%"
   - Should be high confidence (>0.8) for auto-approval
   - Suggest the specific tool to use

3. **sequential-workflow**: Multi-step operations requiring planning
   - Examples: "make this vintage", "enhance this photo", "make it dramatic"
   - Delegate to SequentialEditingAgent for specialized planning

4. **evaluator-optimizer**: Quality-focused workflows (future)
   - Examples: "make this professional quality", "optimize for print"
   - Will delegate to EvaluatorOptimizerAgent

5. **orchestrator-worker**: Parallel processing workflows (future)
   - Examples: "apply multiple filters", "batch process effects"
   - Will delegate to OrchestratorAgent

Analyze the request and provide:
- Route type and confidence
- Clear reasoning for the decision
- For text-only: provide the text response
- For simple-tool: suggest the specific tool
- For workflows: estimate number of steps`
    })
    
    console.log('[MasterRoutingAgent] === ROUTE ANALYSIS RESULT ===')
    console.log('[MasterRoutingAgent] Route type:', analysis.requestType)
    console.log('[MasterRoutingAgent] Confidence:', analysis.confidence)
    console.log('[MasterRoutingAgent] Suggested tool:', analysis.suggestedTool)
    console.log('[MasterRoutingAgent] Reasoning:', analysis.reasoning)
    console.log('[MasterRoutingAgent] Full analysis:', analysis)
    return analysis
  }

  // Handle text-only responses (high confidence, auto-approved)
  private async handleTextResponse(analysis: z.infer<typeof routeAnalysisSchema>): Promise<AgentResult> {
    const textResponse = analysis.textResponse || "I can help you with photo editing. What would you like to do?"
    
    this.addStatusUpdate('generating-response', 'Generating text response', 
      `Providing informational response: ${textResponse.substring(0, 100)}...`)
    
    return {
      completed: true,
      results: [{
        success: true,
        data: {
          type: 'text-response',
          message: textResponse,
          reasoning: analysis.reasoning,
          routingDecision: 'text-only',
          statusUpdates: this.statusUpdates
        },
        confidence: Math.max(analysis.confidence, 0.9) // Text responses are high confidence
      }]
    }
  }

  // Handle simple tool execution (auto-approved if confident enough)
  private async handleSimpleToolExecution(
    request: string, 
    analysis: z.infer<typeof routeAnalysisSchema>
  ): Promise<AgentResult> {
    const toolName = analysis.suggestedTool
    if (!toolName) {
      throw new Error('No tool suggested for simple tool execution')
    }
    
    const tool = adapterRegistry.get(toolName)
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`)
    }
    
    this.addStatusUpdate('planning-steps', 'Planning simple tool execution', 
      `Using tool: ${toolName} for request: "${request}"`)
    
    // Infer parameters for the tool
    const params = await this.inferToolParameters(tool, request)
    
    // Auto-approve if confidence is high enough
    const threshold = this.context.userPreferences.autoApprovalThreshold
    const isAutoApproved = analysis.confidence >= threshold
    
    this.addStatusUpdate('executing-tool', 'Executing simple tool', 
      `Tool: ${toolName}, Auto-approved: ${isAutoApproved}, Confidence: ${Math.round(analysis.confidence * 100)}%`)
    
    if (isAutoApproved) {
      // Execute directly using AI SDK v5 generateText
      const result = await generateText({
        model: openai('gpt-4o'),
        tools: {
          [toolName]: adapterRegistry.getAITools()[toolName]
        },
        system: `Execute the ${toolName} tool with these parameters: ${JSON.stringify(params)}`,
        prompt: `Execute ${toolName} to fulfill: "${request}"`
      })
      
      return {
        completed: true,
        results: [{
          success: true,
          data: {
            type: 'simple-tool-execution',
            toolName,
            params,
            description: tool.description,
            reasoning: analysis.reasoning,
            routingDecision: 'simple-tool',
            autoApproved: true,
            executionResult: result,
            statusUpdates: this.statusUpdates
          },
          confidence: analysis.confidence
        }]
      }
    } else {
      // Return plan for approval (will be handled by UI)
      return {
        completed: false,
        results: [{
          success: false,
          data: {
            type: 'simple-tool-approval-required',
            toolName,
            params,
            description: tool.description,
            reasoning: analysis.reasoning,
            routingDecision: 'simple-tool',
            autoApproved: false,
            approvalRequired: true,
            statusUpdates: this.statusUpdates
          },
          confidence: analysis.confidence
        }]
      }
    }
  }

  // Delegate to SequentialEditingAgent with enhanced status tracking
  private async delegateToSequentialAgent(request: string): Promise<AgentResult> {
    this.addStatusUpdate('planning-steps', 'Delegating to Sequential Editing Agent', 
      'Complex workflow detected, using SequentialEditingAgent for detailed planning and execution')
    
    const sequentialAgent = new SequentialEditingAgent(this.context)
    const result = await sequentialAgent.execute(request)
    
    // Merge status updates from sequential agent
    if (result.results.length > 0) {
      const firstResult = result.results[0]
      const sequentialStatusUpdates = (firstResult.data as { statusUpdates?: typeof this.statusUpdates })?.statusUpdates || []
      
              // Combine our routing updates with sequential agent updates
        firstResult.data = {
          ...(firstResult.data as Record<string, unknown>),
          statusUpdates: [...this.statusUpdates, ...sequentialStatusUpdates]
        }
    }
    
    return result
  }

  // Update canvas analysis
  private async analyzeCanvas(): Promise<void> {
    const canvas = this.context.canvas
    const objects = canvas.getObjects()
    
    this.context.canvasAnalysis = {
      dimensions: {
        width: canvas.getWidth(),
        height: canvas.getHeight()
      },
      hasContent: objects.length > 0,
      objectCount: objects.length,
      lastAnalyzedAt: Date.now()
    }
  }

  // Infer tool parameters from natural language request
  private async inferToolParameters(
    tool: BaseToolAdapter<unknown, unknown>, 
    request: string
  ): Promise<Record<string, unknown>> {
    const { object: params } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.record(z.unknown()),
      prompt: `Infer parameters for the ${tool.aiName} tool based on this request: "${request}"

Tool description: ${tool.description}

Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}

Provide appropriate parameters for this tool. Be conservative with values.`
    })
    
    return params
  }
} 