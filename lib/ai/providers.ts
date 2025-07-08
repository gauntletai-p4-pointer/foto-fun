import { createOpenAI } from '@ai-sdk/openai'

// Create OpenAI provider instance
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) 