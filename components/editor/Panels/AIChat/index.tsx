'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Wrench, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import { useCanvasStore } from '@/store/canvasStore'
import { adapterRegistry } from '@/lib/ai/adapters/registry'
import { AgentStatusPart } from './AgentStatusPart'
import { AgentWorkflowDisplay } from './AgentWorkflowDisplay'
import { useAISettings } from '@/hooks/useAISettings'
import { AgentApprovalDialog } from '../../AgentApprovalDialog'
import type { ApprovalDecision, StepResult } from '@/lib/ai/agents/types'
import { AlertTriangle } from 'lucide-react'

// Get all AI tool names for highlighting
const getAIToolNames = () => {
  try {
    const adapters = adapterRegistry.getAll()
    return adapters.map(adapter => adapter.aiName)
  } catch {
    // Return empty array if adapters not loaded yet
    return []
  }
}

// Function to parse text and highlight tool names
const parseMessageWithTools = (text: string, toolNames: string[]) => {
  // If no tool names available, just return the text
  if (toolNames.length === 0) {
    return text
  }
  
  // Create a regex pattern that matches any tool name
  const toolPattern = new RegExp(`\\b(${toolNames.join('|')})\\b`, 'gi')
  
  // Split text by tool names while keeping the matched parts
  const parts = text.split(toolPattern)
  
  return (
    <span>
      {parts.map((part, index) => {
        // Check if this part is a tool name
        if (toolNames.some(tool => tool.toLowerCase() === part.toLowerCase())) {
          return (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-primary text-primary-foreground rounded-md text-xs font-medium"
              style={{ userSelect: 'text' }}
            >
              <Wrench className="w-3 h-3" style={{ userSelect: 'none' }} />
              {part}
            </span>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}

export function AIChat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  const [toolNames, setToolNames] = useState<string[]>([])
  const [quickActions, setQuickActions] = useState<string[]>([])
  const { isReady: isCanvasReady, initializationError, waitForReady, hasContent } = useCanvasStore()
  const { settings: aiSettings } = useAISettings()
  
  // Add approval dialog state
  const [pendingApproval, setPendingApproval] = useState<{
    stepResult: StepResult
    messageId: string
    toolIndex: number
  } | null>(null)
  
  // Auto-resize textarea with max height
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const minHeight = 2 * 24 // 2 lines * 24px line height
      const maxHeight = 8 * 24 // 8 lines * 24px line height
      textareaRef.current.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`
    }
  }, [])
  
  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])
  
  // Handle Enter key to send message
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Trigger form submission
      const form = e.currentTarget.form
      if (form) {
        form.requestSubmit()
      }
    }
  }, [])
  
  // Initialize adapter registry and get tool names
  useEffect(() => {
    const loadAdapters = async () => {
      try {
        const { autoDiscoverAdapters } = await import('@/lib/ai/adapters/registry')
        await autoDiscoverAdapters()
        const names = getAIToolNames()
        setToolNames(names)
      } catch (error) {
        console.error('Failed to load adapters:', error)
      }
    }
    loadAdapters()
  }, [])
  
  // Initialize quick actions - rotate on each mount
  useEffect(() => {
    const allQuickActions = [
      // Brightness & Exposure
      "Make it brighter",
      "Make it darker",
      "Fix the lighting",
      "Increase exposure",
      
      // Color adjustments
      "Enhance colors",
      "Make it more vibrant",
      "Mute the colors",
      "Warmer tones",
      "Cooler tones",
      
      // Effects & Filters
      "Convert to black & white",
      "Add sepia tone",
      "Invert colors",
      "Add blur effect",
      "Sharpen the image",
      
      // Contrast & Style
      "Increase contrast",
      "Softer look",
      "Make it dramatic",
      "Vintage style",
      
      // Transform
      "Rotate 90 degrees",
      "Flip horizontally",
      "Crop to square"
    ]
    
    // Shuffle and pick 4 random actions
    const shuffled = [...allQuickActions].sort(() => Math.random() - 0.5)
    setQuickActions(shuffled.slice(0, 4))
  }, [])
  
  const {
    messages,
    sendMessage,
    status,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      credentials: 'include',
    }),
    maxSteps: 5, // Enable multi-step tool calls
    onError: (error: Error) => {
      console.error('Chat error:', error)
    },
    onFinish: ({ message }) => {
      console.log('[AIChat] onFinish called with message:', message)
      console.log('[AIChat] Message parts:', message.parts)
    },
    onToolCall: async ({ toolCall }) => {
      // Execute tool on client side
      try {
        console.log('[AIChat] ===== onToolCall TRIGGERED =====')
        console.log('[AIChat] onToolCall triggered with:', toolCall)
        console.log('[AIChat] toolCall structure:', JSON.stringify(toolCall, null, 2))
        console.log('[AIChat] toolCall type:', typeof toolCall)
        console.log('[AIChat] toolCall keys:', Object.keys(toolCall))
        
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
        
        // SPECIAL HANDLING: If this is the agent workflow tool, check for approval required
        if (toolName === 'executeAgentWorkflow') {
          console.log('[AIChat] === AGENT WORKFLOW TOOL DETECTED ===')
          const agentResult = args as { 
            success?: boolean
            approvalRequired?: boolean
            step?: {
              id: string
              description: string
              confidence: number
              threshold: number
            }
            toolExecutions?: Array<{ toolName: string; params: unknown }> 
          }
          console.log('[AIChat] Agent result:', agentResult)
          
          // Check if approval is required
          if (agentResult.approvalRequired && agentResult.step) {
            console.log('[AIChat] Approval required for agent workflow')
            
            // Create step result for approval dialog
            const stepResult: StepResult = {
              success: false,
              data: agentResult,
              confidence: agentResult.step.confidence,
              preview: {
                before: '', // Will be populated by UI
                after: '', // Will be populated by UI
                diff: agentResult.step.description
              }
            }
            
            // Show approval dialog by setting pending approval state
            setPendingApproval({
              stepResult,
              messageId: 'current', // We'll use this to identify the message
              toolIndex: 0
            })
            
            // Return approval required response
            return {
              success: false,
              approvalRequired: true,
              message: `Approval required: ${agentResult.step.description}`,
              step: agentResult.step
            }
          }
          
          // If no approval required, execute planned tools
          if (agentResult.toolExecutions && agentResult.toolExecutions.length > 0) {
            console.log('[AIChat] Agent workflow - executing planned tools:', agentResult.toolExecutions)
            
            // Execute each planned tool in sequence
            const results = []
            for (const toolExecution of agentResult.toolExecutions) {
              try {
                console.log(`[AIChat] Executing planned tool: ${toolExecution.toolName}`, toolExecution.params)
                const toolResult = await ClientToolExecutor.execute(toolExecution.toolName, toolExecution.params)
                results.push({
                  toolName: toolExecution.toolName,
                  success: true,
                  result: toolResult
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
              message: `Executed ${results.length} tools from agent workflow`,
              results,
              agentWorkflow: true
            }
          }
          
          // If no tool executions, just return the agent result
          return args
        }
        
        console.log('[AIChat] === EXECUTING INDIVIDUAL TOOL ===')
        console.log('[AIChat] Final tool name:', toolName)
        console.log('[AIChat] Final args:', args)
        
        // Get fresh state from store instead of using stale closure values
        const currentState = useCanvasStore.getState()
        console.log('[AIChat] Canvas ready:', currentState.isReady)
        console.log('[AIChat] FabricCanvas:', currentState.fabricCanvas)
        
        // Double-check canvas is ready after waiting
        if (!currentState.fabricCanvas) {
          throw new Error('Canvas is not available after initialization.')
        }
        
        const objects = currentState.fabricCanvas.getObjects()
        console.log('[AIChat] Canvas objects:', objects.length)
        
        // Check if there's actually an image loaded (some tools like image generation don't need existing content)
        if (objects.length === 0) {
          // Only show this warning for tools that require existing content
          // Image generation and other AI-native tools can work with empty canvas
          console.log('[AIChat] Canvas is empty, but some tools (like image generation) can work with empty canvas')
        }
        
        // Execute the tool - canvas context is now handled internally by ClientToolExecutor
        const result = await ClientToolExecutor.execute(toolName, args)
        console.log('[AIChat] Tool execution result:', result)
        return result
      } catch (error) {
        console.error('[AIChat] Tool execution error:', error)
        throw error
      }
    }
  })
  
  const isLoading = status === 'submitted' || status === 'streaming'
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    // Get fresh state from store
    const currentState = useCanvasStore.getState()
    if (input.trim() && !isLoading && currentState.isReady) {
      // Include canvas context and AI settings with each message
      const canvasContext = currentState.fabricCanvas ? {
        dimensions: {
          width: currentState.fabricCanvas.getWidth(),
          height: currentState.fabricCanvas.getHeight()
        },
        hasContent: currentState.hasContent(),
        objectCount: currentState.fabricCanvas.getObjects().length,
        hasSelection: !!currentState.selectionManager?.getSelection()
      } : null
      console.log('[AIChat] Sending canvasContext:', canvasContext);
      
      sendMessage(
        { text: input },
        { 
          body: {
            canvasContext,
            agentMode: true, // Simplified agent mode - just enables multi-step reasoning
            aiSettings: {
              autoApproveThreshold: aiSettings.autoApproveThreshold,
              showConfidenceScores: aiSettings.showConfidenceScores,
              showApprovalDecisions: aiSettings.showApprovalDecisions,
              showEducationalContent: aiSettings.showEducationalContent,
              stepByStepMode: aiSettings.stepByStepMode,
            }
          }
        }
      )
      setInput('')
    }
  }, [input, isLoading, sendMessage, aiSettings])
  
  const handleQuickAction = useCallback((suggestion: string) => {
    // Get fresh state from store
    const currentState = useCanvasStore.getState()
    if (!isLoading && suggestion && currentState.isReady) {
      // Include canvas context with quick actions too
      const canvasContext = currentState.fabricCanvas ? {
        dimensions: {
          width: currentState.fabricCanvas.getWidth(),
          height: currentState.fabricCanvas.getHeight()
        },
        hasContent: currentState.hasContent(),
        objectCount: currentState.fabricCanvas.getObjects().length,
        hasSelection: !!currentState.selectionManager?.getSelection()
      } : null
      console.log('[AIChat] Sending canvasContext:', canvasContext);
      
      sendMessage(
        { text: suggestion },
        { 
          body: { 
            canvasContext, 
            agentMode: true,
            aiSettings: {
              autoApproveThreshold: aiSettings.autoApproveThreshold,
              showConfidenceScores: aiSettings.showConfidenceScores,
              showApprovalDecisions: aiSettings.showApprovalDecisions,
              showEducationalContent: aiSettings.showEducationalContent,
              stepByStepMode: aiSettings.stepByStepMode,
            }
          } 
        }
      )
    }
  }, [isLoading, sendMessage, aiSettings])
  
  // Handle approval decision
  const handleApprovalDecision = useCallback((decision: ApprovalDecision) => {
    console.log('[AIChat] Approval decision:', decision)
    
    if (decision.action === 'approve') {
      // User approved - continue with the workflow
      // For now, we'll just close the dialog and let the user know
      // In a full implementation, this would trigger the actual tool execution
      console.log('[AIChat] User approved the workflow')
      
      // TODO: Implement actual approval handling
      // This would involve re-executing the agent workflow with approval
      
    } else if (decision.action === 'reject') {
      console.log('[AIChat] User rejected the workflow')
      
      // TODO: Implement rejection handling
      // This could involve asking for a different approach or canceling
      
    } else if (decision.action === 'modify') {
      console.log('[AIChat] User wants to modify the workflow')
      
      // TODO: Implement modification handling
      // This could involve showing alternative parameters or approaches
    }
    
    // Close the approval dialog
    setPendingApproval(null)
  }, [])
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {initializationError && (
            <div className="text-center text-destructive text-sm p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertCircle className="w-4 h-4 inline-block mr-2" />
              Canvas initialization failed. Please refresh the page.
            </div>
          )}
          
          {!isCanvasReady && !initializationError && (
            <div className="text-center text-warning text-sm p-3 bg-warning/10 rounded-lg border border-warning/20">
              <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
              Canvas is initializing... Please wait.
            </div>
          )}
          
          {isCanvasReady && !hasContent() && (
            <div className="text-center text-foreground/60 text-sm p-3 bg-foreground/10/10 rounded-lg border border-foreground/20">
              <AlertCircle className="w-4 h-4 inline-block mr-2" />
              Canvas is ready! Open an image file to start editing, or ask me to generate one.
            </div>
          )}
          
          {messages.length === 0 && (
            <div className="space-y-1">
              {/* Welcome message header */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-2.5 h-2.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">AI Assistant</span>
              </div>
              
              {/* Welcome message styled like assistant message */}
              <div className="flex-1 space-y-3">
                <div className="bg-foreground/5 text-foreground rounded-lg px-3 py-2 max-w-[85%]">
                  <p className="text-sm">Welcome! I&apos;m ready to help you {hasContent() ? 'edit your photo' : 'generate or edit photos'}. What would you like to do?</p>
                </div>
                
                {/* Quick start suggestions */}
                <div className="space-y-2">
                  <p className="text-xs text-foreground/60 ml-1">Try asking me to...</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(hasContent() ? [
                      "Enhance the colors",
                      "Make it brighter",
                      "Add blur effect",
                      "Convert to black & white"
                    ] : [
                      "Generate an image of a sunset",
                      "Create a logo design",
                      "Generate a landscape photo",
                      "Create abstract art"
                    ]).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleQuickAction(suggestion)}
                        className="text-xs px-2 py-1 rounded-md bg-foreground/10 hover:bg-foreground/10/80 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isCanvasReady || isLoading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message: UIMessage) => (
            <div key={message.id} className="space-y-1">
              
              {/* Message header with icon and timestamp */}
              <div className={cn(
                "flex items-center gap-2 px-1",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}>
                {message.role === 'assistant' ? (
                  <>
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">AI Assistant</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground font-medium">You</span>
                    <div className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-foreground" />
                    </div>
                  </>
                )}
              </div>
              
              {/* Message content */}
              <div
                className={cn(
                  "flex",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    "max-w-[95%] rounded-lg px-3 py-2",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-foreground/5 text-foreground'
                  )}
                >
                  {/* Render message parts */}
                  {message.parts?.map((part, index) => {
                    if (part.type === 'text') {
                      return (
                        <div key={index} className="text-sm whitespace-pre-wrap">
                          {message.role === 'assistant' 
                            ? parseMessageWithTools(part.text, toolNames)
                            : part.text
                          }
                        </div>
                      )
                    }
                    
                    // Check if it's a tool invocation part (AI SDK v5 uses tool-${toolName} format)
                    if (part.type?.startsWith('tool-')) {
                      
                      // Extract tool name from the type (e.g., 'tool-brightness' -> 'brightness')
                      const toolName = part.type.substring(5)
                      
                      // AI SDK v5 tool part structure - properly typed
                      const toolPart = part as {
                        type: string
                        state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
                        input?: Record<string, unknown>
                        output?: Record<string, unknown>
                        errorText?: string
                      }
                      
                      // Check if this is a cost approval request
                      if (toolName === 'requestCostApproval' && toolPart.output) {
                        const costApprovalData = toolPart.output as {
                          type?: string
                          toolName?: string
                          operation?: string
                          estimatedCost?: number
                          details?: string
                          message?: string
                        }
                        
                        if (costApprovalData?.type === 'cost-approval-required') {
                          return (
                            <div key={`${message.id}-${index}`} className="space-y-2">
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 text-blue-800">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span className="font-medium">Cost Approval Required</span>
                                </div>
                                <p className="text-sm text-blue-700 mt-1">
                                  {costApprovalData.message}
                                </p>
                                <div className="text-xs text-blue-600 mt-2 space-y-1">
                                  <div>Tool: {costApprovalData.toolName}</div>
                                  <div>Operation: {costApprovalData.operation}</div>
                                  <div>Estimated Cost: ${costApprovalData.estimatedCost?.toFixed(3)}</div>
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                  Please respond with &quot;yes&quot; or &quot;approve&quot; to continue, or &quot;no&quot; to cancel.
                                </p>
                              </div>
                            </div>
                          )
                        }
                      }
                      
                      // Check if this is the executeAgentWorkflow tool with agent status
                      const isAgentExecution = toolName === 'executeAgentWorkflow'
                      
                      // Check for single tool operations with transparency data
                      const isSingleToolWithTransparency = !isAgentExecution && toolPart.output && typeof toolPart.output === 'object' && 
                        ('confidence' in toolPart.output || 'confidenceFactors' in toolPart.output)
                      
                      // Extract single tool transparency data
                      const singleToolData = isSingleToolWithTransparency ? toolPart.output as {
                        type?: string
                        toolName?: string
                        params?: Record<string, unknown>
                        description?: string
                        reasoning?: string
                        confidence?: number
                        confidenceFactors?: {
                          parameterAppropriate: number
                          canvasContext: number
                          toolSuitability: number
                          riskLevel: number
                        }
                        threshold?: number
                        autoApproved?: boolean
                        approvalRequired?: boolean
                        statusUpdates?: Array<{
                          type: string
                          message: string
                          details?: string
                          timestamp: string
                        }>
                      } : null
                      
                      // Extract agent status from tool output if available
                      // Handle both successful outputs and approval-required responses
                      const toolOutput = (toolPart.state === 'output-available' || toolPart.state === 'output-error') ? toolPart.output as { 
                        agentStatus?: {
                          confidence?: number
                          approvalRequired?: boolean
                          threshold?: number
                        }
                        statusUpdates?: Array<{
                          type: string
                          message: string
                          details?: string
                          timestamp: string
                        }>
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
                        // Approval-specific fields
                        success?: boolean
                        approvalRequired?: boolean
                        step?: {
                          id: string
                          description: string
                          confidence: number
                          threshold: number
                        }
                      } | undefined : undefined
                      
                      // Debug logging to see what we're actually getting
                      if (isAgentExecution) {
                        console.log('[UI Debug] Tool part for', toolName, ':', {
                          state: toolPart.state,
                          output: toolPart.output,
                          errorText: toolPart.errorText,
                          hasOutput: !!toolOutput
                        })
                        if (toolOutput) {
                          console.log('[UI Debug] Tool output structure:', Object.keys(toolOutput))
                          console.log('[UI Debug] Agent workflow data:', {
                            hasWorkflow: !!toolOutput.workflow,
                            hasAgentStatus: !!toolOutput.agentStatus,
                            hasStatusUpdates: !!toolOutput.statusUpdates,
                            statusUpdatesLength: toolOutput.statusUpdates?.length || 0
                          })
                        }
                      }
                      
                      // Extract data, handling both normal responses and approval-required responses
                      let agentStatus = toolOutput?.agentStatus
                      const statusUpdates = toolOutput?.statusUpdates
                      const workflow = toolOutput?.workflow
                      
                      // If this is an approval-required response, extract confidence from step
                      if (toolOutput?.approvalRequired && toolOutput?.step) {
                        agentStatus = {
                          confidence: toolOutput.step.confidence,
                          approvalRequired: true,
                          threshold: toolOutput.step.threshold
                        }
                        console.log('[UI Debug] Extracted agentStatus from approval step:', agentStatus)
                      }
                      
                      return (
                        <div key={`${message.id}-${index}`} className="space-y-2">
                          {/* Show approval required message if needed (highest priority) */}
                          {(() => {
                            if (isAgentExecution && toolOutput?.approvalRequired && toolOutput?.step) {
                              return (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-amber-800">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">Manual Approval Required</span>
                                  </div>
                                  <p className="text-sm text-amber-700 mt-1">
                                    {toolOutput.step.description}
                                  </p>
                                  <p className="text-xs text-amber-600 mt-1">
                                    Confidence: {Math.round(toolOutput.step.confidence * 100)}% 
                                    (threshold: {Math.round(toolOutput.step.threshold * 100)}%)
                                  </p>
                                  <Button 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => {
                                      const stepResult: StepResult = {
                                        success: false,
                                        data: toolOutput,
                                        confidence: toolOutput.step!.confidence,
                                        preview: {
                                          before: '',
                                          after: '',
                                          diff: toolOutput.step!.description
                                        }
                                      }
                                      setPendingApproval({
                                        stepResult,
                                        messageId: message.id,
                                        toolIndex: index
                                      })
                                    }}
                                  >
                                    Review & Approve
                                  </Button>
                                </div>
                              )
                            }
                            return null
                          })()}
                          
                          {/* Show agent workflow display if available */}
                          {(() => {
                            if (isAgentExecution) {
                              console.log('[UI Debug] Agent workflow display check:', {
                                isAgentExecution,
                                hasWorkflow: !!workflow,
                                hasAgentStatus: !!agentStatus,
                                willShow: !!(workflow && agentStatus)
                              })
                            }
                            
                            if (isAgentExecution && workflow && agentStatus) {
                              return (
                                <AgentWorkflowDisplay
                                  workflow={workflow}
                                  agentStatus={{
                                    confidence: agentStatus.confidence || 0,
                                    approvalRequired: agentStatus.approvalRequired || false,
                                    threshold: agentStatus.threshold || 0.8
                                  }}
                                  statusUpdates={statusUpdates || []}
                                  showSettings={{
                                    showConfidenceScores: aiSettings.showConfidenceScores,
                                    showApprovalDecisions: aiSettings.showApprovalDecisions,
                                    showEducationalContent: aiSettings.showEducationalContent
                                  }}
                                />
                              )
                            }
                            return null
                          })()}
                          
                          {/* Show agent status updates if available and settings allow (fallback for non-workflow) */}
                          {(() => {
                            if (isAgentExecution) {
                              console.log('[UI Debug] Status updates fallback check:', {
                                isAgentExecution,
                                hasStatusUpdates: !!statusUpdates,
                                hasWorkflow: !!workflow,
                                showConfidenceScores: aiSettings.showConfidenceScores,
                                willShow: !!(statusUpdates && !workflow && aiSettings.showConfidenceScores)
                              })
                            }
                            
                            if (isAgentExecution && statusUpdates && !workflow && aiSettings.showConfidenceScores) {
                              return (
                                <div className="space-y-1">
                                  {statusUpdates.map((status, idx) => (
                                    <AgentStatusPart 
                                      key={idx}
                                      status={{
                                        type: status.type as 'analyzing-prompt' | 'routing-decision' | 'planning-steps' | 'executing-tool' | 'generating-response',
                                        message: status.message,
                                        details: status.details,
                                        timestamp: status.timestamp,
                                        confidence: agentStatus?.confidence,
                                        approvalRequired: agentStatus?.approvalRequired,
                                        approvalThreshold: agentStatus?.threshold,
                                        toolName: toolName
                                      }}
                                    />
                                  ))}
                                </div>
                              )
                            }
                            return null
                          })()}
                          
                          {/* Tool invocation display - primary blue chip with status after */}
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="default" className="bg-primary text-primary-foreground px-2 py-1">
                              <span className="font-medium">
                                {toolName}
                              </span>
                            </Badge>
                            {toolPart.state === 'input-streaming' && (
                              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                            )}
                            {toolPart.state === 'output-available' && !toolPart.errorText && (
                              <Check className="w-3 h-3 text-green-600" />
                            )}
                            {toolPart.state === 'output-error' && (
                              <X className="w-3 h-3 text-red-600" />
                            )}
                          </div>
                          
                          {/* Single Tool Transparency Display */}
                          {(() => {
                            if (singleToolData && aiSettings.showConfidenceScores) {
                              return (
                                <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
                                  {/* Reasoning */}
                                  {singleToolData.reasoning && (
                                    <div className="text-xs">
                                      <span className="font-medium text-muted-foreground">Reasoning:</span>
                                      <p className="mt-0.5">{singleToolData.reasoning}</p>
                                    </div>
                                  )}
                                  
                                  {/* Confidence Display */}
                                  {singleToolData.confidence !== undefined && (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-muted-foreground">Confidence</span>
                                        <span className={cn(
                                          "font-medium",
                                          singleToolData.confidence >= 0.8 ? "text-green-600" : 
                                          singleToolData.confidence >= 0.6 ? "text-amber-600" : "text-red-600"
                                        )}>
                                          {Math.round(singleToolData.confidence * 100)}%
                                        </span>
                                      </div>
                                      
                                      {/* Confidence Factors */}
                                      {singleToolData.confidenceFactors && (
                                        <div className="ml-2 space-y-0.5 text-xs text-muted-foreground">
                                          <div className="flex justify-between">
                                            <span>• Parameters</span>
                                            <span>{Math.round(singleToolData.confidenceFactors.parameterAppropriate * 100)}%</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>• Canvas Context</span>
                                            <span>{Math.round(singleToolData.confidenceFactors.canvasContext * 100)}%</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>• Tool Suitability</span>
                                            <span>{Math.round(singleToolData.confidenceFactors.toolSuitability * 100)}%</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span>• Risk Level</span>
                                            <span>{Math.round(singleToolData.confidenceFactors.riskLevel * 100)}%</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Approval Status */}
                                  {aiSettings.showApprovalDecisions && singleToolData.threshold !== undefined && (
                                    <div className="text-xs pt-1 border-t">
                                      {singleToolData.autoApproved ? (
                                        <span className="text-green-600">
                                          ✓ Auto-approved (threshold: {Math.round(singleToolData.threshold * 100)}%)
                                        </span>
                                      ) : singleToolData.approvalRequired ? (
                                        <span className="text-amber-600">
                                          ⚠ Approval required (threshold: {Math.round(singleToolData.threshold * 100)}%)
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            return null
                          })()}
                          
                          {/* Status Updates for Single Tools */}
                          {(() => {
                            if (singleToolData?.statusUpdates && aiSettings.showConfidenceScores) {
                              return (
                                <div className="mt-2 space-y-1">
                                  {singleToolData.statusUpdates.map((status, idx) => (
                                    <AgentStatusPart 
                                      key={idx}
                                      status={{
                                        type: status.type as 'analyzing-prompt' | 'routing-decision' | 'planning-steps' | 'executing-tool' | 'generating-response',
                                        message: status.message,
                                        details: status.details,
                                        timestamp: status.timestamp,
                                        confidence: singleToolData.confidence,
                                        approvalRequired: singleToolData.approvalRequired,
                                        approvalThreshold: singleToolData.threshold,
                                        toolName: toolName
                                      }}
                                    />
                                  ))}
                                </div>
                              )
                            }
                            return null
                          })()}
                          
                          {/* Additional info in a compact way */}
                          <div className="space-y-2">
                              
                              {/* Show confidence and approval info if settings allow */}
                              {(() => {
                                if (toolOutput && aiSettings.showApprovalDecisions && agentStatus) {
                                  return (
                                    <div className="text-xs text-muted-foreground mb-3">
                                      {agentStatus.approvalRequired ? (
                                        <span className="text-amber-600">
                                          Manual approval required (confidence: {Math.round((agentStatus.confidence || 0) * 100)}%)
                                        </span>
                                      ) : agentStatus.confidence !== undefined ? (
                                        <span className="text-green-600">
                                          Auto-approved (confidence: {Math.round(agentStatus.confidence * 100)}%)
                                        </span>
                                      ) : null}
                                    </div>
                                  )
                                }
                                return null
                              })()}
                              
                              {/* Show input for non-agent tools when available */}
                              {!isAgentExecution && (toolPart.state === 'input-available' || toolPart.state === 'output-available') && toolPart.input && (
                                <div className="text-xs text-muted-foreground mb-3">
                                  <details>
                                    <summary className="cursor-pointer">Parameters</summary>
                                    <pre className="mt-1 overflow-auto">
                                      {JSON.stringify(toolPart.input, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              )}
                              
                              {/* Show errors */}
                              {toolPart.state === 'output-error' && toolPart.errorText && (
                                <div className="text-xs text-red-600 mb-3">
                                  Error: {toolPart.errorText}
                                </div>
                              )}
                              
                              {/* Show output for non-agent tools */}
                              {toolPart.output && toolPart.state === 'output-available' && !isAgentExecution && (
                                <div className="text-xs text-muted-foreground mb-3">
                                  <details>
                                    <summary className="cursor-pointer">Result</summary>
                                    <pre className="mt-1 overflow-auto">{String(JSON.stringify(toolPart.output, null, 2))}</pre>
                                  </details>
                                </div>
                              )}
                          </div>
                        </div>
                      )
                    }
                    
                    // Skip step-start and other non-renderable parts
                    const partType = (part as unknown as { type?: string }).type
                    if (partType === 'step-start' || partType === 'step-end') {
                      return null
                    }
                    
                    return null
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Show agent statuses during loading */}
          {isLoading && (
            <div className="space-y-1 mb-2">
              {/* Agent statuses are now part of tool results, not a separate state */}
            </div>
          )}
          
          {isLoading && (
            <div className="space-y-1">
              {/* Loading message header */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-2.5 h-2.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">AI Assistant</span>
              </div>
              
              {/* Loading message content */}
              <div className="flex justify-start">
                <div className="bg-foreground/5 text-foreground rounded-lg rounded-tl-sm px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>Error: {error.message}</span>
            </div>
          ) */}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-foreground/10 p-3">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCanvasReady ? (hasContent() ? "Ask me anything about editing your photo..." : "Ask me to generate or edit photos...") : "Waiting for canvas to load..."}
            disabled={isLoading || !isCanvasReady}
            rows={2}
            className={cn(
              "flex-1 min-h-[3rem] w-full resize-none rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors outline-none overflow-y-auto",
              "placeholder:text-foreground/40",
              "hover:border-foreground/20",
              "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || !isCanvasReady}
            className="self-end"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Quick actions */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(hasContent() ? quickActions : [
            "Generate an image of a sunset",
            "Create a logo design",
            "Generate a landscape photo",
            "Create abstract art"
          ]).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleQuickAction(suggestion)}
              className="text-xs px-2 py-1 rounded-md bg-foreground/10 hover:bg-foreground/10/80 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !isCanvasReady}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
      
      {/* Approval Dialog */}
      {pendingApproval && (
        <AgentApprovalDialog
          isOpen={true}
          onClose={() => setPendingApproval(null)}
          stepResult={pendingApproval.stepResult}
          onApprove={handleApprovalDecision}
        />
      )}
    </div>
  )
} 