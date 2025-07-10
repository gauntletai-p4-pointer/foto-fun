import { useState, useCallback } from 'react'
import { Brain, Camera, Eye, Wrench, Zap } from 'lucide-react'
import { useCanvasStore } from '@/store/canvasStore'
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import type { WorkflowProgress } from '../WorkflowProgressIndicator'

export function useToolCallHandler(waitForReady: () => Promise<void>) {
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null)
  
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
        
        // Show evaluation progress
        setWorkflowProgress({
          currentStep: 'Capturing canvas state',
          steps: [
            { id: 'capture', label: 'Capturing canvas state', icon: <Camera className="w-4 h-4" />, status: 'active' },
            { id: 'analyze', label: 'Analyzing with vision AI', icon: <Eye className="w-4 h-4" />, status: 'pending' },
            { id: 'evaluate', label: 'Evaluating improvements', icon: <Brain className="w-4 h-4" />, status: 'pending' }
          ],
          progress: 33
        })
        
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
          
          // Update progress - analyzing
          setWorkflowProgress(prev => prev ? {
            ...prev,
            currentStep: 'Analyzing with vision AI',
            steps: prev.steps.map(s => 
              s.id === 'capture' ? { ...s, status: 'completed' } :
              s.id === 'analyze' ? { ...s, status: 'active' } :
              s
            ),
            progress: 66
          } : null)
          
          // Clear workflow progress before returning (server will evaluate)
          setTimeout(() => setWorkflowProgress(null), 1000)
          
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
        
        // Show initial workflow progress
        setWorkflowProgress({
          currentStep: 'Analyzing your request',
          steps: [
            { id: 'analyze', label: 'Analyzing your request', icon: <Brain className="w-4 h-4" />, status: 'active' },
            { id: 'determine', label: 'Determining best approach', icon: <Zap className="w-4 h-4" />, status: 'pending' },
            { id: 'plan', label: 'Creating execution plan', icon: <Brain className="w-4 h-4" />, status: 'pending' },
            { id: 'execute', label: 'Executing improvements', icon: <Wrench className="w-4 h-4" />, status: 'pending' },
            { id: 'evaluate', label: 'Evaluating results', icon: <Eye className="w-4 h-4" />, status: 'pending' }
          ],
          progress: 20
        })
        
        // Small delay to show the progress
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Update progress - determining approach
        setWorkflowProgress(prev => prev ? {
          ...prev,
          currentStep: 'Determining best approach',
          steps: prev.steps.map(s => 
            s.id === 'analyze' ? { ...s, status: 'completed' } :
            s.id === 'determine' ? { ...s, status: 'active' } :
            s
          ),
          progress: 40
        } : null)
        
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
            toolExecutions?: Array<{ 
              toolName: string
              params: unknown
              description?: string
              confidence?: number
            }>
            message?: string
          }
        console.log('[AIChat] Agent result:', agentResult)
        
        // Update progress - creating plan
        setWorkflowProgress(prev => prev ? {
          ...prev,
          currentStep: 'Creating execution plan',
          steps: prev.steps.map(s => 
            s.id === 'determine' ? { ...s, status: 'completed' } :
            s.id === 'plan' ? { ...s, status: 'active' } :
            s
          ),
          progress: 60
        } : null)
        
        // Check if approval is required
        if (agentResult.approvalRequired && agentResult.step) {
          console.log('[AIChat] Approval required for agent workflow')
          
          // Clear workflow progress when approval is needed
          setWorkflowProgress(null)
          
          // Return approval required response
          return {
            success: false,
            approvalRequired: true,
            message: agentResult.message || `Approval required: ${agentResult.step.description}`,
            step: agentResult.step,
            workflow: agentResult.workflow,
            agentStatus: agentResult.agentStatus,
            toolExecutions: agentResult.toolExecutions
          }
        }
        
        // If no approval required and we have tool executions, execute them
        if (agentResult.success && agentResult.toolExecutions && agentResult.toolExecutions.length > 0) {
          console.log('[AIChat] Agent workflow - auto-executing planned tools:', agentResult.toolExecutions)
          
          // Update progress - executing
          setWorkflowProgress(prev => prev ? {
            ...prev,
            currentStep: 'Executing improvements',
            steps: prev.steps.map(s => 
              s.id === 'plan' ? { ...s, status: 'completed' } :
              s.id === 'execute' ? { ...s, status: 'active' } :
              s
            ),
            progress: 80
          } : null)
          
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
                continueOnError: false
              })
              
              console.log('[AIChat] Tool chain completed successfully:', chainResult)
              
              // Clear workflow progress after execution
              setWorkflowProgress(null)
              
              return {
                success: true,
                message: agentResult.message || `Executed ${agentResult.toolExecutions.length} tools from agent workflow`,
                results: chainResult,
                agentWorkflow: true,
                workflow: agentResult.workflow,
                agentStatus: agentResult.agentStatus
              }
            } catch (error) {
              console.error('[AIChat] Tool chain execution failed:', error)
              
              // Clear workflow progress on error
              setWorkflowProgress(null)
              
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Chain execution failed',
                agentWorkflow: true,
                workflow: agentResult.workflow,
                agentStatus: agentResult.agentStatus
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
            
            // Clear workflow progress after execution
            setWorkflowProgress(null)
            
            return {
              success: true,
              message: agentResult.message || `Executed ${results.length} tools from agent workflow`,
              results,
              agentWorkflow: true,
              workflow: agentResult.workflow,
              agentStatus: agentResult.agentStatus
            }
          }
        }
        
        // If no tool executions, just return the agent result
        return args
      }
      
      // Default tool execution
      console.log('[AIChat] === EXECUTING INDIVIDUAL TOOL ===')
      console.log('[AIChat] Final tool name:', toolName)
      console.log('[AIChat] Final args:', args)
      
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
  }, [waitForReady])
  
  return { handleToolCall, workflowProgress }
} 