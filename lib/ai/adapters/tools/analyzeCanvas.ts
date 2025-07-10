import { z } from 'zod'
import { tool } from 'ai'
import { BaseToolAdapter } from '../base'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import type { Tool } from '@/types'

export interface AnalyzeCanvasInput {
  includeHistogram?: boolean
  includeObjectDetails?: boolean
}

export interface AnalyzeCanvasOutput {
  success: boolean
  analysis: {
    dimensions: { width: number; height: number }
    hasContent: boolean
    objectCount: number
    imageData?: string // base64 thumbnail
    histogram?: {
      brightness: number
      contrast: number
      saturation: number
      dominantColors: string[]
    }
    objects?: Array<{
      type: string
      position: { x: number; y: number }
      size: { width: number; height: number }
    }>
    description: string
  }
}

export class AnalyzeCanvasAdapter extends BaseToolAdapter<AnalyzeCanvasInput, AnalyzeCanvasOutput> {
  tool = {} as unknown as Tool // This is a special adapter that doesn't wrap a canvas tool
  aiName = 'analyzeCanvas'
  description = `Analyze the current canvas state and provide detailed information about its contents.

This tool provides information about:
- Canvas dimensions and content
- Objects and layers present
- Image analysis and properties
- Suggestions for improvements

Use this when you need to understand what's currently on the canvas.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = z.object({
    includeHistogram: z.boolean().optional().describe('Include color histogram analysis'),
    includeObjectDetails: z.boolean().optional().describe('Include details about individual objects')
  })
  
  async execute(
    params: AnalyzeCanvasInput,
    context: { canvas: CanvasManager }
  ): Promise<AnalyzeCanvasOutput> {
    const { canvas } = context
    
    try {
      // Get basic canvas info
      const objects: CanvasObject[] = []
      canvas.state.layers.forEach(layer => {
        objects.push(...layer.objects)
      })
      
      const analysis: AnalyzeCanvasOutput['analysis'] = {
        dimensions: {
          width: canvas.state.width,
          height: canvas.state.height
        },
        hasContent: objects.length > 0,
        objectCount: objects.length,
        description: ''
      }
      
      // Generate a small thumbnail for AI analysis
      if (objects.length > 0) {
        // For now, we'll skip thumbnail generation as it requires Konva stage access
        // This would need to be implemented in the client-side execution
        analysis.imageData = undefined
      }
      
      // Analyze histogram if requested
      if (params.includeHistogram && objects.length > 0) {
        analysis.histogram = await this.analyzeHistogram()
      }
      
      // Get object details if requested
      if (params.includeObjectDetails) {
        analysis.objects = objects.map(obj => ({
          type: obj.type || 'unknown',
          position: { x: obj.transform.position.x || 0, y: obj.transform.position.y || 0 },
          size: { 
            width: (obj.originalWidth || 100) * obj.transform.scale.x, 
            height: (obj.originalHeight || 100) * obj.transform.scale.y 
          }
        }))
      }
      
      // Generate description
      analysis.description = this.generateDescription(analysis)
      
      return {
        success: true,
        analysis
      }
    } catch (error) {
      console.error('Canvas analysis error:', error)
      return {
        success: false,
        analysis: {
          dimensions: { width: 0, height: 0 },
          hasContent: false,
          objectCount: 0,
          description: 'Failed to analyze canvas'
        }
      }
    }
  }
  
  private async analyzeHistogram(): Promise<AnalyzeCanvasOutput['analysis']['histogram']> {
    // This is a simplified version - in production you'd use proper image analysis
    // For now, return mock data that could be replaced with real analysis
    return {
      brightness: 0.5,
      contrast: 0.5,
      saturation: 0.5,
      dominantColors: ['#808080', '#a0a0a0', '#606060']
    }
  }
  
  private generateDescription(analysis: AnalyzeCanvasOutput['analysis']): string {
    if (!analysis.hasContent) {
      return `Empty canvas (${analysis.dimensions.width}x${analysis.dimensions.height}px)`
    }
    
    let desc = `Canvas with ${analysis.objectCount} object(s) at ${analysis.dimensions.width}x${analysis.dimensions.height}px`
    
    if (analysis.histogram) {
      const brightness = analysis.histogram.brightness > 0.6 ? 'bright' : 
                        analysis.histogram.brightness < 0.4 ? 'dark' : 'normal brightness'
      const saturation = analysis.histogram.saturation > 0.6 ? 'vibrant' :
                        analysis.histogram.saturation < 0.4 ? 'muted' : 'normal saturation'
      desc += `. Image appears ${brightness} with ${saturation}`
    }
    
    return desc
  }
  
  async resolveParams(): Promise<AnalyzeCanvasInput> {
    // Default behavior - include basic analysis
    return {
      includeHistogram: false,
      includeObjectDetails: false
    }
  }
  
  clientExecutionRequired = false

  // Override toAITool since this adapter runs server-side
  toAITool(): unknown {
    const toolConfig = {
      description: this.description,
      inputSchema: this.inputSchema as z.ZodSchema,
      execute: async (args: unknown) => {
        console.log(`[${this.aiName}] Server-side analysis tool call with args:`, args)
        
        // For analyze canvas, we can't actually execute server-side without the canvas
        // But we can return a result that tells the AI what to expect
        return {
          success: true,
          analysis: {
            dimensions: { width: 0, height: 0 },
            hasContent: true,
            objectCount: 1,
            description: 'Canvas analysis requires client-side execution to access the actual canvas',
            imageData: undefined
          },
          message: 'Canvas analysis will be performed on the client',
          clientExecutionRequired: true,
          params: args
        }
      }
    }
    
    return tool(toolConfig as unknown as Parameters<typeof tool>[0])
  }
}

// Export both named and default
export default AnalyzeCanvasAdapter