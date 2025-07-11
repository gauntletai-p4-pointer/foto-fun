import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import { SemanticSelectionTool } from '@/lib/ai/tools/SemanticSelectionTool'

const inputSchema = z.object({
  query: z.string().describe('Natural language description of what to select (e.g., "all faces", "the red car", "sky region")'),
  threshold: z.number().min(0.1).max(1.0).default(0.3).describe('Detection confidence threshold (0.1 = include uncertain matches, 1.0 = only confident matches)'),
  mode: z.enum(['new', 'add', 'subtract', 'intersect']).default('new').describe('Selection mode: new replaces current selection, add extends it, subtract removes matches, intersect keeps only overlapping')
})

interface Input {
  query: string
  threshold: number
  mode: 'new' | 'add' | 'subtract' | 'intersect'
}

interface Output {
  matchedObjects: string[]
  matchedCount: number
  query: string
  selectionMode: string
}

/**
 * AI Adapter for Semantic Selection
 * Selects objects using natural language descriptions
 */
export class SemanticSelectionAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'ai-semantic-selection'
  aiName = 'selectBySemantic'
  description = 'Select objects on the canvas using natural language descriptions. Use queries like "all faces", "the blue car", "sky area", or "people in the background" to intelligently select relevant objects.'
  inputSchema = inputSchema
  
  private tool = new SemanticSelectionTool()
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    // Validate input
    const validated = this.validateInput(params)
    
    // Check if we have any objects to search
    const allObjects = context.canvas.getAllObjects()
    if (allObjects.length === 0) {
      throw new Error('No objects found on canvas. Semantic selection requires objects to search through.')
    }
    
    const imageObjects = allObjects.filter(obj => obj.type === 'image')
    if (imageObjects.length === 0) {
      throw new Error('No image objects found. Semantic selection works best with images.')
    }
    
    try {
      // Set options on the tool
      this.tool.setOption('query', validated.query)
      this.tool.setOption('threshold', validated.threshold)
      this.tool.setOption('mode', validated.mode)
      
      // Store current selection to track changes
      const initialSelection = Array.from(context.canvas.state.selectedObjectIds)
      
      // Execute semantic selection
      await this.tool.applyWithContext(validated.query, {
        threshold: validated.threshold,
        mode: validated.mode
      })
      
      // Get the new selection
      const finalSelection = Array.from(context.canvas.state.selectedObjectIds)
      
      // Determine what objects were actually matched (not just selected)
      let matchedObjects: string[]
      
      switch (validated.mode) {
        case 'new':
          matchedObjects = finalSelection
          break
        case 'add':
          matchedObjects = finalSelection.filter(id => !initialSelection.includes(id))
          break
        case 'subtract':
          matchedObjects = initialSelection.filter(id => !finalSelection.includes(id))
          break
        case 'intersect':
          matchedObjects = finalSelection
          break
        default:
          matchedObjects = finalSelection
      }
      
      return {
        matchedObjects,
        matchedCount: matchedObjects.length,
        query: validated.query,
        selectionMode: validated.mode
      }
      
    } catch (error) {
      throw new Error(`Semantic selection failed: ${this.formatError(error)}`)
    }
  }
}