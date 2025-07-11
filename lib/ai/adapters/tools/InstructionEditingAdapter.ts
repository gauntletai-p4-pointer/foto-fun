import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { InstructionEditingTool } from '@/lib/ai/tools/RelightingTool'

const inputSchema = z.object({
  instruction: z.string().describe('Natural language instruction describing how to edit the image (e.g., "make the sky more blue", "add snow to the scene", "change the person\'s shirt to red")'),
  strength: z.number().min(0.1).max(2.0).default(1.0).describe('Strength of the edit: lower values for subtle changes, higher values for dramatic changes')
})

type Input = z.output<typeof inputSchema>

interface Output {
  objectId: string
  instruction: string
  strength: number
}

/**
 * AI Adapter for Instruction-Based Editing
 * Edits images using natural language instructions
 */
export class InstructionEditingAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-instruction-editing'
  aiName = 'editWithInstructions'
  description = 'Edit selected images using natural language instructions. Describe what you want to change and the AI will apply those modifications to create a new edited image.'
  inputSchema = inputSchema
  
  private tool = new InstructionEditingTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input and apply defaults
    const validated = this.validateInput(params)
    
    // Get image targets only
    const imageTargets = this.getImageTargets(context)
    if (imageTargets.length === 0) {
      throw new Error('No image objects found. Instruction editing requires at least one selected image.')
    }
    
    // Use the first image target
    const targetImage = imageTargets[0]
    
    try {
      // Execute instruction editing
      const resultObject = await this.tool.execute(targetImage, {
        instruction: validated.instruction,
        strength: validated.strength || 1.0
      })
      
      // Add the result object to canvas
      const objectId = await context.canvas.addObject({
        type: 'image',
        x: targetImage.x + 20, // Offset slightly
        y: targetImage.y + 20,
        width: targetImage.width,
        height: targetImage.height,
        scaleX: targetImage.scaleX || 1,
        scaleY: targetImage.scaleY || 1,
        data: resultObject.data,
        metadata: {
          source: 'ai-instruction-editing',
          originalObjectId: targetImage.id,
          instruction: validated.instruction,
          strength: validated.strength || 1.0,
          processedAt: new Date().toISOString()
        }
      })
      
      // Select the new object
      context.canvas.selectObject(objectId)
      
      return {
        objectId,
        instruction: validated.instruction,
        strength: validated.strength || 1.0
      }
      
    } catch (error) {
      throw new Error(`Instruction editing failed: ${this.formatError(error)}`)
    }
  }
}