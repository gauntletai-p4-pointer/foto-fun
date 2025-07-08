import type { Canvas, FabricObject } from 'fabric'
import type { FotoFunTool, ToolExecutionContext } from './base'
import { useCanvasStore } from '@/store/canvasStore'
import { useDocumentStore } from '@/store/documentStore'

export interface CanvasContext extends Omit<ToolExecutionContext, 'canvas' | 'selection'> {
  canvas: Canvas
  imageData?: ImageData
  selection?: FabricObject[]
  dimensions: {
    width: number
    height: number
  }
  metadata?: {
    zoom?: number
    documentName?: string
  }
}

/**
 * Bridge between AI tools and canvas operations
 * Handles canvas state access, image data extraction, and result application
 */
export class CanvasToolBridge {
  /**
   * Get the current canvas context for tool execution
   */
  static getCanvasContext(): CanvasContext | null {
    const { fabricCanvas, isReady } = useCanvasStore.getState()
    
    console.log('[CanvasToolBridge] getCanvasContext called:', {
      isReady,
      hasCanvas: !!fabricCanvas,
      canvasId: fabricCanvas ? fabricCanvas.toString().substring(0, 50) : 'null'
    })
    
    if (!fabricCanvas || !isReady) {
      console.warn('[CanvasToolBridge] Canvas not ready:', { isReady, hasCanvas: !!fabricCanvas })
      return null
    }
    
    const documentStore = useDocumentStore.getState()
    
    // Check if canvas has any content
    const objects = fabricCanvas.getObjects()
    if (objects.length === 0) {
      console.warn('Canvas has no objects')
    }
    
    // Get active selection if any
    const activeSelection = fabricCanvas.getActiveObjects()
    
    return {
      canvas: fabricCanvas,
      selection: activeSelection.length > 0 ? activeSelection : undefined,
      dimensions: {
        width: fabricCanvas.getWidth(),
        height: fabricCanvas.getHeight()
      },
      metadata: {
        zoom: useCanvasStore.getState().zoom,
        documentName: documentStore.currentDocument?.name
      },
      canvasStore: useCanvasStore.getState(),
      documentStore,
      toolStore: undefined, // Will be injected by tool executor
    }
  }
  
  /**
   * Extract image data from canvas or selection
   */
  static async extractImageData(
    canvas: Canvas,
    targetArea: 'whole-image' | 'selection' | 'layer'
  ): Promise<ImageData | null> {
    try {
      let dataURL: string
      
      switch (targetArea) {
        case 'whole-image':
          dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 1
          })
          break
          
        case 'selection':
          const selection = canvas.getActiveObjects()
          if (selection.length === 0) {
            throw new Error('No selection available')
          }
          
          // Create temporary canvas with selection
          const tempCanvas = document.createElement('canvas')
          const tempCtx = tempCanvas.getContext('2d')
          if (!tempCtx) throw new Error('Could not create temp canvas')
          
          // Get bounding box of selection
          const bounds = selection.reduce((acc, obj) => {
            const objBounds = obj.getBoundingRect()
            return {
              left: Math.min(acc.left, objBounds.left),
              top: Math.min(acc.top, objBounds.top),
              right: Math.max(acc.right, objBounds.left + objBounds.width),
              bottom: Math.max(acc.bottom, objBounds.top + objBounds.height)
            }
          }, {
            left: Infinity,
            top: Infinity,
            right: -Infinity,
            bottom: -Infinity
          })
          
          tempCanvas.width = bounds.right - bounds.left
          tempCanvas.height = bounds.bottom - bounds.top
          
          // Clone and render selection
          const clonedObjects = await Promise.all(
            selection.map(obj => obj.clone())
          )
          
          const tempFabricCanvas = new (await import('fabric')).Canvas(tempCanvas)
          clonedObjects.forEach(obj => {
            obj.left = (obj.left || 0) - bounds.left
            obj.top = (obj.top || 0) - bounds.top
            tempFabricCanvas.add(obj)
          })
          
          dataURL = tempFabricCanvas.toDataURL()
          tempFabricCanvas.dispose()
          break
          
        case 'layer':
          // TODO: Implement when layer system is ready
          throw new Error('Layer targeting not yet implemented')
          
        default:
          throw new Error(`Unknown target area: ${targetArea}`)
      }
      
      // Convert data URL to ImageData
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = dataURL
      })
      
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = img.width
      tempCanvas.height = img.height
      const ctx = tempCanvas.getContext('2d')
      if (!ctx) throw new Error('Could not create context')
      
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(0, 0, img.width, img.height)
      
    } catch (error) {
      console.error('Failed to extract image data:', error)
      return null
    }
  }
  
  /**
   * Apply tool result back to canvas
   */
  static async applyResult(
    canvas: Canvas,
    result: unknown,
    targetArea: 'whole-image' | 'selection' | 'layer'
  ): Promise<void> {
    // Implementation depends on the result type
    // This will be expanded as we implement specific tools
    console.log('Applying result to', targetArea, result)
    
    // Trigger canvas re-render
    canvas.requestRenderAll()
  }
  
  /**
   * Execute a tool on the canvas with error handling
   */
  static async executeToolOnCanvas<TInput, TOutput>(
    tool: FotoFunTool,
    input: TInput,
    context: ToolExecutionContext
  ): Promise<TOutput> {
    try {
      // Validate canvas requirement
      if (tool.requiresCanvas && !context.canvas) {
        throw new Error(`Tool ${tool.name} requires canvas but none provided`)
      }
      
      // Validate selection requirement
      if (tool.requiresSelection && (!context.selection || context.selection.length === 0)) {
        throw new Error(`Tool ${tool.name} requires selection but none available`)
      }
      
      // Execute the tool
      if (!tool.clientExecutor) {
        throw new Error(`Tool ${tool.name} has no client executor`)
      }
      
      const result = await tool.clientExecutor(input, context)
      
      // Validate output
      return tool.validateOutput(result) as TOutput
      
    } catch (error) {
      console.error(`Tool execution failed for ${tool.name}:`, error)
      throw error
    }
  }
  
  /**
   * Create a snapshot of current canvas state for undo/redo
   */
  static createSnapshot(canvas: Canvas): string {
    return JSON.stringify(canvas.toJSON())
  }
  
  /**
   * Restore canvas from snapshot
   */
  static async restoreSnapshot(canvas: Canvas, snapshot: string): Promise<void> {
    return new Promise((resolve) => {
      canvas.loadFromJSON(snapshot, () => {
        canvas.requestRenderAll()
        resolve()
      })
    })
  }
} 