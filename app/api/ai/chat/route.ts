import { streamText } from 'ai'
import { openai } from '@/lib/ai/providers'
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
  
  // Get AI tools from adapter registry
  const tools = adapterRegistry.getAITools()
  
  // Get tool descriptions for system prompt
  const toolDescriptions = adapterRegistry.getToolDescriptions()
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    tools,
    system: `You are a helpful AI photo editing assistant for FotoFun. You help users edit their photos.

When users ask for edits, you can use the following tools:
${toolDescriptions.length > 0 ? toolDescriptions.join('\n') : '- No tools available yet'}

When using tools:
1. Analyze the current image dimensions before applying operations
2. Use exact pixel values, not fractions or percentages
3. Explain what you're about to do
4. Use the appropriate tool
5. Confirm the result

If a tool is not available yet, explain what would be done and mention it's coming soon.

Be friendly, helpful, and concise.`,
  })
  
  return result.toTextStreamResponse()
} 