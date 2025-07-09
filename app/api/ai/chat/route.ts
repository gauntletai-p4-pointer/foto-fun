import { streamText, convertToModelMessages, tool } from 'ai'
import { z } from 'zod'
import { openai } from '@/lib/ai/providers'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'
import { WorkflowMemory } from '@/lib/ai/agents/WorkflowMemory'
import type { AgentContext } from '@/lib/ai/agents/types'
import { ApprovalRequiredError } from '@/lib/ai/agents/types'
import type { Canvas } from 'fabric'
import { MasterRoutingAgent } from '@/lib/ai/agents/MasterRoutingAgent'
import { ToolStep } from '@/lib/ai/agents/steps/ToolStep'

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
              
              // Extract status updates from the first result (contains routing info)
              const statusUpdates = agentResult.results.length > 0 ? 
                (agentResult.results[0].data as { statusUpdates?: Array<{
                  type: string
                  message: string
                  details?: string
                  timestamp: string
                }> })?.statusUpdates || [] : []
              
              // Calculate overall confidence and approval requirements
              const overallConfidence = agentResult.results.reduce((sum, r) => sum + r.confidence, 0) / agentResult.results.length
              const requiresApproval = agentResult.results.some((r: { confidence: number }) => r.confidence < agentContext.userPreferences.autoApprovalThreshold)
              
              // Return the structured workflow result with full agent data
              return {
                success: agentResult.completed,
                workflow: {
                  description: `Multi-step workflow: ${request}`,
                  steps: toolExecutions,
                  agentType: 'sequential', // Default agent type
                  totalSteps: toolExecutions.length,
                  reasoning: statusUpdates.find(s => s.type === 'routing-decision')?.details || `Planned ${toolExecutions.length} steps for: ${request}`
                },
                agentStatus: {
                  confidence: overallConfidence,
                  approvalRequired: requiresApproval,
                  threshold: agentContext.userPreferences.autoApprovalThreshold
                },
                statusUpdates,
                // THIS IS THE KEY: Return the tool executions for the AI to call
                toolExecutions,
                message: `Planned ${toolExecutions.length} steps. Now executing each tool...`
              }
            } catch (error) {
              // Handle approval required errors specially
              if (error instanceof ApprovalRequiredError) {
                console.log('[Agent] Approval required:', error.message)
                
                // Extract workflow information from the enhanced error
                const workflowContext = error.workflowContext
                
                return {
                  success: false,
                  approvalRequired: true,
                  step: {
                    id: error.step.id,
                    description: error.step.description,
                    confidence: error.approvalInfo.confidence,
                    threshold: error.approvalInfo.threshold
                  },
                  // Include full workflow context for UI display
                  workflow: workflowContext ? {
                    description: `${workflowContext.agentType} workflow`,
                    steps: workflowContext.allSteps.map((step, index) => ({
                      id: step.id,
                      description: step.description,
                                             toolName: (step as ToolStep).tool || 'unknown',
                       params: {},
                                             confidence: index === workflowContext.currentStepIndex ? 
                                  error.approvalInfo.confidence : 0.8,
                      isCurrentStep: index === workflowContext.currentStepIndex,
                      status: index < workflowContext.currentStepIndex ? 'completed' : 
                             index === workflowContext.currentStepIndex ? 'pending-approval' : 'planned'
                    })),
                    agentType: workflowContext.agentType,
                    totalSteps: workflowContext.allSteps.length,
                    reasoning: workflowContext.reasoning,
                    currentStepIndex: workflowContext.currentStepIndex
                  } : undefined,
                  agentStatus: {
                    confidence: error.approvalInfo.confidence,
                    approvalRequired: true,
                    threshold: error.approvalInfo.threshold
                  },
                  statusUpdates: workflowContext?.statusUpdates || [],
                  message: `Approval required: ${error.step.description} (confidence: ${Math.round(error.approvalInfo.confidence * 100)}%, threshold: ${Math.round(error.approvalInfo.threshold * 100)}%)`
                }
              }
              
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
2. Check the response:
   - If success=true and toolExecutions exists: Execute EACH tool in the toolExecutions array
   - If success=false and approvalRequired=true: STOP and explain that approval is needed
   - If success=false and error exists: Explain the error
3. The agents handle routing, orchestration, and evaluation server-side

EXAMPLE - Success:
User: "increase saturation and apply sepia"
Step 1: executeAgentWorkflow({ request: "increase saturation and apply sepia" })
Response: { success: true, toolExecutions: [{ toolName: "adjustSaturation", params: {...} }, { toolName: "applySepia", params: {...} }] }
Step 2: adjustSaturation(params from step 1)
Step 3: applySepia(params from step 1)

EXAMPLE - Approval Required:
User: "increase brightness a lot"
Step 1: executeAgentWorkflow({ request: "increase brightness a lot" })
Response: { success: false, approvalRequired: true, message: "Approval required..." }
Step 2: STOP - Explain that approval is needed and ask user to adjust settings or approve manually

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