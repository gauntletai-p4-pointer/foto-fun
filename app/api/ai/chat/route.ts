import { streamText, convertToModelMessages } from 'ai'
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
  const { messages, canvasContext } = await req.json()
  
  // Initialize adapters
  await initializeAdapters()
  
  // Get AI tools from adapter registry
  const tools = adapterRegistry.getAITools()
  
  // Get tool descriptions for system prompt
  const toolDescriptions = adapterRegistry.getToolDescriptions()
  
  // Build dynamic context based on canvas state
  let contextInfo = ''
  if (canvasContext?.dimensions) {
    contextInfo = `\n\nCurrent canvas: ${canvasContext.dimensions.width}x${canvasContext.dimensions.height} pixels`
    if (canvasContext.hasContent) {
      contextInfo += ' (image loaded)'
    }
  }
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools,
    system: `You are a helpful AI photo editing assistant for FotoFun. You help users edit their photos.

Available tools:
${toolDescriptions.length > 0 ? toolDescriptions.join('\n') : '- No tools available yet'}
${contextInfo}

IMPORTANT: When users make requests like "crop 50%" or "crop the left half", you need to calculate the exact pixel coordinates.

For the crop tool:
- x and y are the top-left corner coordinates in pixels
- width and height are the crop dimensions in pixels
- All values must be positive integers

Example calculations:
- "crop 50%": For a 1000x800 image → x:250, y:200, width:500, height:400
- "crop the left half": For a 1000x800 image → x:0, y:0, width:500, height:800
- "crop 10% from edges": For a 1000x800 image → x:100, y:80, width:800, height:640

Always:
1. Acknowledge the user's request
2. Calculate and explain the parameters you'll use
3. Execute the tool
4. Confirm completion

Be friendly, helpful, and concise.`,
  })
  
  return result.toUIMessageStreamResponse()
} 