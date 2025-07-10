import type { Canvas } from 'fabric'

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
   * Create context from a real Fabric.js canvas (client-side)
   */
  static fromClient(canvas: Canvas): CanvasContext {
    return {
      dimensions: { 
        width: canvas.getWidth(), 
        height: canvas.getHeight() 
      },
      hasContent: canvas.getObjects().length > 0,
      objectCount: canvas.getObjects().length,
      screenshot: undefined // Only capture when needed to avoid performance impact
    }
  }
  
  /**
   * Create context with screenshot for server-side analysis
   */
  static fromClientWithScreenshot(canvas: Canvas): CanvasContext {
    return {
      ...this.fromClient(canvas),
      screenshot: canvas.toDataURL({ 
        format: 'png', 
        quality: 0.8,
        multiplier: 1 // Required property for Fabric.js
      })
    }
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