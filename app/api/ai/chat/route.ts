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
  
  // Use agent mode if enabled
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
    
    // Create master routing agent
    const masterAgent = new MasterRoutingAgent(agentContext)
    
    // Stream the response with agent status updates
    const result = streamText({
      model: openai('gpt-4o'),
      messages: convertToModelMessages(messages),
      tools: {
        executeAgentRequest: tool({
          description: 'Execute photo editing request using intelligent agent routing',
          inputSchema: z.object({
            request: z.string().describe('The user request to execute')
          }),
          execute: async ({ request }) => {
            try {
              // Create status updates array to track the process
              const statusUpdates = []
              
              // Add analyzing status
              statusUpdates.push({
                type: 'analyzing-prompt',
                message: 'Understanding your request...',
                timestamp: new Date().toISOString()
              })
              
              // Execute with the master agent
              const result = await masterAgent.execute(request)
              
              // Add routing status based on results
              const routeType = result.results.length > 1 ? 'sequential-workflow' : 'simple-tool'
              statusUpdates.push({
                type: 'routing-decision',
                message: `Routing to ${routeType === 'sequential-workflow' ? 'Sequential Workflow Agent' : 'Single Tool Execution'}`,
                details: `Found ${result.results.length} operations needed`,
                timestamp: new Date().toISOString()
              })
              
              // Add planning status if multiple steps
              if (result.results.length > 1) {
                statusUpdates.push({
                  type: 'planning-steps',
                  message: `Planning ${result.results.length} steps to achieve the desired result`,
                  timestamp: new Date().toISOString()
                })
              }
              
              // Extract tool calls from the results
              const toolCalls = result.results.map((stepResult) => {
                const data = stepResult.data as { toolName?: string; params?: unknown; description?: string }
                if (data && data.toolName && data.params) {
                  return {
                    toolName: data.toolName,
                    params: data.params,
                    confidence: stepResult.confidence,
                    requiresApproval: stepResult.confidence < agentContext.userPreferences.autoApprovalThreshold
                  }
                }
                return null
              }).filter(Boolean)
              
              // Return the tool calls for client execution with status updates
              return {
                ...result,
                toolCalls,
                statusUpdates,
                agentStatus: {
                  confidence: result.results[0]?.confidence,
                  approvalRequired: result.results.some(r => r.confidence < agentContext.userPreferences.autoApprovalThreshold),
                  threshold: agentContext.userPreferences.autoApprovalThreshold
                },
                message: `I'll help you with that. Let me execute ${toolCalls.length} operations to achieve the desired result.`
              }
            } catch (error) {
              console.error('Agent execution error:', error)
              return {
                completed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          }
        }),
        ...aiTools
      },
      system: `You are FotoFun's AI assistant with advanced agent capabilities.

CRITICAL WORKFLOW: When a user makes a request, you MUST follow this exact pattern:

1. FIRST: Call executeAgentRequest with the user's request
2. THEN: For EACH tool in the returned toolCalls array, call that tool with the exact params provided
3. NEVER skip step 2 - you must execute every tool returned

EXAMPLE:
User: "increase saturation and apply sepia"
Step 1: executeAgentRequest({ request: "increase saturation and apply sepia" })
Response: { toolCalls: [{ toolName: "adjustSaturation", params: { adjustment: 25 } }, { toolName: "applySepia", params: { intensity: 50 } }] }
Step 2: adjustSaturation({ adjustment: 25 })
Step 3: applySepia({ intensity: 50 })

You MUST execute ALL tools in the toolCalls array. Do not describe what you'll do - DO IT.

Current canvas: ${canvasContext.dimensions.width}x${canvasContext.dimensions.height}px
${canvasContext.hasContent ? '(image loaded)' : '(no image)'}

User preferences:
- Auto-approval threshold: ${aiSettings?.autoApproveThreshold ? Math.round(aiSettings.autoApproveThreshold * 100) + '%' : '80%'}
- Show confidence scores: ${aiSettings?.showConfidenceScores ?? true}
- Show approval decisions: ${aiSettings?.showApprovalDecisions ?? true}

Available tools: executeAgentRequest, ${adapterRegistry.getAll().map(a => a.aiName).join(', ')}

REMEMBER: executeAgentRequest only plans - you must then execute each tool it returns!`
    })
    
    return result.toTextStreamResponse()
  }
  
  // Get tool descriptions for system prompt
  const toolDescriptions = adapterRegistry.getToolDescriptions()
  
  // Build dynamic context based on canvas state
  let contextInfo = ''
  if (canvasContext?.dimensions) {
    contextInfo = `\n\nCurrent canvas: ${canvasContext.dimensions.width}x${canvasContext.dimensions.height} pixels`
    if (canvasContext.hasContent) {
      contextInfo += ' (image loaded)'
    }
  }
  
  // Non-agent mode (original behavior)
  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: aiTools,
    system: `You are FotoFun's AI assistant. You help users edit photos using the available tools.

Available tools:
${toolDescriptions.length > 0 ? toolDescriptions.join('\n') : '- No tools available yet'}
${contextInfo}

When using tools:
1. Be specific with parameters
2. Explain what you're doing
3. If a tool fails, explain why and suggest alternatives

Respond naturally and helpfully.`
  })
  
  return result.toTextStreamResponse()
} 