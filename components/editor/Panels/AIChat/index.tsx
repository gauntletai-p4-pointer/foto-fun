'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Wrench, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import { useCanvasStore } from '@/store/canvasStore'
import { adapterRegistry } from '@/lib/ai/adapters/registry'
import { AgentStatusPart } from './AgentStatusPart'
import { AgentWorkflowDisplay } from './AgentWorkflowDisplay'
import { useAISettings } from '@/hooks/useAISettings'

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
  const [input, setInput] = useState('')
  const [toolNames, setToolNames] = useState<string[]>([])
  const [quickActions, setQuickActions] = useState<string[]>([])
  const { isReady: isCanvasReady, initializationError, waitForReady, hasContent } = useCanvasStore()
  const { settings: aiSettings } = useAISettings()
  
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
        
        // SPECIAL HANDLING: If this is the agent workflow tool, execute the planned tools directly
        if (toolName === 'executeAgentWorkflow') {
          const agentResult = args as { toolExecutions?: Array<{ toolName: string; params: unknown }> }
          
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
        
        // Check if there's actually an image loaded
        if (objects.length === 0) {
          throw new Error('No image loaded. Please open an image file before using AI tools.')
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
    if (input.trim() && !isLoading && currentState.hasContent()) {
      // Include canvas context and AI settings with each message
      const canvasContext = currentState.fabricCanvas ? {
        dimensions: {
          width: currentState.fabricCanvas.getWidth(),
          height: currentState.fabricCanvas.getHeight()
        },
        hasContent: true,
        objectCount: currentState.fabricCanvas.getObjects().length
      } : null
      
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
    if (!isLoading && suggestion && currentState.hasContent()) {
      // Include canvas context with quick actions too
      const canvasContext = currentState.fabricCanvas ? {
        dimensions: {
          width: currentState.fabricCanvas.getWidth(),
          height: currentState.fabricCanvas.getHeight()
        },
        hasContent: true,
        objectCount: currentState.fabricCanvas.getObjects().length
      } : null
      
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
              Please open an image file to start editing.
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
              
              {/* Welcome message content */}
              <div className="flex justify-start">
                <div className="max-w-[95%] bg-foreground/5 text-foreground rounded-lg rounded-tl-sm px-3 py-2">
                  <p className="text-sm mb-3">Welcome! I&apos;m ready to help edit your photo. What would you like to do?</p>
                  
                  {/* Quick start suggestions */}
                  <div className="space-y-2">
                    <p className="text-xs text-foreground/60">Try asking me to...</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Enhance the colors",
                        "Make it brighter",
                        "Add blur effect",
                        "Convert to black & white"
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleQuickAction(suggestion)}
                          className="text-xs px-2 py-1 rounded-md bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!isCanvasReady || !hasContent()}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
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
                      
                      // Check if this is the executeAgentWorkflow tool with agent status
                      const isAgentExecution = toolName === 'executeAgentWorkflow'
                      
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
                          {/* Show agent workflow display if available */}
                          {isAgentExecution && workflow && agentStatus && (
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
                          )}
                          
                          {/* Show agent status updates if available and settings allow (fallback for non-workflow) */}
                          {isAgentExecution && statusUpdates && !workflow && aiSettings.showConfidenceScores && (
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
                          )}
                          
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
      <form onSubmit={handleSubmit} className="border-t border-foreground/10 p-4">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isCanvasReady ? "Ask me anything about editing your photo..." : "Waiting for canvas to load..."}
            disabled={isLoading || !isCanvasReady}
            className="flex-1 text-foreground bg-background border-foreground/20 focus:border-primary"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || !isCanvasReady}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Quick actions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickActions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleQuickAction(suggestion)}
              className="text-xs px-3 py-1.5 rounded-full bg-foreground/10 hover:bg-foreground/20 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !isCanvasReady || !hasContent()}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
} 