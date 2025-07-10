import { useCallback } from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import { adapterRegistry } from '@/lib/ai/adapters/registry'

interface ThinkingStep {
  id: string
  type: 'screenshot' | 'vision' | 'planning' | 'executing' | 'complete'
  message: string
  timestamp: string
  isActive: boolean
}

interface UseToolCallHandlerProps {
  waitForReady: () => Promise<void>
  onAgentThinkingStart?: () => void
  onAgentThinkingEnd?: () => void
  onAgentThinkingStep?: (step: ThinkingStep) => void
}

export function useToolCallHandler({ 
  waitForReady,
  onAgentThinkingStart,
  onAgentThinkingEnd,
  onAgentThinkingStep
}: UseToolCallHandlerProps) {
  
  const handleToolCall = useCallback(async ({ toolCall }: { toolCall: {
    toolName?: string
    name?: string
    args?: unknown
    input?: unknown
  } }) => {
    try {
      console.log('[AIChat] ===== onToolCall TRIGGERED =====')
      console.log('[AIChat] onToolCall triggered with:', toolCall)
      
      // Wait for canvas to be ready before executing tools
      try {
        await waitForReady()
      } catch (error) {
        console.error('[AIChat] Canvas initialization failed:', error)
        throw new Error('Canvas failed to initialize. Please refresh the page and try again.')
      }
      
      // Extract tool name - AI SDK v5 might prefix with 'tool-'
      let toolName = toolCall.toolName || (toolCall as unknown as { name?: string }).name || 'unknown'
      
      // Remove 'tool-' prefix if present
      if (toolName.startsWith('tool-')) {
        toolName = toolName.substring(5)
      }
      
      // Extract args from various possible locations
      const args = 'args' in toolCall ? (toolCall as unknown as { args: unknown }).args : 
                   'input' in toolCall ? (toolCall as unknown as { input: unknown }).input : 
                   undefined
      
      console.log('[AIChat] Extracted toolName:', toolName)
      console.log('[AIChat] Extracted args:', args)
      
      // SPECIAL HANDLING: If this is the captureAndEvaluate tool
      if (toolName === 'captureAndEvaluate') {
        console.log('[AIChat] === CAPTURE AND EVALUATE DETECTED ===')
        
        const evalRequest = args as {
          canvasScreenshot?: string
          originalRequest?: string
          iterationCount?: number
        }
        
        // Capture the current canvas state as screenshot
        const currentState = useCanvasStore.getState()
        if (currentState.fabricCanvas) {
          const screenshot = currentState.fabricCanvas.toDataURL({
            format: 'png',
            quality: 0.8,
            multiplier: 1
          })
          
          console.log('[AIChat] Captured canvas screenshot, length:', screenshot.length)
          
          // Return the screenshot for server-side evaluation
          return {
            ...evalRequest,
            canvasScreenshot: screenshot
          }
        } else {
          throw new Error('Canvas not available for screenshot')
        }
      }
      
      // SPECIAL HANDLING: If this is the executeApprovedPlan tool
      if (toolName === 'executeApprovedPlan') {
        console.log('[AIChat] === EXECUTE APPROVED PLAN DETECTED ===')
        const planData = args as { 
          type?: string
          toolExecutions?: Array<{ 
            toolName: string
            params: unknown
            description?: string
            confidence?: number
          }>
          originalRequest?: string
          message?: string
        }
        
        if (planData.type === 'execute-approved-plan' && planData.toolExecutions) {
          console.log('[AIChat] Executing approved plan tools:', planData.toolExecutions)
          
          // If there are multiple tools, use executeToolChain for proper selection management
          if (planData.toolExecutions.length > 1) {
            console.log('[AIChat] Multiple tools detected, using executeToolChain')
            
            // Convert tool executions to chain steps
            const chainSteps = planData.toolExecutions.map(exec => ({
              tool: exec.toolName,
              params: exec.params,
              continueOnError: false,
              delayAfter: 100
            }))
            
            try {
              // Execute as a chain to maintain selection consistency
              const chainResult = await ClientToolExecutor.execute('executeToolChain', {
                steps: chainSteps,
                preserveToolState: true,
                preserveSelection: true, // Preserve user selection after execution
                continueOnError: false
              })
              
              console.log('[AIChat] Tool chain completed successfully:', chainResult)
              
              // After executing all tools, get the updated canvas state
              const currentState = useCanvasStore.getState()
              const updatedCanvasContext = currentState.fabricCanvas ? {
                dimensions: {
                  width: currentState.fabricCanvas.getWidth(),
                  height: currentState.fabricCanvas.getHeight()
                },
                hasContent: currentState.hasContent(),
                objectCount: currentState.fabricCanvas.getObjects().length
              } : null
              
              return {
                success: true,
                message: `Executed ${planData.toolExecutions.length} approved tools`,
                results: chainResult,
                updatedCanvasContext,
                originalRequest: planData.originalRequest,
                continueWorkflow: true
              }
            } catch (error) {
              console.error('[AIChat] Tool chain execution failed:', error)
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Chain execution failed',
                originalRequest: planData.originalRequest
              }
            }
          } else {
            // Single tool - execute directly
            const results = []
            for (const toolExecution of planData.toolExecutions) {
              try {
                console.log(`[AIChat] Executing approved tool: ${toolExecution.toolName}`, toolExecution.params)
                const toolResult = await ClientToolExecutor.execute(toolExecution.toolName, toolExecution.params)
                results.push({
                  toolName: toolExecution.toolName,
                  success: true,
                  result: toolResult,
                  description: toolExecution.description
                })
                console.log(`[AIChat] Tool ${toolExecution.toolName} completed successfully`)
              } catch (error) {
                console.error(`[AIChat] Tool ${toolExecution.toolName} failed:`, error)
                results.push({
                  toolName: toolExecution.toolName,
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error'
                })
              }
            }
            
            // After executing all tools, get the updated canvas state
            const currentState = useCanvasStore.getState()
            const updatedCanvasContext = currentState.fabricCanvas ? {
              dimensions: {
                width: currentState.fabricCanvas.getWidth(),
                height: currentState.fabricCanvas.getHeight()
              },
              hasContent: currentState.hasContent(),
              objectCount: currentState.fabricCanvas.getObjects().length
            } : null
            
            return {
              success: true,
              message: `Executed ${results.length} approved tools`,
              results,
              updatedCanvasContext,
              originalRequest: planData.originalRequest,
              continueWorkflow: true
            }
          }
        }
      }
      
      // SPECIAL HANDLING: If this is the agent workflow tool
      if (toolName === 'executeAgentWorkflow') {
        console.log('[AIChat] === AGENT WORKFLOW TOOL DETECTED ===')
        
        // Start agent thinking
        onAgentThinkingStart?.()
        
        const agentResult = args as {
          success?: boolean
          approvalRequired?: boolean
          step?: {
            id: string
            description: string
            confidence: number
            threshold: number
          }
          workflow?: {
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
          }
          agentStatus?: {
            confidence: number
            approvalRequired: boolean
            threshold: number
          }
          statusUpdates?: Array<{
            type: string
            message: string
            details?: string
            timestamp: string
          }>
          toolExecutions?: Array<{ 
            toolName: string
            params: unknown
            description?: string
            confidence?: number
          }>
          message?: string
        }
        console.log('[AIChat] Agent result:', agentResult)
        
        // Process status updates into thinking steps
        if (agentResult.statusUpdates) {
          agentResult.statusUpdates.forEach((update, index) => {
            const stepType = 
              update.type === 'screenshot' || update.message.toLowerCase().includes('screenshot') ? 'screenshot' :
              update.type === 'vision-analysis' || update.message.toLowerCase().includes('vision') || update.message.toLowerCase().includes('analyzing') ? 'vision' :
              update.type === 'planning' || update.message.toLowerCase().includes('plan') ? 'planning' :
              update.type === 'executing' || update.message.toLowerCase().includes('execut') ? 'executing' :
              'planning'
            
            onAgentThinkingStep?.({
              id: `step-${index}`,
              type: stepType,
              message: update.message,
              timestamp: update.timestamp,
              isActive: false // These are completed steps
            })
          })
        }
        
        // End agent thinking when we have a result
        onAgentThinkingEnd?.()
        
        // Check if approval is required
        if (agentResult.approvalRequired && agentResult.step) {
          console.log('[AIChat] Approval required for agent workflow')
          
          // Return approval required response with status updates
          return {
            success: false,
            approvalRequired: true,
            message: agentResult.message || `Approval required: ${agentResult.step.description}`,
            step: agentResult.step,
            workflow: agentResult.workflow,
            agentStatus: agentResult.agentStatus,
            statusUpdates: agentResult.statusUpdates || [],
            toolExecutions: agentResult.toolExecutions
          }
        }
        
        // If no approval required and we have tool executions, execute them
        if (agentResult.success && agentResult.toolExecutions && agentResult.toolExecutions.length > 0) {
          console.log('[AIChat] Agent workflow - auto-executing planned tools:', agentResult.toolExecutions)
          
          // If there are multiple tools, use executeToolChain for proper selection management
          if (agentResult.toolExecutions.length > 1) {
            console.log('[AIChat] Multiple tools detected, using executeToolChain')
            
            // Convert tool executions to chain steps
            const chainSteps = agentResult.toolExecutions.map(exec => ({
              tool: exec.toolName,
              params: exec.params,
              continueOnError: false,
              delayAfter: 100
            }))
            
            try {
              // Execute as a chain to maintain selection consistency
              const chainResult = await ClientToolExecutor.execute('executeToolChain', {
                steps: chainSteps,
                preserveToolState: true,
                preserveSelection: true, // Preserve user selection after execution
                continueOnError: false
              })
              
              console.log('[AIChat] Tool chain completed successfully:', chainResult)
              
              return {
                success: true,
                message: agentResult.message || `Executed ${agentResult.toolExecutions.length} tools from agent workflow`,
                results: chainResult,
                agentWorkflow: true,
                workflow: agentResult.workflow,
                agentStatus: agentResult.agentStatus,
                statusUpdates: agentResult.statusUpdates || []
              }
            } catch (error) {
              console.error('[AIChat] Tool chain execution failed:', error)
              
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Chain execution failed',
                agentWorkflow: true,
                workflow: agentResult.workflow,
                agentStatus: agentResult.agentStatus,
                statusUpdates: agentResult.statusUpdates || []
              }
            }
          } else {
            // Single tool - execute directly
            const results = []
            for (const toolExecution of agentResult.toolExecutions) {
              try {
                console.log(`[AIChat] Executing planned tool: ${toolExecution.toolName}`, toolExecution.params)
                const toolResult = await ClientToolExecutor.execute(toolExecution.toolName, toolExecution.params)
                results.push({
                  toolName: toolExecution.toolName,
                  success: true,
                  result: toolResult,
                  description: toolExecution.description
                })
                console.log(`[AIChat] Tool ${toolExecution.toolName} completed successfully`)
              } catch (error) {
                console.error(`[AIChat] Tool ${toolExecution.toolName} failed:`, error)
                results.push({
                  toolName: toolExecution.toolName,
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error'
                })
              }
            }
            
            return {
              success: true,
              message: agentResult.message || `Executed ${results.length} tools from agent workflow`,
              results,
              agentWorkflow: true,
              workflow: agentResult.workflow,
              agentStatus: agentResult.agentStatus,
              statusUpdates: agentResult.statusUpdates || []
            }
          }
        }
        
        // If no tool executions, just return the agent result
        return args
      }
      
      // Handle client-side tool execution
      const adapter = adapterRegistry.get(toolName)
      if (!adapter) {
        console.error('No adapter found for tool:', toolName)
        return { error: `Tool ${toolName} not found` }
      }
      
      // SELECTION ENFORCEMENT: Check if tool requires selection
      const requiresSelection = adapter.metadata?.category === 'canvas-editing' && 
                              adapter.metadata?.worksOn !== 'new-image'
      
      if (requiresSelection) {
        // Get current canvas state
        const canvasStore = useCanvasStore.getState()
        const { fabricCanvas } = canvasStore
        
        if (fabricCanvas) {
          const objectCount = fabricCanvas.getObjects().length
          const selectionCount = fabricCanvas.getActiveObjects().length
          
          // Check if we have multiple objects with no selection
          if (objectCount > 1 && selectionCount === 0) {
            console.log(`[SelectionEnforcement] BLOCKED: ${toolName} - Multiple objects with no selection`)
            
            return {
              success: false,
              error: 'selection-required',
              message: `I see you have ${objectCount} objects on the canvas. Please select the ones you'd like me to edit first.

To select objects:
- Click on an object to select it
- Hold Shift and click to select multiple objects
- Or use Cmd/Ctrl+A to select all

Once you've made your selection, just tell me what you'd like to do!`,
              objectCount,
              requiresSelection: true
            }
          }
        }
      }
      
      console.log('Executing tool on client:', toolName)
      
      // Get fresh state from store
      const currentState = useCanvasStore.getState()
      console.log('[AIChat] Canvas ready:', currentState.isReady)
      console.log('[AIChat] FabricCanvas:', currentState.fabricCanvas)
      
      // Double-check canvas is ready after waiting
      if (!currentState.fabricCanvas) {
        throw new Error('Canvas is not available after initialization.')
      }
      
      // Execute the tool
      const result = await ClientToolExecutor.execute(toolName, args)
      console.log('[AIChat] Tool execution result:', result)
      return result
    } catch (error) {
      console.error('[AIChat] Tool execution error:', error)
      throw error
    }
  }, [waitForReady, onAgentThinkingStart, onAgentThinkingEnd, onAgentThinkingStep])
  
  return { handleToolCall }
} 