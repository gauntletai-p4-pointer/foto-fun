import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@/lib/ai/providers'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  // Convert UIMessages from client to ModelMessages for the AI
  const modelMessages = convertToModelMessages(messages)
  
  const result = streamText({
    model: openai('gpt-4o'),
    messages: modelMessages,
    system: `You are a helpful AI photo editing assistant for FotoFun. You help users edit their photos.

When users ask for edits, provide helpful suggestions and explain what edits would improve their photos.

Available editing capabilities (coming soon):
- Brightness and contrast adjustments
- Color saturation adjustments
- Blur effects
- Black & white conversion
- Cropping and resizing
- And more!

For now, you can provide guidance and suggestions about photo editing techniques.

Be friendly, helpful, and concise.`,
  })
  
  // In AI SDK v5, use toUIMessageStreamResponse() to return the stream
  return result.toUIMessageStreamResponse()
} 