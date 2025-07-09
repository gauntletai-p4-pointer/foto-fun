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
        const existingStatusUpdates = (firstResult.data as { statusUpdates?: Array<{
          type: string
          message: string
          details?: string
          timestamp: string
        }> })?.statusUpdates || []
        
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
    
    console.log('[MasterRoutingAgent] Canvas analysis:', {
      dimensions: this.context.canvasAnalysis.dimensions,
      hasContent: this.context.canvasAnalysis.hasContent,
      objectCount: this.context.canvasAnalysis.objectCount
    })
    
    const canvasEditingTools = adapterRegistry.getToolNamesByCategory('canvas-editing')
    const aiNativeTools = adapterRegistry.getToolNamesByCategory('ai-native')
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

Available AI-native tools (expensive, single-use only): ${aiNativeTools.join(', ')}
Available canvas-editing tools (fast, workflow-compatible): ${canvasEditingTools.join(', ')}

ROUTING RULES:
1. **text-only**: Questions, help requests, or informational queries
   - Examples: "what tools are available?", "how do I crop?", "what is brightness adjustment?"
   - Provide helpful text response

2. **simple-tool**: Single tool operations
   - ALL AI-native tools (expensive): ${aiNativeTools.join(', ')}
   - Single canvas operations: "make it brighter", "crop to square", "rotate 90 degrees"
   - Also includes percentage adjustments: "turn exposure down by 10%", "increase brightness by 20%"
   - Color adjustments: "increase saturation by 25%", "make colors more vibrant", "reduce saturation"
   - NEVER include AI-native tools in workflows - they are always single-tool only
   - Should be high confidence (>0.8) for auto-approval
   - Suggest the specific tool to use

3. **sequential-workflow**: Multi-step operations on EXISTING images
   - Examples: "make this vintage", "enhance this photo", "make it dramatic"
   - ONLY uses canvas-editing tools: ${canvasEditingTools.join(', ')}
   - NEVER includes AI-native tools (no generateImage, etc.)
   - Delegate to SequentialEditingAgent for specialized planning

4. **evaluator-optimizer**: Quality-focused workflows (future)
   - Examples: "make this professional quality", "optimize for print"
   - Will delegate to EvaluatorOptimizerAgent

5. **orchestrator-worker**: Parallel processing workflows (future)
   - Examples: "apply multiple filters", "batch process effects"
   - Will delegate to OrchestratorAgent

