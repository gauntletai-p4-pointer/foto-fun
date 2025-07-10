'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useCallback, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useService } from '@/lib/core/AppInitializer'
import { useAISettings } from '@/hooks/useAISettings'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/canvas/types'

// Import extracted components
import { ChatInput } from './components/ChatInput'
import { MessageRenderer } from './components/MessageRenderer'
import { AgentThinkingDisplay } from './components/AgentThinkingDisplay'
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

interface ThinkingStep {
  id: string
  type: 'screenshot' | 'vision' | 'planning' | 'executing' | 'complete'
  message: string
  timestamp: string
  isActive: boolean
}

export function AIChat() {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [toolNames, setToolNames] = useState<string[]>([])
  const [quickActions, setQuickActions] = useState<string[]>([])
  const [agentThinkingSteps, setAgentThinkingSteps] = useState<ThinkingStep[]>([])
  const [isAgentThinking, setIsAgentThinking] = useState(false)
  // const canvasState = useCanvasStore(canvasStore) // Unused in this component
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  // Canvas readiness helpers
  const waitForReady = async (): Promise<void> => {
    // Wait for canvas manager to be initialized
    while (!canvasManager?.konvaStage) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  const hasContent = useCallback(() => {
    if (!canvasManager) return false
    return canvasManager.state.layers.some(layer => layer.objects.length > 0)
  }, [canvasManager])
  const { settings: aiSettings } = useAISettings()
  
  // Use the custom hook for tool call handling
  const { handleToolCall } = useToolCallHandler({
    waitForReady,
    onAgentThinkingStart: () => {
      setIsAgentThinking(true)
      setAgentThinkingSteps([])
    },
    onAgentThinkingEnd: () => {
      setIsAgentThinking(false)
      // Mark all steps as inactive
      setAgentThinkingSteps(prev => 
        prev.map(step => ({ ...step, isActive: false }))
      )
    },
    onAgentThinkingStep: (step) => {
      setAgentThinkingSteps(prev => {
        // Mark previous steps as inactive
        const updated = prev.map(s => ({ ...s, isActive: false }))
        // Add new step as active
        return [...updated, { ...step, isActive: true }]
      })
    }
  })
  
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
    // Capture selection snapshot at request time
    let selectionSnapshot = null
    const selectedObjects: CanvasObject[] = []
    
    if (canvasManager) {
      const selection = canvasManager.state.selection
      
      if (selection?.type === 'objects') {
        selection.objectIds.forEach(id => {
          const obj = canvasManager.findObject(id)
          if (obj) selectedObjects.push(obj)
        })
      }
      
      // Create a lightweight snapshot of the selection
      selectionSnapshot = {
        objectCount: selectedObjects.length,
        objectIds: selectedObjects.map((obj: CanvasObject) => obj.id),
        types: Array.from(new Set(selectedObjects.map((obj: CanvasObject) => obj.type))),
        isEmpty: selectedObjects.length === 0,
        hasImages: selectedObjects.some((obj: CanvasObject) => obj.type === 'image'),
        // Store actual object references for this request
        _objects: selectedObjects
      }
      
      console.log('[AIChat] Captured selection snapshot:', {
        count: selectionSnapshot.objectCount,
        types: selectionSnapshot.types,
        isEmpty: selectionSnapshot.isEmpty
      })
    }
    
    // Build canvas context with fresh state
    const canvasContext = canvasManager ? {
      dimensions: {
        width: canvasManager.state.width,
        height: canvasManager.state.height
      },
      hasContent: hasContent(),
      objectCount: canvasManager.state.layers.reduce((count, layer) => count + layer.objects.length, 0),
      // Selection state for AI awareness
      selection: {
        count: selectedObjects.length,
        hasImages: selectedObjects.some((obj: CanvasObject) => obj.type === 'image'),
        hasText: selectedObjects.some((obj: CanvasObject) => obj.type === 'text' || obj.type === 'verticalText'),
        // For single-object scenarios
        isSingleImage: selectedObjects.length === 1 && selectedObjects[0].type === 'image'
      },
      // Canvas state hints for smart inference
      singleImageCanvas: (() => {
        const allObjects = canvasManager.state.layers.flatMap(layer => layer.objects)
        return allObjects.length === 1 && allObjects[0].type === 'image'
      })(),
      // ADD: Selection snapshot data for request-time capture
      selectionSnapshot: selectionSnapshot ? {
        objectCount: selectionSnapshot.objectCount,
        objectIds: selectionSnapshot.objectIds,
        types: selectionSnapshot.types,
        isEmpty: selectionSnapshot.isEmpty,
        hasImages: selectionSnapshot.hasImages,
        _objects: selectionSnapshot._objects
      } : null
    } : null
    
    // Send message with context in body (matching what the server expects)
    sendMessage(
      { text },
      { 
        body: { 
          canvasContext,
          aiSettings: {
            autoApproveThreshold: aiSettings.autoApproveThreshold,
            showConfidenceScores: aiSettings.showConfidenceScores,
            showApprovalDecisions: aiSettings.showApprovalDecisions,
            showEducationalContent: aiSettings.showEducationalContent,
            stepByStepMode: aiSettings.stepByStepMode
          }
        }
      }
    )
  }, [sendMessage, hasContent, aiSettings, canvasManager])
  
  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {/* Agent Thinking Display */}
          <AgentThinkingDisplay
            isThinking={isAgentThinking}
            steps={agentThinkingSteps}
            autoCollapse={true}
            className="mb-4"
          />
          
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
          {(status === 'submitted' || status === 'streaming') && (
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