import type { UIMessage } from 'ai'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseMessageWithTools } from '../utils/messageParser'
import { ToolPartRenderer } from './ToolPartRenderer'

interface MessageRendererProps {
  message: UIMessage
  toolNames: string[]
  aiSettings: {
    showConfidenceScores: boolean
    showApprovalDecisions: boolean
    showEducationalContent: boolean
  }
  sendMessage: (message: { text: string }, options?: Record<string, unknown>) => void
  messages: UIMessage[]
}

export function MessageRenderer({ 
  message, 
  toolNames, 
  aiSettings, 
  sendMessage, 
  messages 
}: MessageRendererProps) {
  return (
    <div className="space-y-1">
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
            
            // Check if it's a tool invocation part
            if (part.type?.startsWith('tool-')) {
              // Cast to the expected tool part structure
              const toolPart = part as {
                type: string
                state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
                input?: Record<string, unknown>
                output?: Record<string, unknown>
                errorText?: string
              }
              if ('state' in toolPart && toolPart.state) {
                return (
                  <ToolPartRenderer
                    key={`${message.id}-${index}`}
                    part={{
                      type: toolPart.type,
                      state: toolPart.state,
                      input: toolPart.input,
                      output: toolPart.output,
                      errorText: toolPart.errorText
                    }}
                    messageId={message.id}
                    aiSettings={aiSettings}
                    sendMessage={sendMessage}
                    messages={messages}
                  />
                )
              }
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
  )
} 