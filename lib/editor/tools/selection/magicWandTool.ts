import { Wand2 } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, Selection } from '@/lib/editor/canvas/types'
import { SelectionCreatedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Magic Wand Tool - Selects areas of similar color
 * Konva implementation with flood fill algorithm and tolerance
 */
export class MagicWandTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.MAGIC_WAND
  name = 'Magic Wand Tool'
  icon = Wand2
  cursor = 'crosshair'
  shortcut = 'W'
  
  // Tool state
  private isSelecting = false
  private selectionLayer: Konva.Layer | null = null
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create a dedicated layer for selection visualization
    this.selectionLayer = new Konva.Layer()
    canvas.konvaStage.add(this.selectionLayer)
    
    // Move selection layer to top
    this.selectionLayer.moveToTop()
    
    // Set default options
    this.setOption('tolerance', 32)
    this.setOption('contiguous', true)
    this.setOption('sampleAllLayers', false)
  }
  
  protected cleanupTool(): void {
    // Clean up selection layer
    if (this.selectionLayer) {
      this.selectionLayer.destroy()
      this.selectionLayer = null
    }
    
    // Reset state
    this.isSelecting = false
  }
  
  async onMouseDown(event: ToolEvent): Promise<void> {
    if (this.isSelecting) return
    
    this.isSelecting = true
    
    try {
      const canvas = this.getCanvas()
      const point = event.point
      
      // Get tool options
      const tolerance = (this.getOption('tolerance') as number) || 32
      const contiguous = (this.getOption('contiguous') as boolean) !== false
      // const sampleAllLayers = (this.getOption('sampleAllLayers') as boolean) || false
      
      // Get image data from canvas
      const imageData = canvas.getImageData()
      
      // Get the color at the clicked point
      const pixelIndex = (Math.floor(point.y) * imageData.width + Math.floor(point.x)) * 4
      const targetColor = {
        r: imageData.data[pixelIndex],
        g: imageData.data[pixelIndex + 1],
        b: imageData.data[pixelIndex + 2],
        a: imageData.data[pixelIndex + 3]
      }
      
      // Create selection mask
      const selectionMask = new ImageData(imageData.width, imageData.height)
      
      if (contiguous) {
        // Use flood fill algorithm for contiguous selection
        this.floodFill(
          imageData,
          selectionMask,
          Math.floor(point.x),
          Math.floor(point.y),
          targetColor,
          tolerance
        )
      } else {
        // Select all similar colors in the image
        this.selectSimilarColors(
          imageData,
          selectionMask,
          targetColor,
          tolerance
        )
      }
      
      // Find bounds of the selection
      const bounds = this.findSelectionBounds(selectionMask)
      
      if (bounds.width > 0 && bounds.height > 0) {
        // Create cropped mask for the selection
        const croppedMask = this.cropImageData(selectionMask, bounds)
        
        // Create pixel selection
        const selection: Selection = {
          type: 'pixel',
          bounds,
          mask: croppedMask
        }
        
        // Set selection on canvas
        canvas.setSelection(selection)
        
        // Emit event if in ExecutionContext
        if (this.executionContext) {
          await this.executionContext.emit(new SelectionCreatedEvent(
            'canvas',
            selection,
            this.executionContext.getMetadata()
          ))
        }
        
        // Show visual feedback
        this.showSelectionFeedback(bounds)
      }
      
    } finally {
      this.isSelecting = false
    }
  }
  
  /**
   * Flood fill algorithm for contiguous selection
   */
  private floodFill(
    sourceData: ImageData,
    maskData: ImageData,
    startX: number,
    startY: number,
    targetColor: { r: number; g: number; b: number; a: number },
    tolerance: number
  ): void {
    const width = sourceData.width
    const height = sourceData.height
    const visited = new Uint8Array(width * height)
    const stack: Point[] = [{ x: startX, y: startY }]
    
    while (stack.length > 0) {
      const point = stack.pop()!
      const x = Math.floor(point.x)
      const y = Math.floor(point.y)
      
      // Check bounds
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      
      const index = y * width + x
      
      // Check if already visited
      if (visited[index]) continue
      visited[index] = 1
      
      // Check color similarity
      const pixelIndex = index * 4
      const color = {
        r: sourceData.data[pixelIndex],
        g: sourceData.data[pixelIndex + 1],
        b: sourceData.data[pixelIndex + 2],
        a: sourceData.data[pixelIndex + 3]
      }
      
      if (this.isColorSimilar(color, targetColor, tolerance)) {
        // Add to selection mask
        maskData.data[pixelIndex] = 255     // R
        maskData.data[pixelIndex + 1] = 255 // G
        maskData.data[pixelIndex + 2] = 255 // B
        maskData.data[pixelIndex + 3] = 255 // A
        
        // Add neighbors to stack
        stack.push({ x: x + 1, y })
        stack.push({ x: x - 1, y })
        stack.push({ x, y: y + 1 })
        stack.push({ x, y: y - 1 })
      }
    }
  }
  
  /**
   * Select all similar colors (non-contiguous)
   */
  private selectSimilarColors(
    sourceData: ImageData,
    maskData: ImageData,
    targetColor: { r: number; g: number; b: number; a: number },
    tolerance: number
  ): void {
    const length = sourceData.data.length
    
    for (let i = 0; i < length; i += 4) {
      const color = {
        r: sourceData.data[i],
        g: sourceData.data[i + 1],
        b: sourceData.data[i + 2],
        a: sourceData.data[i + 3]
      }
      
      if (this.isColorSimilar(color, targetColor, tolerance)) {
        maskData.data[i] = 255     // R
        maskData.data[i + 1] = 255 // G
        maskData.data[i + 2] = 255 // B
        maskData.data[i + 3] = 255 // A
      }
    }
  }
  
  /**
   * Check if two colors are similar within tolerance
   */
  private isColorSimilar(
    color1: { r: number; g: number; b: number; a: number },
    color2: { r: number; g: number; b: number; a: number },
    tolerance: number
  ): boolean {
    // Calculate color distance (simple RGB distance)
    const distance = Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
    )
    
    // Also consider alpha difference
    const alphaDiff = Math.abs(color1.a - color2.a)
    
    return distance <= tolerance && alphaDiff <= tolerance
  }
  
  /**
   * Find the bounds of the selection
   */
  private findSelectionBounds(maskData: ImageData): { x: number; y: number; width: number; height: number } {
    const width = maskData.width
    const height = maskData.height
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let hasSelection = false
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        if (maskData.data[index + 3] > 0) {
          hasSelection = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    if (!hasSelection) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  }
  
  /**
   * Crop image data to bounds
   */
  private cropImageData(
    sourceData: ImageData,
    bounds: { x: number; y: number; width: number; height: number }
  ): ImageData {
    const croppedData = new ImageData(bounds.width, bounds.height)
    
    for (let y = 0; y < bounds.height; y++) {
      for (let x = 0; x < bounds.width; x++) {
        const sourceIndex = ((y + bounds.y) * sourceData.width + (x + bounds.x)) * 4
        const targetIndex = (y * bounds.width + x) * 4
        
        croppedData.data[targetIndex] = sourceData.data[sourceIndex]
        croppedData.data[targetIndex + 1] = sourceData.data[sourceIndex + 1]
        croppedData.data[targetIndex + 2] = sourceData.data[sourceIndex + 2]
        croppedData.data[targetIndex + 3] = sourceData.data[sourceIndex + 3]
      }
    }
    
    return croppedData
  }
  
  /**
   * Show visual feedback for the selection
   */
  private showSelectionFeedback(bounds: { x: number; y: number; width: number; height: number }): void {
    if (!this.selectionLayer) return
    
    // Clear previous feedback
    this.selectionLayer.destroyChildren()
    
    // Create marching ants effect
    const rect = new Konva.Rect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      stroke: '#000000',
      strokeWidth: 1,
      dash: [4, 4],
      fill: 'transparent'
    })
    
    const bgRect = new Konva.Rect({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      stroke: '#ffffff',
      strokeWidth: 1,
      dash: [4, 4],
      dashOffset: 4,
      fill: 'transparent'
    })
    
    this.selectionLayer.add(bgRect)
    this.selectionLayer.add(rect)
    
    // Animate marching ants
    const anim = new Konva.Animation((frame) => {
      if (frame) {
        const dashOffset = (frame.time / 50) % 8
        rect.dashOffset(-dashOffset)
        bgRect.dashOffset(4 - dashOffset)
      }
    }, this.selectionLayer)
    
    anim.start()
    
    // Stop animation after a short time
    setTimeout(() => {
      anim.stop()
      this.selectionLayer?.destroyChildren()
      this.selectionLayer?.batchDraw()
    }, 500)
  }
  
  /**
   * Apply magic wand selection for AI operations
   */
  async applyWithContext(
    point: Point,
    options?: {
      tolerance?: number
      contiguous?: boolean
      sampleAllLayers?: boolean
    }
  ): Promise<void> {
    // Set options
    if (options?.tolerance !== undefined) {
      this.setOption('tolerance', options.tolerance)
    }
    if (options?.contiguous !== undefined) {
      this.setOption('contiguous', options.contiguous)
    }
    if (options?.sampleAllLayers !== undefined) {
      this.setOption('sampleAllLayers', options.sampleAllLayers)
    }
    
    // Simulate mouse click at the point
    await this.onMouseDown({
      point,
      screenPoint: point,
      pressure: 1,
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      button: 0
    })
  }
}

// Export singleton instance
export const magicWandTool = new MagicWandTool() 