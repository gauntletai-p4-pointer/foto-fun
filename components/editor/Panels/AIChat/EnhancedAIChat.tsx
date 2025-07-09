'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCanvasStore } from '@/store/canvasStore'
import { AgentApprovalDialog } from '../../AgentApprovalDialog'
import { AgentModeToggle } from './AgentModeToggle'
import type { ApprovalDecision, AgentStep, StepResult, AgentContext } from '@/lib/ai/agents/types'
import { cn } from '@/lib/utils'

export function EnhancedAIChat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [agentMode, setAgentMode] = useState(false)
  const { isReady: isCanvasReady, fabricCanvas, hasContent } = useCanvasStore()
  
  // Mock pending approval state for now
  const [pendingApproval, setPendingApproval] = useState<{
    step: AgentStep
    result: StepResult
    context: AgentContext
  } | null>(null)

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
    if (input.trim() && !isLoading && fabricCanvas && hasContent()) {
      const canvasContext = {
        dimensions: {
          width: fabricCanvas.getWidth(),
          height: fabricCanvas.getHeight()
        },
        hasContent: fabricCanvas.getObjects().length > 0,
        objectCount: fabricCanvas.getObjects().length
      }
      
      sendMessage(
        { text: input },
        { body: { canvasContext, agentMode } }
      )
      setInput('')
    }
  }, [input, isLoading, sendMessage, fabricCanvas, hasContent, agentMode])

  const handleApprovalDecision = (decision: ApprovalDecision) => {
    console.log('Approval decision:', decision)
    setPendingApproval(null)
    // In real implementation, this would communicate back to the agent
  }

  // Helper to extract text from message parts
  const getMessageText = (message: UIMessage): string => {
    if (!message.parts || message.parts.length === 0) {
      return ''
    }
    
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Agent Mode Toggle */}
      <AgentModeToggle
        agentMode={agentMode}
        onToggle={setAgentMode}
        disabled={isLoading || !isCanvasReady}
      />

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
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
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm">{getMessageText(message)}</p>
                
                {/* Tool invocations display */}
                {message.parts?.some(part => 
                  part.type === 'tool-invocation' || 
                  part.type?.startsWith('tool-')
                ) && (
                  <div className="mt-2 space-y-1">
                    {message.parts
                      .filter(part => 
                        part.type === 'tool-invocation' || 
                        part.type?.startsWith('tool-')
                      )
                      .map((part, idx) => {
                        const toolName = part.type?.startsWith('tool-') 
                          ? part.type.substring(5) 
                          : (part as { toolInvocation?: { toolName?: string } }).toolInvocation?.toolName || 'unknown'
                        const state = (part as { state?: string }).state || 
                                    (part as { toolInvocation?: { state?: string } }).toolInvocation?.state || 
                                    'pending'
                        
                        return (
                          <div key={idx} className="text-xs opacity-70">
                            Tool: {toolName} ({state})
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={agentMode ? "Describe what you'd like to do..." : "Ask about editing..."}
            disabled={isLoading || !isCanvasReady}
          />
          <Button type="submit" disabled={isLoading || !fabricCanvas || !hasContent()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Approval Dialog */}
      {pendingApproval && (
        <AgentApprovalDialog
          isOpen={true}
          onClose={() => setPendingApproval(null)}
          stepResult={pendingApproval.result}
          onApprove={handleApprovalDecision}
        />
      )}
    </div>
  )
} 