import { streamText, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@/lib/ai/providers'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'
import { WorkflowMemory } from '@/lib/ai/agents/WorkflowMemory'
import type { AgentContext } from '@/lib/ai/agents/types'
import type { Canvas } from 'fabric'
import { MasterRoutingAgent } from '@/lib/ai/agents/MasterRoutingAgent'

// Initialize on first request
let adaptersInitialized = false

async function initialize() {
  if (!adaptersInitialized) {
    await autoDiscoverAdapters()
    adaptersInitialized = true
  }
}

export async function POST(req: Request) {
  const { messages, canvasContext, agentMode = false, aiSettings } = await req.json()
  
  // Initialize adapters and agents
  await initialize()
  
  // Get AI tools from adapter registry
  const aiTools = adapterRegistry.getAITools()
  
  // Use agent mode if enabled - KEEP THE ADVANCED AGENT PATTERNS
  if (agentMode) {
    // Create mock canvas for server-side operations
    const mockCanvas = {
      getWidth: () => canvasContext?.dimensions?.width || 0,
      getHeight: () => canvasContext?.dimensions?.height || 0,
      getObjects: () => [],
      toJSON: () => ({}),
      loadFromJSON: (data: unknown, callback: () => void) => { callback() },
      renderAll: () => {}
    } as unknown as Canvas
    
    // Create agent context with user preferences from AI settings
    const agentContext: AgentContext = {
      canvas: mockCanvas,
      conversation: messages,
      workflowMemory: new WorkflowMemory(mockCanvas),
      userPreferences: {
        autoApprovalThreshold: aiSettings?.autoApproveThreshold || 0.8,
        maxAutonomousSteps: 10,
        showConfidenceScores: aiSettings?.showConfidenceScores ?? true,
        showApprovalDecisions: aiSettings?.showApprovalDecisions ?? true,
      },
      canvasAnalysis: {
        dimensions: canvasContext.dimensions,
        hasContent: canvasContext.hasContent,
        objectCount: canvasContext.objectCount || 0,
        lastAnalyzedAt: Date.now()
      }
    }
    
    // Create master routing agent - THIS IS WHAT YOU NEED
    const masterAgent = new MasterRoutingAgent(agentContext)
    
    // Stream the response with agent status updates
    const result = streamText({
      model: openai('gpt-4o'),
      messages: convertToModelMessages(messages),
      tools: {
        // FIXED: Make this tool automatically execute the planned tools
        executeAgentWorkflow: tool({
          description: 'Execute photo editing request using intelligent agent routing (MasterRoutingAgent → SequentialEditingAgent → EvaluatorOptimizerAgent → OrchestratorAgent)',
          inputSchema: z.object({
            request: z.string().describe('The user request to execute')
          }),
          execute: async ({ request }) => {
            try {
              console.log('[Agent] Executing workflow for:', request)
              
              // Execute with the master agent (includes routing, orchestration, evaluation)
              const agentResult = await masterAgent.execute(request)
              
              // Extract tool executions for client-side execution
              const toolExecutions = agentResult.results.map((stepResult: { data: unknown; confidence: number }) => {
                const data = stepResult.data as { toolName?: string; params?: unknown; description?: string }
                if (data && data.toolName && data.params) {
                  return {
                    toolName: data.toolName,
                    params: data.params,
                    description: data.description,
                    confidence: stepResult.confidence
                  }
                }
                return null
              }).filter(Boolean)
              
              console.log('[Agent] Planned tool executions:', toolExecutions)
              
              // Return the structured workflow result
              return {
                success: agentResult.completed,
                workflow: {
                  description: `Multi-step workflow: ${request}`,
                  steps: toolExecutions,
                  agentType: 'sequential', // Default agent type
                  totalSteps: toolExecutions.length
                },
                agentStatus: {
                  confidence: agentResult.results[0]?.confidence || 0.8,
                  approvalRequired: agentResult.results.some((r: { confidence: number }) => r.confidence < agentContext.userPreferences.autoApprovalThreshold),
                  threshold: agentContext.userPreferences.autoApprovalThreshold
                },
                // THIS IS THE KEY: Return the tool executions for the AI to call
                toolExecutions,
                message: `Planned ${toolExecutions.length} steps. Now executing each tool...`
              }
            } catch (error) {
              console.error('Agent execution error:', error)
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          }
        }),
        ...aiTools
      },
      system: `You are FotoFun's AI assistant with advanced agent capabilities including:

- MasterRoutingAgent: Analyzes requests and routes to appropriate execution strategy
- SequentialEditingAgent: Executes operations in sequence with reasoning
- EvaluatorOptimizerAgent: Evaluates results and optimizes parameters  
- OrchestratorAgent: Coordinates parallel operations

WORKFLOW:
1. For multi-step requests, call executeAgentWorkflow({ request: "user request" })
2. You'll get back a toolExecutions array with the planned steps
3. Execute EACH tool in the toolExecutions array in sequence
4. The agents handle routing, orchestration, and evaluation server-side

EXAMPLE:
User: "increase saturation and apply sepia"
Step 1: executeAgentWorkflow({ request: "increase saturation and apply sepia" })
Response: { toolExecutions: [{ toolName: "adjustSaturation", params: {...} }, { toolName: "applySepia", params: {...} }] }
Step 2: adjustSaturation(params from step 1)
Step 3: applySepia(params from step 1)

This gives you the full agent system: routing, orchestration, evaluation, AND reliable execution.

Current canvas: ${canvasContext.dimensions.width}x${canvasContext.dimensions.height}px
${canvasContext.hasContent ? '(image loaded)' : '(no image)'}

Available tools: executeAgentWorkflow, ${adapterRegistry.getAll().map(a => a.aiName).join(', ')}`
    })
    
    return result.toUIMessageStreamResponse()
  }
  
  // Non-agent mode (original behavior)
  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: aiTools,
    system: `You are FotoFun's AI assistant. You help users edit photos using the available tools.

Available tools:
${adapterRegistry.getToolDescriptions().join('\n')}

Current canvas: ${canvasContext?.dimensions ? `${canvasContext.dimensions.width}x${canvasContext.dimensions.height} pixels` : 'No canvas'}${canvasContext?.hasContent ? ' (image loaded)' : ''}

When using tools:
1. Be specific with parameters
2. Explain what you're doing
3. If a tool fails, explain why and suggest alternatives

Respond naturally and helpfully.`
  })
  
  return result.toUIMessageStreamResponse()
} 