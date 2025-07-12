import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Unified canvas context interface that provides a consistent abstraction
 * for both client and server-side operations. Includes object targeting capabilities.
 */
export interface CanvasContext {
  canvas: CanvasManager
  targetObjects: CanvasObject[]
  targetingMode: 'selected' | 'all' | 'visible'
  dimensions: { 
    width: number
    height: number 
  }
  hasContent: boolean
  objectCount: number
  pixelSelection?: {
    bounds: { x: number; y: number; width: number; height: number }
    mask?: ImageData
  }
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
    const objects = canvas.getAllObjects()
    const selectedObjects = canvas.getSelectedObjects()
    
    return {
      canvas,
      targetObjects: selectedObjects.length > 0 ? selectedObjects : objects,
      targetingMode: selectedObjects.length > 0 ? 'selected' : 'all',
      dimensions: { 
        width: canvas.getWidth(), 
        height: canvas.getHeight() 
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
    // Note: This is a minimal context for server-side operations
    // The canvas and targetObjects fields will need proper initialization
    // when used in actual operations
    return {
      canvas: null as unknown as CanvasManager, // Will be set when needed
      targetObjects: [],
      targetingMode: 'all',
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
      canvas: data.canvas || null as unknown as CanvasManager,
      targetObjects: data.targetObjects || [],
      targetingMode: data.targetingMode || 'all',
      dimensions: data.dimensions || { width: 800, height: 600 },
      hasContent: data.hasContent || false,
      objectCount: data.objectCount || 0,
      pixelSelection: data.pixelSelection,
      screenshot: data.screenshot
    }
  }
} 