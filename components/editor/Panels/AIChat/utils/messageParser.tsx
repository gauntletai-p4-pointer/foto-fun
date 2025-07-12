import { Wrench } from 'lucide-react'
// Temporarily disabled for foundation cleanup
// import { adapterRegistry } from '@/lib/ai/adapters/registry'

// Get all AI tool names for highlighting (temporarily disabled for foundation cleanup)
export const getAIToolNames = () => {
  // Temporarily return empty array during foundation cleanup
  return []
}

// Function to parse text and highlight tool names
export const parseMessageWithTools = (text: string, toolNames: string[]) => {
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