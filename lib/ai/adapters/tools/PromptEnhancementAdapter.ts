import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { PromptEnhancementTool } from '@/lib/ai/tools/RelightingTool'

const inputSchema = z.object({
  prompt: z.string().describe('The original text prompt to enhance and improve'),
  maxLength: z.number().min(50).max(500).default(200).describe('Maximum length for the enhanced prompt'),
  style: z.enum(['detailed', 'artistic', 'photographic']).default('detailed').describe('Enhancement style: detailed for comprehensive descriptions, artistic for creative flair, photographic for realistic specifications')
})

type Input = z.output<typeof inputSchema>

interface Output {
  originalPrompt: string
  enhancedPrompt: string
  style: 'detailed' | 'artistic' | 'photographic'
  length: number
}

/**
 * AI Adapter for Prompt Enhancement
 * Improves and expands text prompts for better AI generation
 */
export class PromptEnhancementAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-prompt-enhancement'
  aiName = 'enhancePrompt'
  description = 'Enhance and improve text prompts using AI. Takes a basic prompt and expands it with more descriptive details, better structure, and improved keywords for higher quality AI generation results.'
  inputSchema = inputSchema
  
  private tool = new PromptEnhancementTool()
  
  async execute(params: Input, _context: ObjectCanvasContext): Promise<Output> {
    // Validate input and apply defaults
    const validated = this.validateInput(params)
    
    try {
      // Execute prompt enhancement
      const enhancedPrompt = await this.tool.execute(validated.prompt, {
        maxLength: validated.maxLength || 200,
        style: validated.style || 'detailed'
      })
      
      return {
        originalPrompt: validated.prompt,
        enhancedPrompt: enhancedPrompt.trim(),
        style: validated.style || 'detailed',
        length: enhancedPrompt.length
      }
      
    } catch (error) {
      throw new Error(`Prompt enhancement failed: ${this.formatError(error)}`)
    }
  }
}