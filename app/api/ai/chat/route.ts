import { streamText, convertToModelMessages, tool, type UIMessage } from 'ai'
import { z } from 'zod'
import { openai } from '@/lib/ai/providers'
import { autoDiscoverAdapters } from '@/lib/ai/adapters/registry'
import { MasterRoutingAgent } from '@/lib/ai/agents/MasterRoutingAgent'
import { WorkflowMemory } from '@/lib/ai/agents/WorkflowMemory'
import type { AgentContext } from '@/lib/ai/agents/types'
import { CanvasContextProvider } from '@/lib/ai/canvas/CanvasContext'

// Initialize on first request
let adaptersInitialized = false

async function initialize() {
  if (!adaptersInitialized) {
    // Initialization will be handled by the service container
    adaptersInitialized = true
  }
}

import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

export async function POST(req: Request) {
  const { messages, canvasContext, aiSettings, approvedPlan } = await req.json()
  
  // Add useful debugging logs
  console.log('=== AI CHAT POST REQUEST ===')
  console.log('Messages count:', messages.length)
  console.log('Last message:', messages[messages.length - 1]?.content || 'No content')
  console.log('Canvas context hasContent:', canvasContext?.hasContent)
  console.log('Canvas dimensions:', canvasContext?.dimensions)
  console.log('Has approved plan:', !!approvedPlan)
  console.log('Selection snapshot:', canvasContext?.selectionSnapshot)
  
  // Initialize adapters
  await initialize()
  
  // Set canvas context for this request if available
  const { CanvasToolBridge } = await import('@/lib/ai/tools/canvas-bridge')
  if (canvasContext) {
    // Create a canvas context object from the request data
    const contextSnapshot = CanvasContextProvider.fromData({
      canvas: {} as CanvasManager, // Placeholder for typing - actual canvas managed by bridge
      targetObjects: canvasContext.targetObjects || [],
      targetingMode: canvasContext.targetingMode || 'all',
      dimensions: canvasContext.dimensions || { width: 800, height: 600 },
      hasContent: canvasContext.hasContent || false,
      objectCount: canvasContext.objectCount || 0,
      pixelSelection: canvasContext.pixelSelection,
      screenshot: canvasContext.screenshot
    })
    CanvasToolBridge.setRequestSelectionSnapshot(contextSnapshot)
  }
  
  // Ensure snapshot is cleared after request
  const clearSnapshot = () => {
    CanvasToolBridge.clearRequestSelectionSnapshot()
  }
  
  // Get AI tools from adapter registry (temporarily disabled for foundation cleanup)
  const aiTools: Record<string, any> = {}
  console.log('Available AI tools:', Object.keys(aiTools))
  
  // Check if this is an approval response with a plan to execute
  if (approvedPlan && messages[messages.length - 1]?.content?.toLowerCase().includes('approve')) {
    console.log('[Agent] User approved plan, executing tools and continuing workflow')
    
    try {
      // Extract the original request and tool executions
      const { toolExecutions, originalRequest } = approvedPlan
      
      // Return a special tool that will execute the approved plan and continue the workflow
      return streamText({
        model: openai('gpt-4o'),
        messages: convertToModelMessages(messages),
        tools: {
          executeApprovedPlan: tool({
            description: 'Execute the approved plan and continue the workflow',
            inputSchema: z.object({
              confirmation: z.string()
            }),
            execute: async () => {
              return {
                type: 'execute-approved-plan',
                toolExecutions,
                originalRequest,
                message: 'Executing approved plan...',
                iterationCount: approvedPlan.iterationCount || 1
              }
            }
          }),
          captureAndEvaluate: tool({
            description: 'Capture canvas screenshot and evaluate if goals are met',
            inputSchema: z.object({
              canvasScreenshot: z.string().describe('Base64 screenshot of current canvas state'),
              originalRequest: z.string().describe('The original user request'),
              iterationCount: z.number().describe('Current iteration number')
            }),
            execute: async ({ canvasScreenshot, originalRequest, iterationCount }) => {
              console.log('[Agent] Evaluating canvas state with vision model')
              
              // Use OpenAI vision to evaluate the result
              const { generateText } = await import('ai')
              const evaluation = await generateText({
                model: openai('gpt-4o'),
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: `Evaluate if this image meets the user's request: "${originalRequest}"
                      
Please analyze:
1. Has the request been fulfilled?
2. What improvements were made?
3. Are there any remaining issues?
4. Rate the success from 0-1 (1 being perfect)

Be specific and honest in your evaluation.`
                      },
                      {
                        type: 'image',
                        image: canvasScreenshot
                      }
                    ]
                  }
                ],
                temperature: 0.3
              })
              
              const evaluationText = evaluation.text || ''
              const successMatch = evaluationText.match(/success.*?([0-9.]+)/i)
              const successScore = successMatch ? parseFloat(successMatch[1]) : 0.5
              
              return {
                type: 'evaluation-result',
                evaluation: evaluationText,
                successScore,
                goalsMet: successScore >= 0.85,
                iterationCount,
                shouldContinue: iterationCount < 3 && successScore < 0.85,
                message: successScore >= 0.85 
                  ? 'Goals successfully achieved!' 
                  : `Current success: ${Math.round(successScore * 100)}%. ${iterationCount < 3 ? 'Further improvements possible.' : 'Maximum iterations reached.'}`
              }
            }
          })
        },
        system: `The user has approved the plan. Execute the approved tools by calling executeApprovedPlan.
        
After execution, you should:
1. Wait for the tools to complete
2. Call captureAndEvaluate to analyze the results with vision
3. Present the evaluation results to the user in a friendly way
4. Ask if they'd like another iteration to further improve toward the original goal

When presenting results:
- Summarize what was done
- Highlight the improvements made
- Be honest about what could still be improved
- Ask: "Would you like me to continue improving based on your original request: '${originalRequest}'?"

Original request: ${originalRequest}
Current iteration: ${approvedPlan.iterationCount || 1}/3`,
      }).toUIMessageStreamResponse()
    } finally {
      clearSnapshot()
    }
  }
  
  try {
    return streamText({
      model: openai('gpt-4o'),
      messages: convertToModelMessages(messages),
      tools: {
        // Multi-step workflow tool
        executeAgentWorkflow: tool({
          description: 'Execute complex multi-step photo editing workflow when simple tools are not enough',
          inputSchema: z.object({
            request: z.string().describe('The user request to execute'),
            iterationCount: z.number().optional().describe('Current iteration number (for iterative workflows)')
          }),
          execute: async ({ request, iterationCount }) => {
            return await executeMultiStepWorkflow(request, messages, canvasContext, aiSettings, iterationCount)
          }
        }),
        
        // All the regular tools
        ...aiTools
      },
      onChunk: ({ chunk }) => {
        // Stream tool input updates for real-time agent thinking display
        if (chunk.type === 'tool-input-start' && chunk.toolName === 'executeAgentWorkflow') {
          console.log('[Agent] Tool input streaming started for agent workflow')
        }
        
        if (chunk.type === 'tool-input-delta') {
          // Tool input delta chunks have an 'id' property that links to the tool
          console.log('[Agent] Tool input streaming delta:', chunk.delta)
        }
        
        if (chunk.type === 'tool-call' && chunk.toolName === 'executeAgentWorkflow') {
          console.log('[Agent] Tool call completed for agent workflow')
        }
      },
      system: `You are FotoFun's AI assistant. You can help with photo editing in several ways:

CANVAS STATE: ${!canvasContext?.hasContent ? '⚠️ The canvas is empty - no image loaded yet!' : `Canvas has content (${canvasContext?.dimensions?.width || 0}x${canvasContext?.dimensions?.height || 0}px)`}

SELECTION SNAPSHOT:
${canvasContext?.selectionSnapshot ? 
  canvasContext.selectionSnapshot.isEmpty ? 
    '⚠️ No objects selected' :
    `✅ ${canvasContext.selectionSnapshot.objectCount} object(s) selected (${canvasContext.selectionSnapshot.types.join(', ')})` :
  '⚠️ No selection data available'}

SELECTION RULES (STRICT ENFORCEMENT):
1. Single image on canvas → Auto-select and proceed
2. Multiple objects + selection snapshot → Use only selected objects
3. Multiple objects + no selection → DO NOT CALL ANY TOOLS - Ask user to select first
4. Selection snapshot is captured at request time and used for ALL operations

CRITICAL SELECTION BEHAVIOR:
- The selection snapshot was captured when the user sent their message
- ALL operations in this request MUST use only the objects in this snapshot
- If no selection and multiple objects exist, you MUST NOT call any editing tools
- Instead, you MUST ask the user to select objects first

${canvasContext?.singleImageCanvas ? 
  '✅ Single image canvas - will auto-target the image' : ''}
${canvasContext?.selectionSnapshot && !canvasContext.selectionSnapshot.isEmpty ? 
  `✅ User has pre-selected ${canvasContext.selectionSnapshot.objectCount} object(s) - operations will affect only these` : 
  canvasContext?.objectCount > 1 && (!canvasContext?.selectionSnapshot || canvasContext.selectionSnapshot.isEmpty) ? 
  '🚫 BLOCKED: Multiple objects with no selection - DO NOT call any editing tools' : ''}

SELECTION REQUIRED RESPONSE:
When there are multiple objects (${canvasContext?.objectCount || 0}) with no selection, you MUST respond EXACTLY like this:

"I see you have ${canvasContext?.objectCount || 'multiple'} objects on the canvas. Please select the ones you'd like me to edit, then let me know what you'd like to do with them.

To select objects:
- Click on an object to select it
- Hold Shift and click to select multiple objects
- Or use Cmd/Ctrl+A to select all

Once you've made your selection, just tell me what you'd like to do!"

DO NOT attempt to call any tools when selection is required.

ROUTING RULES:

0. **Empty Canvas Check**: If the canvas has no content and the user requests any editing operation, politely inform them:
   "I'd love to help edit your image, but I don't see any image on the canvas yet. Please upload an image first, then I can help you [restate their request]."
   DO NOT attempt to call any editing tools on an empty canvas.

1. **Questions/Help**: Answer directly with helpful information

2. **Simple Operations (Client-Side Fast Execution)**:
   - Single clear operations: "make it brighter", "rotate 90 degrees", "apply sepia"
   - Simple multi-step with clear operations: "crop and rotate", "brighten and flip"
   - Specific parameters: "increase brightness by 20", "crop to square"
   - Use the direct tools - the client will execute them quickly
   - For multi-step: just call the tools in sequence
   - After tools complete: Give a brief confirmation like "Done! I've [list what you did]. Your image has been updated."

3. **Complex Operations (Server-Side Agent Workflows)**:
   - Subjective improvements: "enhance this photo", "make it look professional"
   - Quality judgments: "improve the lighting", "fix exposure issues"
   - Vague requests: "make it pop", "give it a vintage feel"
   - Analysis required: "remove distractions", "focus on the subject"
   - Use executeAgentWorkflow - these need AI reasoning and planning

4. **AI-Native Tools**: 
   - Image generation (generateImage) creates new images from text descriptions
   - These tools use external APIs and may take a few seconds to complete
   - Use them when users want to create new content, not modify existing images

IMPORTANT DISTINCTION:
- "make it brighter and crop" → Use individual tools (client handles sequence)
- "improve the image quality" → Use executeAgentWorkflow (needs AI judgment)
- Simple combinations of clear operations should NOT use executeAgentWorkflow

ITERATIVE WORKFLOW:
When the user approves a plan:
1. The tools will be executed automatically
2. You'll receive the results and updated canvas state
3. Evaluate if the original goals have been met
4. If not fully met, suggest ONE more improvement (max 3 iterations total)
5. Be specific about what still needs improvement

HANDLING EVALUATION RESULTS:
When you receive an evaluation result from captureAndEvaluate:
1. Present the evaluation in a friendly, conversational way
2. Highlight what was improved (based on the evaluation text)
3. Be honest about any remaining issues
4. Ask the user if they'd like another iteration

Example response after evaluation:
"I've completed the improvements! Here's what I did:
- Increased brightness by 15% to enhance visibility
- Boosted contrast by 10% for better definition
- Adjusted saturation to make colors more vibrant

The image now has better lighting and more vivid colors. The evaluation shows [summarize key points from evaluation].

Would you like me to continue refining the image based on your original request? I can make further adjustments if needed. (Iteration 1 of 3)"

IMPORTANT:
- Don't automatically continue - wait for user confirmation
- Keep track of iteration count
- After 3 iterations, mention that's the limit
- Maintain context of the original request throughout

Canvas: ${canvasContext?.dimensions?.width || 0}x${canvasContext?.dimensions?.height || 0}px, has content: ${canvasContext?.hasContent || false}

Available tools:
- Canvas editing: (temporarily disabled for foundation cleanup)
- AI-native: (temporarily disabled for foundation cleanup)
- Complex workflows: executeAgentWorkflow (ONLY for subjective/complex operations)

When using tools, be direct and efficient. Only use executeAgentWorkflow when AI reasoning adds value.

CRITICAL: Never attempt to use any editing tools if hasContent is false. Always check first and guide the user to upload an image.`,
    }).toUIMessageStreamResponse()
  } finally {
    clearSnapshot()
  }
}