IMPORTANT CLARIFICATIONS:
- "improve", "enhance", "fix" requests should use sequential-workflow if there's content
- If canvas has NO content and user asks to "improve", suggest they need an image first
- "generate" requests should use simple-tool with generateImage
- Quality improvement requests ("improve this photo", "enhance") need sequential-workflow

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
    console.log('[MasterRoutingAgent] === HANDLING SIMPLE TOOL EXECUTION ===')
    console.log('[MasterRoutingAgent] Request:', request)
    console.log('[MasterRoutingAgent] Analysis:', analysis)
    
    const toolName = analysis.suggestedTool
    console.log('[MasterRoutingAgent] Suggested tool name:', toolName)
    
    if (!toolName) {
      throw new Error('No tool suggested for simple tool execution')
    }
    
    const tool = adapterRegistry.get(toolName)
    console.log('[MasterRoutingAgent] Tool found in registry:', !!tool)
    console.log('[MasterRoutingAgent] Tool details:', tool ? {
      aiName: tool.aiName,
      description: tool.description.substring(0, 100) + '...'
    } : 'null')
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`)
    }
    
    this.addStatusUpdate('planning-steps', 'Planning simple tool execution', 
      `Using tool: ${toolName} for request: "${request}"`)
    
    // Infer parameters for the tool
    const params = await this.inferToolParameters(tool, request)
    
    // Calculate confidence for single tool operation
    const toolConfidence = await this.calculateToolConfidence(tool, params, request)
    
    this.addStatusUpdate('planning-steps', 'Confidence calculation', 
      `Tool: ${toolName}\nConfidence: ${Math.round(toolConfidence.overall * 100)}%\nFactors: ${JSON.stringify(toolConfidence.factors, null, 2)}`)
    
    // Auto-approve if confidence is high enough
    const threshold = this.context.userPreferences.autoApprovalThreshold
    const isAutoApproved = toolConfidence.overall >= threshold
    
    console.log('[MasterRoutingAgent] === AUTO-APPROVAL CHECK ===')
    console.log('[MasterRoutingAgent] Confidence:', analysis.confidence)
    console.log('[MasterRoutingAgent] Threshold:', threshold)
    console.log('[MasterRoutingAgent] Auto-approved:', isAutoApproved)
    
    this.addStatusUpdate('executing-tool', 'Executing simple tool', 
      `Tool: ${toolName}, Auto-approved: ${isAutoApproved}, Confidence: ${Math.round(toolConfidence.overall * 100)}%, Threshold: ${Math.round(threshold * 100)}%`)
    
    // Check if this is an AI-native tool for follow-up suggestions
    const isAINativeTool = tool.metadata.category === 'ai-native'
    
    // Build the result with full transparency
    const transparentResult = {
      type: isAutoApproved ? 'simple-tool-execution' : 'simple-tool-approval-required',
      toolName,
      params,
      description: tool.description,
      reasoning: analysis.reasoning,
      routingDecision: 'simple-tool',
      autoApproved: isAutoApproved,
      confidence: toolConfidence.overall,
      confidenceFactors: toolConfidence.factors,
      threshold,
      isAINativeTool,
      statusUpdates: this.statusUpdates
    }
    
    if (isAutoApproved) {
      // Execute directly using AI SDK v5 generateText
      console.log('[MasterRoutingAgent] === EXECUTING AUTO-APPROVED TOOL ===')
      console.log('[MasterRoutingAgent] Tool name:', toolName)
      console.log('[MasterRoutingAgent] Parameters:', params)
      
      const aiTools = adapterRegistry.getAITools()
      console.log('[MasterRoutingAgent] Tool available in AI tools:', toolName in aiTools)
      
      const result = await generateText({
        model: openai('gpt-4o'),
        tools: {
          [toolName]: aiTools[toolName]
        },
        system: `Execute the ${toolName} tool with these parameters: ${JSON.stringify(params)}`,
        prompt: `Execute ${toolName} to fulfill: "${request}"`
      })
      
      console.log('[MasterRoutingAgent] === TOOL EXECUTION RESULT ===')
      console.log('[MasterRoutingAgent] Result:', result)
      console.log('[MasterRoutingAgent] Result type:', typeof result)
      
      // Generate follow-up suggestion for AI-native tools
      let followUpSuggestion = ''
      if (isAINativeTool) {
        followUpSuggestion = await this.generateFollowUpSuggestion(toolName, request)
      }
      
      return {
        completed: true,
        results: [{
          success: true,
          data: {
            ...transparentResult,
            executionResult: result,
            followUpSuggestion
          },
          confidence: toolConfidence.overall
        }]
      }
    } else {
      // Return plan for approval (will be handled by UI)
      return {
        completed: false,
        results: [{
          success: false,
          data: {
            ...transparentResult,
            approvalRequired: true
          },
          confidence: toolConfidence.overall
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
      const sequentialStatusUpdates = (firstResult.data as { statusUpdates?: Array<{
        type: string
        message: string
        details?: string
        timestamp: string
      }> })?.statusUpdates || []
      
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
    // Don't overwrite canvas analysis if it already has valid data from the client
    if (this.context.canvasAnalysis.lastAnalyzedAt && 
        Date.now() - this.context.canvasAnalysis.lastAnalyzedAt < 60000) { // Less than 1 minute old
      console.log('[MasterRoutingAgent] Using existing canvas analysis from client')
      return
    }
    
    // Only use mock canvas as fallback if no analysis exists
    console.log('[MasterRoutingAgent] WARNING: Using mock canvas for analysis - this should not happen in production')
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
    console.log('[MasterRoutingAgent] === INFERRING TOOL PARAMETERS ===')
    console.log('[MasterRoutingAgent] Tool:', tool.aiName)
    console.log('[MasterRoutingAgent] Request:', request)
    console.log('[MasterRoutingAgent] Tool description:', tool.description.substring(0, 200) + '...')
    
    const { object: params } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        // Common parameters that most tools might have
        value: z.number().optional(),
        adjustment: z.number().optional(),
        amount: z.number().optional(),
        factor: z.number().optional(),
        intensity: z.number().optional(),
        strength: z.number().optional(),
        // Dimension parameters
        width: z.number().optional(),
        height: z.number().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        // Boolean flags
        enable: z.boolean().optional(),
        horizontal: z.boolean().optional(),
        vertical: z.boolean().optional(),
        // Rotation/angle
        angle: z.number().optional(),
        degrees: z.number().optional(),
        // Text parameters
        text: z.string().optional(),
        prompt: z.string().optional(),
        // Color parameters
        color: z.string().optional(),
        temperature: z.number().optional(),
        // Generic fallback
        params: z.record(z.any()).optional()
      }).passthrough(), // Allow additional properties
      prompt: `Infer parameters for the ${tool.aiName} tool based on this request: "${request}"

