'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCanvasStore } from '@/store/canvasStore'
import { useAISettings } from '@/hooks/useAISettings'

// Import extracted components
import { ChatInput } from './components/ChatInput'
import { MessageRenderer } from './components/MessageRenderer'
import { WorkflowProgressIndicator } from './WorkflowProgressIndicator'
import { useToolCallHandler } from './hooks/useToolCallHandler'
import { getAIToolNames } from './utils/messageParser'

// Quick action suggestions
const QUICK_ACTIONS = [
  "Make it brighter",
  "Make it darker",
  "Fix the lighting",
  "Increase exposure",
  "Enhance colors",
  "Make it more vibrant",
  "Mute the colors",
  "Warmer tones",
  "Cooler tones",
  "Convert to black & white",
  "Add sepia tone",
  "Invert colors",
  "Add blur effect",
  "Sharpen the image",
  "Increase contrast",
  "Softer look",
  "Make it dramatic",
  "Vintage style",
  "Rotate 90 degrees",
  "Flip horizontally",
  "Crop to square"
]

export function AIChat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [toolNames, setToolNames] = useState<string[]>([])
  const [quickActions, setQuickActions] = useState<string[]>([])
  const { waitForReady, hasContent } = useCanvasStore()
  const { settings: aiSettings } = useAISettings()
  
  // Use the custom hook for tool call handling
  const { handleToolCall, workflowProgress } = useToolCallHandler(waitForReady)
  
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
    const shuffled = [...QUICK_ACTIONS].sort(() => Math.random() - 0.5)
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
    maxSteps: 5,
    onError: (error: Error) => {
      console.error('Chat error:', error)
    },
    onFinish: ({ message }) => {
      console.log('[AIChat] onFinish called with message:', message)
    },
    onToolCall: handleToolCall,
  })
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])
  
  const handleSubmit = useCallback((text: string) => {
    // Get fresh canvas state
    const canvasStore = useCanvasStore.getState()
    const { fabricCanvas } = canvasStore
    
    // Build canvas context with fresh state
    const canvasContext = fabricCanvas ? {
      dimensions: {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight()
      },
      hasContent: hasContent(),
      objectCount: fabricCanvas.getObjects().length
    } : null
    
    // Send message with context in body (matching what the server expects)
    sendMessage(
      { text },
      { 
        body: { 
          canvasContext,
          aiSettings: {
            autoApproveThreshold: 0.8,
            showConfidenceScores: true,
            showApprovalDecisions: true
          }
        }
      }
    )
  }, [sendMessage, hasContent])
  
  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <h4 className="text-lg font-semibold mb-2">Welcome to AI Assistant</h4>
              <p className="text-sm text-muted-foreground mb-6">
                I can help you edit and enhance your images using various tools.
              </p>
              
              {/* Quick actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try one of these:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleSubmit(action)}
                      className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Show workflow progress if active */}
          {workflowProgress && (
            <WorkflowProgressIndicator progress={workflowProgress} />
          )}
          
          {/* Messages */}
          {messages.map((message) => (
            <MessageRenderer
              key={message.id}
              message={message}
              toolNames={toolNames}
              aiSettings={aiSettings}
              sendMessage={sendMessage}
              messages={messages}
            />
          ))}
          
          {/* Loading indicator */}
          {(status === 'submitted' || status === 'streaming') && !workflowProgress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
            </div>
          )}
        </div>
      </ScrollArea>
      
      <ChatInput 
        onSubmit={handleSubmit}
        isLoading={status === 'submitted' || status === 'streaming'}
      />
    </div>
  )
}

// Export the default AIChat component for backward compatibility
export default AIChat 