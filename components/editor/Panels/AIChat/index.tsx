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
  
  return parts.map((part, index) => {
    // Check if this part is a tool name
    if (toolNames.some(tool => tool.toLowerCase() === part.toLowerCase())) {
      return (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 bg-primary text-primary-foreground rounded-md text-xs font-medium"
        >
          <Wrench className="w-3 h-3" />
          {part}
        </span>
      )
    }
    return part
  })
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
    if (!isLoading && suggestion && currentState.isReady) {
      // Include canvas context with quick actions too
      const canvasContext = currentState.fabricCanvas ? {
        dimensions: {
          width: currentState.fabricCanvas.getWidth(),
          height: currentState.fabricCanvas.getHeight()
        },
        hasContent: currentState.hasContent(),
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
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
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
            <div className="flex gap-2">
              {/* Bot avatar - same as actual messages */}
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
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
            <div key={message.id}>
              
              <div
                className={cn(
                  "flex gap-2",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
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
                      const toolOutput = toolPart.state === 'output-available' ? toolPart.output as { 
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
                      } | undefined : undefined
                      
                      const agentStatus = toolOutput?.agentStatus
                      const statusUpdates = toolOutput?.statusUpdates
                      
                      return (
                        <div key={`${message.id}-${index}`} className="space-y-2">
                          {/* Show agent status updates if available and settings allow */}
                          {isAgentExecution && statusUpdates && aiSettings.showConfidenceScores && (
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
                          
                          {/* Tool invocation display - clean badge/chip style */}
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="flex items-center gap-1.5 px-2 py-1">
                              {toolPart.state === 'input-streaming' && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              )}
                              {toolPart.state === 'output-available' && !toolPart.errorText && (
                                <Check className="w-3 h-3 text-green-600" />
                              )}
                              {toolPart.state === 'output-error' && (
                                <X className="w-3 h-3 text-red-600" />
                              )}
                              <span className="font-medium">
                                {toolName}
                              </span>
                            </Badge>
                          </div>
                          
                          {/* Additional info in a compact way */}
                          <div className="space-y-1">
                              
                              {/* Show confidence and approval info if settings allow */}
                              {(() => {
                                if (toolOutput && aiSettings.showApprovalDecisions && agentStatus) {
                                  return (
                                    <div className="text-xs text-muted-foreground">
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
                                <div className="text-xs text-muted-foreground">
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
                                <div className="text-xs text-red-600">
                                  Error: {toolPart.errorText}
                                </div>
                              )}
                              
                              {/* Show output for non-agent tools */}
                              {toolPart.output && toolPart.state === 'output-available' && !isAgentExecution && (
                                <div className="text-xs text-muted-foreground">
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
                
                {message.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-foreground" />
                  </div>
                )}
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
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-foreground/5 text-foreground rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
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
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isCanvasReady ? (hasContent() ? "Ask me anything about editing your photo..." : "Ask me to generate or edit photos...") : "Waiting for canvas to load..."}
            disabled={isLoading || !isCanvasReady}
            className="flex-1 text-foreground bg-background"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || !isCanvasReady}
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
    </div>
  )
} 