// Execute multi-step workflow using agent system
async function executeMultiStepWorkflow(
  request: string,
  messages: UIMessage[], 
  canvasContext: { 
    dimensions: { width: number; height: number }; 
    hasContent: boolean; 
    objectCount?: number;
    canvasScreenshot?: string; // Add screenshot support
  }, 
  aiSettings: { autoApproveThreshold?: number; showConfidenceScores?: boolean; showApprovalDecisions?: boolean },
  iterationCount: number = 0,
  previousAdjustments: Array<{ tool: string; params: unknown }> = [],
  lastEvaluation?: { score: number; feedback: string }
) {
  console.log('[Agent] === EXECUTING MULTI-STEP WORKFLOW ===')
  console.log('[Agent] Request:', request)
  console.log('[Agent] Iteration:', iterationCount)
  console.log('[Agent] Previous adjustments:', previousAdjustments.length)
  console.log('[Agent] Has screenshot:', !!canvasContext.canvasScreenshot)
  
  // Check if we've hit the iteration limit
  if (iterationCount >= 3) {
    console.log('[Agent] Hit iteration limit (3), stopping workflow')
    return {
      success: true,
      completed: true,
      message: 'Reached maximum iterations. The image has been improved as much as possible within the iteration limit.',
      iterationCount
    }
  }
  
  // Use the new canvas context provider
  const contextData = CanvasContextProvider.fromData(canvasContext)
  
  // Create a minimal mock canvas that satisfies the Canvas interface requirements
  // This is only used for WorkflowMemory initialization, actual operations use contextData
  const mockCanvas = {
    getWidth: () => contextData.dimensions.width,
    getHeight: () => contextData.dimensions.height,
    getObjects: () => [],
    toJSON: () => ({}),
    loadFromJSON: (data: unknown, callback: () => void) => {
      // Mock implementation
      callback()
    },
    renderAll: () => {
      // Mock implementation
    },
    toDataURL: () => {
      // Return a mock data URL
      return 'data:image/png;base64,mock'
    },
    canvas: null as unknown as CanvasManager,
    targetImages: [],
    targetingMode: 'auto-single' as const,
    dimensions: contextData.dimensions,
    selection: {
      type: 'none' as const,
      data: undefined
    }
  } as unknown as CanvasContext // Canvas context with minimal implementation for server-side
  
  // Create agent context with user preferences from AI settings
  const agentContext: AgentContext & {
    iterationData?: {
      iterationCount: number
      previousAdjustments: Array<{ tool: string; params: unknown }>
      lastEvaluation?: { score: number; feedback: string }
      canvasScreenshot?: string
    }
  } = {
    canvas: mockCanvas as unknown as CanvasManager,
    conversation: messages,
    workflowMemory: new WorkflowMemory(mockCanvas as unknown as CanvasManager),
    userPreferences: {
      autoApprovalThreshold: aiSettings?.autoApproveThreshold ?? 1.0, // Default to 100% if not provided (requires manual approval)
      maxAutonomousSteps: 10,
      showConfidenceScores: aiSettings?.showConfidenceScores ?? true,
      showApprovalDecisions: aiSettings?.showApprovalDecisions ?? true,
    },
    canvasAnalysis: {
      dimensions: contextData.dimensions,
      hasContent: contextData.hasContent,
      objectCount: contextData.objectCount,
      lastAnalyzedAt: Date.now()
    },
    // Include iteration data if this is not the first iteration
    ...(iterationCount > 0 || previousAdjustments.length > 0 ? {
      iterationData: {
        iterationCount,
        previousAdjustments,
        lastEvaluation,
        canvasScreenshot: canvasContext.canvasScreenshot
      }
    } : {})
  }
  
  // Create master routing agent
  const masterAgent = new MasterRoutingAgent(agentContext)
  
  try {
    console.log('[Agent] Executing with master routing agent for:', request)
    
    // Execute with the master agent (includes routing, orchestration, evaluation)
    const agentResult = await masterAgent.execute(request)
    
    console.log('[Agent] Agent result:', {
      completed: agentResult.completed,
      resultsCount: agentResult.results.length,
      reason: agentResult.reason
    })
    
    // Extract data from the first result (which should contain the execution plan)
    const firstResult = agentResult.results[0]
    const resultData = firstResult?.data as Record<string, unknown>
    
    console.log('[Agent] First result data:', {
      type: resultData?.type,
      hasToolExecutions: !!resultData?.toolExecutions,
      hasWorkflow: !!resultData?.workflow,
      hasAgentStatus: !!resultData?.agentStatus
    })
    
    // Check if this is an execution plan from ImageImprovementAgent
    if (resultData?.type === 'execution-plan' && resultData?.toolExecutions) {
      console.log('[Agent] Execution plan detected from agent')
      
      // Extract the planned tool executions
      const toolExecutions = resultData.toolExecutions as Array<{
        toolName: string
        params: unknown
        description: string
        confidence: number
      }>
      
      // Extract workflow metadata
      const workflow = resultData.workflow as {
        description: string
        steps: Array<{
          toolName: string
          params: unknown
          description: string
          confidence: number
        }>
        agentType: string
        totalSteps: number
        reasoning: string
        visionInsights?: string
      }
      
      // Extract agent status
      const agentStatus = resultData.agentStatus as {
        confidence: number
        approvalRequired: boolean
        threshold: number
      }
      
      // Extract status updates
      const statusUpdates = (resultData.statusUpdates as Array<{
        type: string
        message: string
        details?: string
        timestamp: string
      }>) || []
      
      // Extract iteration context
      const iterationContext = resultData.iterationContext as {
        currentIteration: number
        previousAdjustments: Array<{ tool: string; params: unknown }>
        lastEvaluation?: { score: number; feedback: string }
      } | undefined
      
      console.log('[Agent] Extracted execution plan:', {
        toolExecutionsCount: toolExecutions.length,
        confidence: agentStatus.confidence,
        approvalRequired: agentStatus.approvalRequired,
        threshold: agentStatus.threshold
      })
      
      // Check if approval is required based on confidence threshold
      if (agentStatus.approvalRequired) {
        console.log('[Agent] Approval required - confidence below threshold')
        
        return {
          success: false,
          approvalRequired: true,
          step: {
            id: 'workflow-approval',
            description: workflow.description,
            confidence: agentStatus.confidence,
            threshold: agentStatus.threshold
          },
          workflow,
          agentStatus,
          statusUpdates,
          toolExecutions, // Include the plan for approval dialog
          iterationContext, // Include iteration context
          message: `Approval required: Confidence (${Math.round(agentStatus.confidence * 100)}%) is below threshold (${Math.round(agentStatus.threshold * 100)}%)`
        }
      }
      
      // Confidence is high enough - return the execution plan
      return {
        success: true,
        workflow,
        agentStatus,
        statusUpdates,
        toolExecutions,
        iterationContext, // Include iteration context
        message: workflow.description || `Ready to execute ${toolExecutions.length} improvements`
      }
    }
    
    // Fallback for other agent types or direct tool execution
    console.log('[Agent] Fallback extraction for non-execution-plan results')
    
    // Extract tool executions from results (old format)
    const toolExecutions = agentResult.results
      .map((stepResult) => {
        const data = stepResult.data as Record<string, unknown>
        if (data.toolName && data.params) {
          return {
            toolName: data.toolName as string,
            params: data.params,
            description: (data.description as string) || `Apply ${data.toolName}`,
            confidence: stepResult.confidence
          }
        }
        return null
      })
      .filter(Boolean) as Array<{
        toolName: string
        params: unknown
        description: string
        confidence: number
      }>
    
    // Extract status updates from the first result
    const statusUpdates = firstResult ? 
      ((firstResult.data as Record<string, unknown>).statusUpdates as Array<{
        type: string
        message: string
        details?: string
        timestamp: string
      }>) || [] : []
    
    // Calculate overall confidence
    const overallConfidence = agentResult.results.length > 0 ?
      agentResult.results.reduce((sum, r) => sum + r.confidence, 0) / agentResult.results.length : 0.5
    
    const requiresApproval = overallConfidence < agentContext.userPreferences.autoApprovalThreshold
    
    // Check if approval is required
    if (requiresApproval && toolExecutions.length > 0) {
      console.log('[Agent] Approval required for fallback workflow')
      
      return {
        success: false,
        approvalRequired: true,
        step: {
          id: 'workflow-approval',
          description: `Execute ${toolExecutions.length} step workflow`,
          confidence: overallConfidence,
          threshold: agentContext.userPreferences.autoApprovalThreshold
        },
        workflow: {
          description: `Multi-step workflow: ${request}`,
          steps: toolExecutions,
          agentType: 'sequential',
          totalSteps: toolExecutions.length,
          reasoning: `Planned ${toolExecutions.length} steps for: ${request}`
        },
        agentStatus: {
          confidence: overallConfidence,
          approvalRequired: true,
          threshold: agentContext.userPreferences.autoApprovalThreshold
        },
        statusUpdates,
        toolExecutions,
        message: `Approval required: Confidence (${Math.round(overallConfidence * 100)}%) is below threshold (${Math.round(agentContext.userPreferences.autoApprovalThreshold * 100)}%)`
      }
    }
    
    // Return the workflow result
    return {
      success: agentResult.completed,
      workflow: {
        description: `Multi-step workflow: ${request}`,
        steps: toolExecutions,
        agentType: 'sequential',
        totalSteps: toolExecutions.length,
        reasoning: `Planned ${toolExecutions.length} steps for: ${request}`
      },
      agentStatus: {
        confidence: overallConfidence,
        approvalRequired: false,
        threshold: agentContext.userPreferences.autoApprovalThreshold
      },
      statusUpdates,
      toolExecutions,
      message: `Ready to execute ${toolExecutions.length} steps`
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