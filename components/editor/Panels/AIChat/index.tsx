'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { ClientToolExecutor } from '@/lib/ai/client/tool-executor'
import { useCanvasStore } from '@/store/canvasStore'

export function AIChat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const fabricCanvas = useCanvasStore((state) => state.fabricCanvas)
  
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
    }),
    onError: (error: Error) => {
      console.error('Chat error:', error)
    },
    onToolCall: async ({ toolCall }) => {
      // Execute tool on client side
      try {
        // Check if canvas is ready and has content
        if (!fabricCanvas) {
          throw new Error('Canvas not initialized. Please wait for the editor to load.')
        }
        
        const objects = fabricCanvas.getObjects()
        if (objects.length === 0) {
          throw new Error('No image loaded. Please upload an image first.')
        }
        
        const args = 'args' in toolCall ? (toolCall as unknown as { args: unknown }).args : undefined
        const result = await ClientToolExecutor.execute(toolCall.toolName, args)
        return result
      } catch (error) {
        console.error('Tool execution error:', error)
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
    if (input.trim() && !isLoading) {
      sendMessage({ text: input })
      setInput('')
    }
  }, [input, isLoading, sendMessage])
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Bot className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>Hi! I&apos;m your AI photo editing assistant.</p>
              <p className="mt-2">I can help you:</p>
              <ul className="mt-3 space-y-1 text-xs">
                <li>• Edit and enhance your photos</li>
                <li>• Apply filters and effects</li>
                <li>• Adjust colors and lighting</li>
                <li>• Create selections and masks</li>
              </ul>
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
                    : 'bg-secondary text-foreground'
                )}
              >
                {/* Render message parts */}
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return <p key={index} className="text-sm whitespace-pre-wrap">{part.text}</p>
                  }
                  
                  // Check if it's a tool part (e.g., tool-adjustBrightness)
                  if (part.type.startsWith('tool-')) {
                    const toolName = part.type.replace('tool-', '')
                    const toolPart = part as {
                      state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
                      errorText?: string
                    }
                    
                    return (
                      <div
                        key={index}
                        className="mt-2 p-2 bg-background/50 rounded text-xs text-foreground"
                      >
                        {toolPart.state === 'input-streaming' && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Preparing {toolName}...</span>
                          </div>
                        )}
                        {toolPart.state === 'input-available' && (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Using {toolName}...</span>
                          </div>
                        )}
                        {toolPart.state === 'output-available' && (
                          <div className="text-muted-foreground">
                            ✓ {toolName} completed
                          </div>
                        )}
                        {toolPart.state === 'output-error' && (
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-3 h-3" />
                            <span>Error: {toolPart.errorText}</span>
                          </div>
                        )}
                      </div>
                    )
                  }
                  
                  return null
                })}
              </div>
              
              {message.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
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
              <div className="bg-secondary text-foreground rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>Error: {error.message}</span>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about editing your photo..."
            disabled={isLoading}
            className="flex-1 text-foreground bg-background"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
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
          {[
            "Make it brighter",
            "Add blur effect",
            "Convert to black & white",
            "Enhance colors"
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                if (!isLoading && suggestion) {
                  sendMessage({ text: suggestion })
                }
              }}
              className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
              disabled={isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
} 