Tool description: ${tool.description}

Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}

Provide appropriate parameters for this tool. Be conservative with values.
Common parameter names include: value, adjustment, amount, factor, intensity, width, height, angle, degrees, text, prompt, etc.`
    })
    
    console.log('[MasterRoutingAgent] === INFERRED PARAMETERS ===')
    console.log('[MasterRoutingAgent] Generated params:', params)
    console.log('[MasterRoutingAgent] Params type:', typeof params)
    console.log('[MasterRoutingAgent] Params keys:', Object.keys(params))
    
    // Flatten the params object if it exists
    if (params.params && typeof params.params === 'object') {
      return { ...params, ...params.params } as Record<string, unknown>
    }
    
    return params as Record<string, unknown>
  }
  
  // Generate a follow-up suggestion for AI-native tools
  private async generateFollowUpSuggestion(toolName: string, request: string): Promise<string> {
    const tool = adapterRegistry.get(toolName)
    if (!tool) return ''
    
    const canvasEditingTools = adapterRegistry.getToolNamesByCategory('canvas-editing')
    
    const { text: suggestion } = await generateText({
      model: openai('gpt-4o'),
      prompt: `The user just used "${toolName}" with request: "${request}"

Available canvas-editing tools for follow-up: ${canvasEditingTools.join(', ')}

Based on what they just did, suggest ONE specific follow-up action they might want to take next.
Be conversational and helpful. Format as a question like "Would you like me to make it brighter?" or "Should I crop it to focus on the subject?"

Keep it short and actionable.`
    })
    
    return suggestion
  }
  
  // Calculate confidence for a single tool operation
  private async calculateToolConfidence(
    tool: BaseToolAdapter<unknown, unknown>,
    params: Record<string, unknown>,
    request: string
  ): Promise<{
    overall: number
    factors: {
      parameterAppropriate: number
      canvasContext: number
      toolSuitability: number
      riskLevel: number
    }
  }> {
    const { object: confidence } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        overall: z.number().min(0).max(1),
        factors: z.object({
          parameterAppropriate: z.number().min(0).max(1).describe('Are the parameters reasonable and safe?'),
          canvasContext: z.number().min(0).max(1).describe('Does the canvas state support this operation?'),
          toolSuitability: z.number().min(0).max(1).describe('Is this the optimal tool for the request?'),
          riskLevel: z.number().min(0).max(1).describe('How likely is this to produce the intended result?')
        }),
        reasoning: z.string()
      }),
      prompt: `Calculate confidence for executing ${tool.aiName} with request: "${request}"

Tool: ${tool.aiName}
Description: ${tool.description}
Parameters: ${JSON.stringify(params, null, 2)}

Canvas context:
- Dimensions: ${this.context.canvasAnalysis.dimensions.width}x${this.context.canvasAnalysis.dimensions.height}
- Has content: ${this.context.canvasAnalysis.hasContent}
- Object count: ${this.context.canvasAnalysis.objectCount}

Calculate confidence based on:
1. Parameter Appropriateness: Are values reasonable and within safe ranges?
2. Canvas Context: Does the current canvas state support this operation?
3. Tool Suitability: Is this the best tool for what the user wants?
4. Risk Level: How likely is this to succeed without issues?

Overall confidence should be the weighted average of these factors.
Be conservative - it's better to ask for approval than to make mistakes.`
    })
    
    return {
      overall: confidence.overall,
      factors: confidence.factors
    }
  }
} 