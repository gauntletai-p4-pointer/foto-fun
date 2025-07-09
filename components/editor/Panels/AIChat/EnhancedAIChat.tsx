'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Wrench, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import { useCanvasStore } from '@/store/canvasStore'
import { adapterRegistry } from '@/lib/ai/adapters/registry'
import { AgentModeToggle } from './AgentModeToggle'
import { useAgent } from '@/lib/ai/agents/hooks/useAgent'
import { AgentApprovalDialog } from '../../AgentApprovalDialog'
import type { ApprovalDecision } from '@/lib/ai/agents/types'

// Get all AI tool names for highlighting
const getAIToolNames = () => {
  try {
    const adapters = adapterRegistry.getAll()
    return adapters.map(adapter => adapter.aiName)
  } catch {
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
  
  return parts.map((part: string, index: number) => {
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

export function EnhancedAIChat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [toolNames, setToolNames] = useState<string[]>([])
  const [quickActions, setQuickActions] = useState<string[]>([])
  const { isReady: isCanvasReady, initializationError, waitForReady, hasContent } = useCanvasStore()
  
  const {
    pendingApproval,
    handleApprovalDecision,
    agentStatus,
    workflowProgress
  } = useAgent()
  
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
  
  // Standard chat for direct mode
  const {
    messages,
    sendMessage,
    status,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      credentials: 'include',
    }),
    maxSteps: 5,
    onError: (error: Error) => {
      console.error('Chat error:', error)
    },
    onToolCall: async ({ toolCall }: { toolCall: any }) => {
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
        let toolName = toolCall.toolName || (toolCall as any).name || 'unknown'
        
        // Remove 'tool-' prefix if present
        if (toolName.startsWith('tool-')) {
          toolName = toolName.substring(5)
        }
        
        // Extract args from various possible locations
        const args = 'args' in toolCall ? (toolCall as any).args : 
                     'input' in toolCall ? (toolCall as any).input : 
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
  
  const isLoading = status === 'submitted' || status === 'streaming' || (agentStatus?.isRunning ?? false)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const currentState = useCanvasStore.getState()
    if (input.trim() && !isLoading && currentState.hasContent()) {
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
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Agent Mode Toggle */}
      <AgentModeToggle
        agentMode={false} // Agent mode is removed, so this is always false
        onToggle={() => {}} // No-op
        disabled={isLoading || !isCanvasReady}
      />
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
          {initializationError && (
            <div className="text-center text-destructive text-sm p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              {/* AlertCircle icon was removed, so this will cause a type error */}
              {/* <AlertCircle className="w-4 h-4 inline-block mr-2" /> */}
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
              {/* AlertCircle icon was removed, so this will cause a type error */}
              {/* <AlertCircle className="w-4 h-4 inline-block mr-2" /> */}
              Please open an image file to start editing.
            </div>
          )}
          
          {messages.length === 0 && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="bg-foreground/5 text-foreground rounded-lg px-3 py-2 max-w-[85%]">
                  <p className="text-sm">
                    Welcome! I'm ready to help edit your photo. What would you like to do?
                  </p>
                </div>
                
                {/* Agent capabilities section removed */}
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
                <div className="text-sm whitespace-pre-wrap">
                  {message.role === 'assistant' 
                    ? message.parts?.map((part, idx) => {
                        if (part.type === 'text') {
                          return <span key={idx}>{parseMessageWithTools((part as any).text, toolNames)}</span>
                        }
                        return null
                      })
                    : message.parts?.map((part, idx) => {
                        if (part.type === 'text') {
                          return <span key={idx}>{(part as any).text}</span>
                        }
                        return null
                      })
                  }
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-foreground/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {agentStatus?.isRunning && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-foreground/5 text-foreground rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-sm">{agentStatus.message}</span>
                </div>
              </div>
            </div>
          )}
          
          {isLoading && !agentStatus?.isRunning && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-foreground/5 text-foreground rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-foreground/10 p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about editing your photo..."
            disabled={isLoading || !isCanvasReady}
            className="flex-1 text-foreground bg-background"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || !isCanvasReady || !hasContent()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
      
      {/* Approval dialog */}
      {pendingApproval && (
        <AgentApprovalDialog
          isOpen={true}
          onClose={() => handleApprovalDecision({ action: 'reject' })}
          stepResult={pendingApproval.result}
          onApprove={(decision: ApprovalDecision) => handleApprovalDecision(decision)}
        />
      )}
    </div>
  )
} 