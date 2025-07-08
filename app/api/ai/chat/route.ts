import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@/lib/ai/providers'
import { toolRegistry } from '@/lib/ai/tools/registry'
import { adapterRegistry, autoDiscoverAdapters } from '@/lib/ai/adapters/registry'

// Initialize adapters on first request
let adaptersInitialized = false

async function initializeAdapters() {
  if (!adaptersInitialized) {
    await autoDiscoverAdapters()
    adaptersInitialized = true
  }
}

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  // Initialize adapters
  await initializeAdapters()
  
  // Convert UIMessages from client to ModelMessages for the AI
  const modelMessages = convertToModelMessages(messages)
  
  // Get available tools from both registries
  const aiTools = toolRegistry.toAISDKTools()
  const adapterTools = adapterRegistry.getAITools()
  const tools = { ...aiTools, ...adapterTools } as Parameters<typeof streamText>[0]['tools']
  
  // Get tool descriptions for system prompt
  const toolDescriptions = adapterRegistry.getToolDescriptions()
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages: modelMessages,
    tools: tools,
    system: `You are a helpful AI photo editing assistant for FotoFun. You help users edit their photos.

When users ask for edits, you can use the following tools:
${toolDescriptions.length > 0 ? toolDescriptions.join('\n') : '- No tools available yet'}

Currently available tools:
- cropImage: Crop the image to specified boundaries (x, y, width, height)

When using tools:
1. Explain what you're about to do
2. Use the appropriate tool
3. Confirm the result

If a tool is not available yet, explain what would be done and mention it's coming soon.

Be friendly, helpful, and concise.`,
  })
  
  // In AI SDK v5, use toUIMessageStreamResponse() to return the stream
  return result.toUIMessageStreamResponse()
} 