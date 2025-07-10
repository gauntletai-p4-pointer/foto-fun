import { Sparkles } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, Selection } from '@/lib/editor/canvas/types'
import { SelectionCreatedEvent, SelectionModifiedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Quick Selection Tool - Brush-based smart selection
 * Konva implementation with edge detection and automatic refinement
 */
export class QuickSelectionTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.QUICK_SELECTION
  name = 'Quick Selection Tool'
  icon = Sparkles
  cursor = 'crosshair'
  shortcut = 'Q'
  
  // Selection state
  private isSelecting = false
  private currentSelection: ImageData | null = null
  private selectionBounds: { x: number; y: number; width: number; height: number } | null = null
  private brushPath: Point[] = []
  private selectionLayer: Konva.Layer | null = null
  private brushIndicator: Konva.Circle | null = null
  private mode: 'add' | 'subtract' = 'add'
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create a dedicated layer for selection visualization
    this.selectionLayer = new Konva.Layer()
    canvas.konvaStage.add(this.selectionLayer)
    
    // Move selection layer to top
    this.selectionLayer.moveToTop()
    
    // Create brush indicator
    this.brushIndicator = new Konva.Circle({
      radius: 15,
      stroke: '#000000',
      strokeWidth: 1,
      fill: 'transparent',
      visible: false
    })
    this.selectionLayer.add(this.brushIndicator)
    
    // Set default options
    this.setOption('brushSize', 30)
    this.setOption('hardness', 0.8)
    this.setOption('autoEnhance', true)
  }
  
  protected cleanupTool(): void {
    // Clean up selection layer
    if (this.selectionLayer) {
      this.selectionLayer.destroy()
      this.selectionLayer = null
    }
    
    // Reset state
    this.isSelecting = false
    this.currentSelection = null
    this.selectionBounds = null
    this.brushPath = []
    this.brushIndicator = null
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.selectionLayer) return
    
    this.isSelecting = true
    this.brushPath = [{ x: event.point.x, y: event.point.y }]
    
    // Determine mode based on modifier keys
    this.mode = event.altKey ? 'subtract' : 'add'
    
    // Update brush indicator
    if (this.brushIndicator) {
      this.brushIndicator.visible(true)
      this.brushIndicator.position(event.point)
      this.selectionLayer.batchDraw()
    }
    
    // Start selection
    this.updateSelection(event.point)
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.selectionLayer || !this.brushIndicator) return
    
    // Update brush indicator position
    this.brushIndicator.position(event.point)
    
    if (this.isSelecting) {
      // Add point to brush path
      this.brushPath.push({ x: event.point.x, y: event.point.y })
      
      // Update selection
      this.updateSelection(event.point)
    }
    
    this.selectionLayer.batchDraw()
  }
  
  async onMouseUp(event: ToolEvent): Promise<void> {
    if (!this.isSelecting || !this.selectionLayer) return
    
    this.isSelecting = false
    
    // Hide brush indicator
    if (this.brushIndicator) {
      this.brushIndicator.visible(false)
    }
    
    // Finalize selection
    if (this.currentSelection && this.selectionBounds) {
      const canvas = this.getCanvas()
      
      // Apply auto-enhance if enabled
      if (this.getOption('autoEnhance')) {
        this.enhanceSelection()
      }
      
      // Create pixel selection
      const selection: Selection = {
        type: 'pixel',
        bounds: this.selectionBounds,
        mask: this.currentSelection
      }
      
      // Set selection on canvas
      canvas.setSelection(selection)
      
      // Emit event if in ExecutionContext
      if (this.executionContext) {
        if (this.brushPath.length === 1) {
          await this.executionContext.emit(new SelectionCreatedEvent(
            'canvas',
            selection,
            this.executionContext.getMetadata()
          ))
        } else {
          // For modified selection, we need the previous selection
          const previousSelection = canvas.state.selection
          await this.executionContext.emit(new SelectionModifiedEvent(
            'canvas',
            previousSelection || selection,
            selection,
            this.executionContext.getMetadata()
          ))
        }
      }
    }
    
    // Reset brush path
    this.brushPath = []
    this.selectionLayer.batchDraw()
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Cancel selection on Escape
    if (event.key === 'Escape' && this.isSelecting) {
      this.cancelSelection()
    }
  }
  
  /**
   * Update selection based on brush position
   */
  private updateSelection(point: Point): void {
    const canvas = this.getCanvas()
    const brushSize = (this.getOption('brushSize') as number) || 30
    const hardness = (this.getOption('hardness') as number) || 0.8
    
    // Get canvas image data
    const imageData = canvas.getImageData()
    
    // Initialize selection if needed
    if (!this.currentSelection) {
      this.currentSelection = new ImageData(imageData.width, imageData.height)
      this.selectionBounds = {
        x: imageData.width,
        y: imageData.height,
        width: 0,
        height: 0
      }
    }
    
    // Get color at brush center for reference
    const centerX = Math.floor(point.x)
    const centerY = Math.floor(point.y)
    const centerIndex = (centerY * imageData.width + centerX) * 4
    const referenceColor = {
      r: imageData.data[centerIndex],
      g: imageData.data[centerIndex + 1],
      b: imageData.data[centerIndex + 2],
      a: imageData.data[centerIndex + 3]
    }
    
    // Apply brush selection
    const radius = brushSize / 2
    const radiusSquared = radius * radius
    
    for (let y = Math.floor(centerY - radius); y <= Math.floor(centerY + radius); y++) {
      for (let x = Math.floor(centerX - radius); x <= Math.floor(centerX + radius); x++) {
        if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) continue
        
        const dx = x - centerX
        const dy = y - centerY
        const distanceSquared = dx * dx + dy * dy
        
        if (distanceSquared <= radiusSquared) {
          const index = (y * imageData.width + x) * 4
          
          // Check color similarity
          const pixelColor = {
            r: imageData.data[index],
            g: imageData.data[index + 1],
            b: imageData.data[index + 2],
            a: imageData.data[index + 3]
          }
          
          const similarity = this.calculateColorSimilarity(pixelColor, referenceColor)
          
          if (similarity > 0.7) { // Threshold for selection
            // Calculate brush falloff
            const distance = Math.sqrt(distanceSquared)
            const falloff = this.calculateFalloff(distance, radius, hardness)
            
            if (this.mode === 'add') {
              // Add to selection
              const currentAlpha = this.currentSelection.data[index + 3]
              this.currentSelection.data[index] = 255
              this.currentSelection.data[index + 1] = 255
              this.currentSelection.data[index + 2] = 255
              this.currentSelection.data[index + 3] = Math.max(currentAlpha, 255 * falloff * similarity)
            } else {
              // Subtract from selection
              this.currentSelection.data[index + 3] *= (1 - falloff)
            }
            
            // Update bounds
            this.selectionBounds!.x = Math.min(this.selectionBounds!.x, x)
            this.selectionBounds!.y = Math.min(this.selectionBounds!.y, y)
            this.selectionBounds!.width = Math.max(this.selectionBounds!.width, x - this.selectionBounds!.x + 1)
            this.selectionBounds!.height = Math.max(this.selectionBounds!.height, y - this.selectionBounds!.y + 1)
          }
        }
      }
    }
    
    // Show selection feedback
    this.showSelectionFeedback()
  }
  
  /**
   * Calculate color similarity between two colors
   */
  private calculateColorSimilarity(
    color1: { r: number; g: number; b: number; a: number },
    color2: { r: number; g: number; b: number; a: number }
  ): number {
    // Normalize colors
    const c1 = { r: color1.r / 255, g: color1.g / 255, b: color1.b / 255 }
    const c2 = { r: color2.r / 255, g: color2.g / 255, b: color2.b / 255 }
    
    // Calculate Euclidean distance in RGB space
    const distance = Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    )
    
    // Convert to similarity (1 = identical, 0 = completely different)
    return 1 - (distance / Math.sqrt(3))
  }
  
  /**
   * Calculate brush falloff
   */
  private calculateFalloff(distance: number, radius: number, hardness: number): number {
    const normalized = distance / radius
    
    if (normalized <= hardness) {
      return 1
    } else {
      // Smooth falloff from hardness to edge
      const falloffRange = 1 - hardness
      const falloffDistance = normalized - hardness
      return 1 - (falloffDistance / falloffRange)
    }
  }
  
  /**
   * Enhance selection using edge detection
   */
  private enhanceSelection(): void {
    if (!this.currentSelection || !this.selectionBounds) return
    
    const canvas = this.getCanvas()
    const imageData = canvas.getImageData(this.selectionBounds)
    
    // Apply edge detection to refine selection boundaries
    const edges = this.detectEdges(imageData)
    
    // Refine selection based on edges
    for (let y = 0; y < this.selectionBounds.height; y++) {
      for (let x = 0; x < this.selectionBounds.width; x++) {
        const index = (y * this.selectionBounds.width + x) * 4
        const globalIndex = ((y + this.selectionBounds.y) * this.currentSelection.width + 
                            (x + this.selectionBounds.x)) * 4
        
        // Adjust selection alpha based on edge strength
        const edgeStrength = edges.data[index] / 255
        const currentAlpha = this.currentSelection.data[globalIndex + 3]
        
        // Enhance edges
        if (edgeStrength > 0.5) {
          this.currentSelection.data[globalIndex + 3] = currentAlpha > 128 ? 255 : 0
        }
      }
    }
  }
  
  /**
   * Simple edge detection using Sobel operator
   */
  private detectEdges(imageData: ImageData): ImageData {
    const width = imageData.width
    const height = imageData.height
    const edges = new ImageData(width, height)
    
    // Sobel operators
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let pixelX = 0
        let pixelY = 0
        
        // Apply Sobel operators
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const idx = ((y + j) * width + (x + i)) * 4
            const gray = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3
            
            const kernelIdx = (j + 1) * 3 + (i + 1)
            pixelX += gray * sobelX[kernelIdx]
            pixelY += gray * sobelY[kernelIdx]
          }
        }
        
        // Calculate edge magnitude
        const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY)
        const index = (y * width + x) * 4
        
        edges.data[index] = magnitude
        edges.data[index + 1] = magnitude
        edges.data[index + 2] = magnitude
        edges.data[index + 3] = 255
      }
    }
    
    return edges
  }
  
  /**
   * Show visual feedback for the selection
   */
  private showSelectionFeedback(): void {
    if (!this.selectionLayer || !this.currentSelection || !this.selectionBounds) return
    
    // Clear previous feedback (except brush indicator)
    this.selectionLayer.children.forEach(child => {
      if (child !== this.brushIndicator) {
        child.destroy()
      }
    })
    
    // Create selection overlay
    const overlay = new Konva.Rect({
      x: this.selectionBounds.x,
      y: this.selectionBounds.y,
      width: this.selectionBounds.width,
      height: this.selectionBounds.height,
      fill: 'rgba(0, 100, 255, 0.3)',
      stroke: '#0066ff',
      strokeWidth: 1,
      dash: [4, 4]
    })
    
    this.selectionLayer.add(overlay)
    overlay.moveToBottom() // Keep brush indicator on top
    this.selectionLayer.batchDraw()
  }
  
  /**
   * Cancel current selection
   */
  private cancelSelection(): void {
    this.isSelecting = false
    this.currentSelection = null
    this.selectionBounds = null
    this.brushPath = []
    
    if (this.brushIndicator) {
      this.brushIndicator.visible(false)
    }
    
    if (this.selectionLayer) {
      this.selectionLayer.children.forEach(child => {
        if (child !== this.brushIndicator) {
          child.destroy()
        }
      })
      this.selectionLayer.batchDraw()
    }
  }
  
  /**
   * Apply quick selection for AI operations
   */
  async applyWithContext(
    brushPath: Point[],
    options?: {
      brushSize?: number
      hardness?: number
      autoEnhance?: boolean
      mode?: 'add' | 'subtract'
    }
  ): Promise<void> {
    // Set options
    if (options?.brushSize !== undefined) {
      this.setOption('brushSize', options.brushSize)
    }
    if (options?.hardness !== undefined) {
      this.setOption('hardness', options.hardness)
    }
    if (options?.autoEnhance !== undefined) {
      this.setOption('autoEnhance', options.autoEnhance)
    }
    
    // Apply brush strokes
    for (const point of brushPath) {
      this.mode = options?.mode || 'add'
      this.updateSelection(point)
    }
    
    // Finalize selection
    if (this.currentSelection && this.selectionBounds) {
      const canvas = this.getCanvas()
      
      if (this.getOption('autoEnhance')) {
        this.enhanceSelection()
      }
      
      const selection: Selection = {
        type: 'pixel',
        bounds: this.selectionBounds,
        mask: this.currentSelection
      }
      
      canvas.setSelection(selection)
      
      if (this.executionContext) {
        await this.executionContext.emit(new SelectionCreatedEvent(
          'canvas',
          selection,
          this.executionContext.getMetadata()
        ))
      }
    }
  }
}

// Export singleton instance
export const quickSelectionTool = new QuickSelectionTool() 