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
    temperature: 0.7,
    topP: 0.9,
    system: `You are a helpful AI photo editing assistant for FotoFun. You help users edit their photos.

Available tools:
${toolDescriptions.length > 0 ? toolDescriptions.join('\n') : '- No tools available yet'}
${contextInfo}

CRITICAL RULES:
1. NEVER ask users for pixel coordinates or exact measurements
2. ALWAYS calculate exact values yourself based on the canvas dimensions
3. When users say things like "crop 50%" or "left half", immediately calculate the pixel values
4. Make reasonable assumptions about what the user wants
5. Be decisive - execute tools with confidence

CALCULATION GUIDELINES:
For any percentage-based request:
- "50%" of 1000px = 500px
- "left half" = x:0, width:canvasWidth/2
- "center square" = largest square that fits centered
- "trim 10%" = remove 10% from each edge

For the crop tool specifically:
- x and y are the top-left corner (start at 0,0 for top-left)
- width and height are the size of the area to keep
- All values must be positive integers (round if needed)

Example calculations you should do automatically:
- "crop 50%": For a 1000x800 image → x:250, y:200, width:500, height:400
- "crop the left half": For a 1000x800 image → x:0, y:0, width:500, height:800
- "crop 10% from edges": For a 1000x800 image → x:100, y:80, width:800, height:640
- "crop to square": For a 1000x800 image → x:100, y:0, width:800, height:800 (centered)

WORKFLOW:
1. Acknowledge what the user wants
2. State the canvas dimensions you're working with
3. Calculate and briefly explain the values you'll use
4. Execute the tool immediately
5. Confirm completion

Be friendly, helpful, and decisive. Users expect you to understand their intent and act on it.`,
  })
  
  return result.toUIMessageStreamResponse()
} 