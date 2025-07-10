import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

/**
 * Canvas context interface that provides a consistent abstraction
 * for both client and server-side operations
 */
export interface CanvasContext {
  dimensions: { 
    width: number
    height: number 
  }
  hasContent: boolean
  objectCount: number
  screenshot?: string // Base64 for server-side analysis
}

/**
 * Provider for creating canvas context from different sources
 */
export class CanvasContextProvider {
  /**
   * Create context from a CanvasManager instance (client-side)
   */
  static fromClient(canvas: CanvasManager): CanvasContext {
    const canvasState = canvas.state
    const objects = canvasState.layers.flatMap(layer => layer.objects)
    return {
      dimensions: { 
        width: canvasState.width, 
        height: canvasState.height 
      },
      hasContent: objects.length > 0,
      objectCount: objects.length,
      screenshot: undefined // Only capture when needed to avoid performance impact
    }
  }
  
  /**
   * Create context with screenshot for server-side analysis
   */
  static async fromClientWithScreenshot(canvas: CanvasManager): Promise<CanvasContext> {
    const blob = await canvas.exportImage('png')
    const reader = new FileReader()
    
    return new Promise((resolve) => {
      reader.onloadend = () => {
        resolve({
          ...this.fromClient(canvas),
          screenshot: reader.result as string
        })
      }
      reader.readAsDataURL(blob)
    })
  }
  
  /**
   * Create an empty context for server-side operations
   */
  static empty(): CanvasContext {
    return {
      dimensions: { width: 800, height: 600 },
      hasContent: false,
      objectCount: 0
    }
  }
  
  /**
   * Create context from serialized data (e.g., from API request)
   */
  static fromData(data: Partial<CanvasContext>): CanvasContext {
    return {
      dimensions: data.dimensions || { width: 800, height: 600 },
      hasContent: data.hasContent || false,
      objectCount: data.objectCount || 0,
      screenshot: data.screenshot
    }
  }
} 