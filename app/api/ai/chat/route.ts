import { streamText, convertToModelMessages, tool, type UIMessage } from 'ai'
import { z } from 'zod'
import { openai } from '@/lib/ai/providers'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'
import { MasterRoutingAgent } from '@/lib/ai/agents/MasterRoutingAgent'
import { WorkflowMemory } from '@/lib/ai/agents/WorkflowMemory'
import type { AgentContext } from '@/lib/ai/agents/types'
import type { Canvas } from 'fabric'

// Initialize on first request
let adaptersInitialized = false

async function initialize() {
  if (!adaptersInitialized) {
    await autoDiscoverAdapters()
    adaptersInitialized = true
  }
}

export async function POST(req: Request) {
  const { messages, canvasContext, aiSettings } = await req.json()
  
  // Initialize adapters
  await initialize()
  
  // Just use the normal AI chat with all tools available
  // Let the AI decide what to do naturally
  const aiTools = adapterRegistry.getAITools()
  
  return streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: {
      // Cost approval tool for external APIs
      requestCostApproval: tool({
        description: 'Request user approval for expensive external API operations',
        inputSchema: z.object({
          toolName: z.string(),
          operation: z.string(),
          estimatedCost: z.number(),
          details: z.string()
        }),
        execute: async ({ toolName, operation, estimatedCost, details }) => {
          return {
            type: 'cost-approval-required',
            toolName,
            operation,
            estimatedCost,
            details,
            message: `This operation will use ${toolName} and cost approximately $${estimatedCost.toFixed(3)}. ${details}`
          }
        }
      }),
      
      // Multi-step workflow tool
      executeAgentWorkflow: tool({
        description: 'Execute complex multi-step photo editing workflow when simple tools are not enough',
        inputSchema: z.object({
          request: z.string().describe('The user request to execute')
        }),
        execute: async ({ request }) => {
          return await executeMultiStepWorkflow(request, messages, canvasContext, aiSettings)
        }
      }),
      
      // All the regular tools
      ...aiTools
    },
    system: `You are FotoFun's AI assistant. You can help with photo editing in several ways:

ROUTING RULES:

1. **Questions/Help**: Answer directly with helpful information

2. **Simple Operations (Client-Side Fast Execution)**:
   - Single clear operations: "make it brighter", "rotate 90 degrees", "apply sepia"
   - Simple multi-step with clear operations: "crop and rotate", "brighten and flip"
   - Specific parameters: "increase brightness by 20", "crop to square"
   - Use the direct tools - the client will execute them quickly
   - For multi-step: just call the tools in sequence

3. **Complex Operations (Server-Side Agent Workflows)**:
   - Subjective improvements: "enhance this photo", "make it look professional"
   - Quality judgments: "improve the lighting", "fix exposure issues"
   - Vague requests: "make it pop", "give it a vintage feel"
   - Analysis required: "remove distractions", "focus on the subject"
   - Use executeAgentWorkflow - these need AI reasoning and planning

4. **AI-Native Tools**: Always use requestCostApproval first

IMPORTANT DISTINCTION:
- "make it brighter and crop" → Use individual tools (client handles sequence)
- "improve the image quality" → Use executeAgentWorkflow (needs AI judgment)
- Simple combinations of clear operations should NOT use executeAgentWorkflow

Canvas: ${canvasContext.dimensions.width}x${canvasContext.dimensions.height}px, has content: ${canvasContext.hasContent}

Available tools:
- Canvas editing: ${adapterRegistry.getToolNamesByCategory('canvas-editing').join(', ')}
- AI-native: ${adapterRegistry.getToolNamesByCategory('ai-native').join(', ')}
- Complex workflows: executeAgentWorkflow (ONLY for subjective/complex operations)

When using tools, be direct and efficient. Only use executeAgentWorkflow when AI reasoning adds value.`,
  }).toUIMessageStreamResponse()
}

// Execute multi-step workflow using agent system
async function executeMultiStepWorkflow(
  request: string,
  messages: UIMessage[], 
  canvasContext: { dimensions: { width: number; height: number }; hasContent: boolean; objectCount?: number }, 
  aiSettings: { autoApproveThreshold?: number; showConfidenceScores?: boolean; showApprovalDecisions?: boolean }
) {
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
  
  // Create master routing agent
  const masterAgent = new MasterRoutingAgent(agentContext)
  
  try {
    console.log('[Agent] Executing multi-step workflow for:', request)
    
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
        confidence: overallConfidence,
        requiresApproval,
        statusUpdates
      }
    }
  } catch (error) {
    console.error('[Agent] Error executing workflow:', error)
    
    // Handle ApprovalRequiredError specially
    if (error instanceof Error && error.name === 'ApprovalRequiredError') {
      // Extract the approval info from the error
      const approvalError = error as Error & {
        step?: { description: string }
        result?: { confidence: number }
        approvalInfo?: { 
          confidence: number
          threshold: number
        }
      }
      
      return {
        success: false,
        approvalRequired: true,
        step: {
          id: 'workflow-approval',
          description: approvalError.step?.description || 'Execute planned workflow',
          confidence: approvalError.approvalInfo?.confidence || approvalError.result?.confidence || 0.5,
          threshold: approvalError.approvalInfo?.threshold || aiSettings?.autoApproveThreshold || 0.8
        },
        message: error.message
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      workflow: null
    }
  }
} 