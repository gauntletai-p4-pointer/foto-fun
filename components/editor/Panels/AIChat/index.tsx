'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Wrench, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import { useCanvasStore } from '@/store/canvasStore'
import { adapterRegistry } from '@/lib/ai/adapters/registry'

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
    onToolCall: async ({ toolCall }) => {
      // Execute tool on client side
      try {
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
      // Include canvas context with each message
      const canvasContext = currentState.fabricCanvas ? {
        dimensions: {
          width: currentState.fabricCanvas.getWidth(),
          height: currentState.fabricCanvas.getHeight()
        },
        hasContent: currentState.fabricCanvas.getObjects().length > 0
      } : undefined
      
      sendMessage(
        { text: input },
        { body: { canvasContext } }
      )
      setInput('')
    }
  }, [input, isLoading, sendMessage])
  
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
        hasContent: currentState.fabricCanvas.getObjects().length > 0
      } : undefined
      
      sendMessage(
        { text: suggestion },
        { body: { canvasContext } }
      )
    }
  }, [isLoading, sendMessage])
  
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
              Please open an image file to start editing.
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
                  <p className="text-sm">Welcome! I&apos;m ready to help edit your photo. What would you like to do?</p>
                </div>
                
                {/* Quick start suggestions */}
                <div className="space-y-2">
                  <p className="text-xs text-foreground/60 ml-1">Try asking me to...</p>
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
                        className="text-xs px-2 py-1 rounded-md bg-foreground/10 hover:bg-foreground/10/80 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isCanvasReady || !hasContent()}
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
            <div
              key={message.id}
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
                  
                  // Check if it's a tool invocation part (handles both generic and specific tool types)
                  if (part.type === 'tool-invocation' || 
                      part.type?.startsWith('tool-') || 
                      (part as unknown as { toolInvocation?: unknown }).toolInvocation) {
                    
                    // Handle AI SDK v5 tool message format
                    const toolData = part as unknown as {
                      type?: string
                      toolInvocation?: {
                        toolName?: string
                        state?: string
                        input?: unknown
                        output?: unknown
                        errorText?: string
                        toolCallId?: string
                      }
                      toolName?: string
                      state?: string
                      input?: unknown
                      output?: unknown
                      errorText?: string
                      toolCallId?: string | number
                    }
                    const toolName = toolData.type?.startsWith('tool-') ? toolData.type.substring(5) : 
                                   toolData.toolInvocation?.toolName || 
                                   toolData.toolName || 
                                   'unknown'
                    
                    const state = toolData.state || toolData.toolInvocation?.state
                    const input = toolData.input || toolData.toolInvocation?.input
                    const output = toolData.output || toolData.toolInvocation?.output
                    const errorText = toolData.errorText || toolData.toolInvocation?.errorText
                    const toolCallId = toolData.toolCallId || toolData.toolInvocation?.toolCallId || index
                    
                    return (
                      <div
                        key={toolCallId}
                        className="mt-2 p-3 bg-background/50 rounded border border-foreground/10/50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium">
                            <Wrench className="w-3 h-3" />
                            {toolName}
                          </span>
                          {state === 'output-available' && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                          {state === 'output-error' && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white">
                              <X className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        
                        {state === 'input-streaming' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-foreground/60">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-xs">Preparing parameters...</span>
                            </div>
                            {input ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-foreground/60 hover:text-foreground">Parameters</summary>
                                <pre className="mt-1 bg-foreground/10/50 p-2 rounded overflow-auto">
                                  {String(JSON.stringify(input, null, 2))}
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        )}
                        
                        {state === 'input-available' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-foreground/60">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span className="text-xs">Executing...</span>
                            </div>
                            {input ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-foreground/60 hover:text-foreground">Parameters</summary>
                                <pre className="mt-1 bg-foreground/10/50 p-2 rounded overflow-auto">
                                  {String(JSON.stringify(input, null, 2))}
                                </pre>
                              </details>
                            ) : null}
                          </div>
                        )}
                        
                        {state === 'output-available' && output ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-foreground/60 hover:text-foreground">Result</summary>
                            <pre className="mt-1 bg-foreground/10/50 p-2 rounded overflow-auto">
                              {String(JSON.stringify(output, null, 2))}
                            </pre>
                          </details>
                        ) : null}
                        
                        {state === 'output-error' && (
                          <div className="text-xs text-destructive/90">
                            {errorText || 'Unknown error occurred'}
                          </div>
                        )}
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
          ))}
          
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
            placeholder={isCanvasReady ? "Ask me anything about editing your photo..." : "Waiting for canvas to load..."}
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
          {quickActions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleQuickAction(suggestion)}
              className="text-xs px-2 py-1 rounded-md bg-foreground/10 hover:bg-foreground/10/80 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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