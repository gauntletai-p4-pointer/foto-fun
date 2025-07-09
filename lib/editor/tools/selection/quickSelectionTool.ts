import { Sparkles } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, TPointerEventInfo } from 'fabric'
import { Path } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useHistoryStore } from '@/store/historyStore'
import { CreateSelectionCommand } from '@/lib/editor/commands/selection'
import type { Point } from '../utils/constraints'

// Quick selection tool state
type QuickSelectionState = {
  isSelecting: boolean
  startPoint: Point | null
  currentPoint: Point | null
  tolerance: number
  brushSize: number
  autoExpand: boolean
  edgeDetection: boolean
  selectedPixels: Set<string>
  processedRegions: Set<string>
}

/**
 * Quick Selection Tool - Intelligently selects similar regions
 * 
 * Features:
 * - Click and drag to select similar colors/tones
 * - Edge detection for smart boundaries
 * - Grows selection as you drag
 * - Supports all selection modes
 */
class QuickSelectionTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.QUICK_SELECTION
  name = 'Quick Selection Tool'
  icon = Sparkles
  cursor = 'crosshair'
  shortcut = 'W'
  
  // Tool state
  private state = createToolState<QuickSelectionState>({
    isSelecting: false,
    startPoint: null,
    currentPoint: null,
    tolerance: 25,
    brushSize: 20,
    autoExpand: true,
    edgeDetection: true,
    selectedPixels: new Set(),
    processedRegions: new Set()
  })
  
  // Canvas data cache
  private imageDataCache: ImageData | null = null
  private feedbackPath: Path | null = null
  
  /**
   * Tool setup
   */
  protected setupTool(canvas: Canvas): void {
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      this.handleMouseDown(e as TPointerEventInfo<MouseEvent>)
    })
    
    this.addCanvasEvent('mouse:move', (e: unknown) => {
      this.handleMouseMove(e as TPointerEventInfo<MouseEvent>)
    })
    
    this.addCanvasEvent('mouse:up', () => {
      this.handleMouseUp()
    })
    
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const tolerance = options.find(opt => opt.id === 'tolerance')?.value
      if (tolerance !== undefined) {
        this.state.set('tolerance', tolerance as number)
      }
      
      const brushSize = options.find(opt => opt.id === 'brushSize')?.value
      if (brushSize !== undefined) {
        this.state.set('brushSize', brushSize as number)
      }
      
      const autoExpand = options.find(opt => opt.id === 'autoExpand')?.value
      if (autoExpand !== undefined) {
        this.state.set('autoExpand', autoExpand as boolean)
      }
      
      const edgeDetection = options.find(opt => opt.id === 'edgeDetection')?.value
      if (edgeDetection !== undefined) {
        this.state.set('edgeDetection', edgeDetection as boolean)
      }
    })
    
    canvas.renderAll()
  }
  
  /**
   * Handle mouse down - start selection
   */
  private handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas) return
    
    // Use Fabric's getPointer method to get the correct transformed coordinates
    const pointer = this.canvas.getPointer(e.e)
    const point = { x: pointer.x, y: pointer.y }
    
    this.track('startQuickSelection', () => {
      // Cache canvas image data
      const ctx = this.canvas!.getContext()
      this.imageDataCache = ctx.getImageData(0, 0, this.canvas!.width!, this.canvas!.height!)
      
      // Reset state for new selection
      this.state.setState({
        isSelecting: true,
        startPoint: point,
        currentPoint: point,
        selectedPixels: new Set(),
        processedRegions: new Set()
      })
      
      // Start selection at clicked point
      this.expandSelection(point.x, point.y)
    })
  }
  
  /**
   * Handle mouse move - expand selection
   */
  private handleMouseMove(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas || !this.state.get('isSelecting')) return
    
    // Use Fabric's getPointer method to get the correct transformed coordinates
    const pointer = this.canvas.getPointer(e.e)
    const point = { x: pointer.x, y: pointer.y }
    this.state.set('currentPoint', point)
    
    this.track('expandQuickSelection', () => {
      // Expand selection along the drag path
      const lastPoint = this.state.get('currentPoint') || this.state.get('startPoint')
      if (lastPoint) {
        this.expandSelectionAlongPath(lastPoint, point)
      }
    })
  }
  
  /**
   * Handle mouse up - finalize selection
   */
  private handleMouseUp(): void {
    if (!this.canvas || !this.state.get('isSelecting')) return
    
    this.track('finalizeQuickSelection', () => {
      // Convert selected pixels to selection
      this.createSelectionFromPixels()
      
      // Reset state
      this.state.setState({
        isSelecting: false,
        startPoint: null,
        currentPoint: null,
        selectedPixels: new Set(),
        processedRegions: new Set()
      })
      
      // Clear cache
      this.imageDataCache = null
    })
  }
  
  /**
   * Expand selection from a point
   */
  private expandSelection(x: number, y: number): void {
    if (!this.imageDataCache) return
    
    const brushSize = this.state.get('brushSize')
    const tolerance = this.state.get('tolerance')
    const autoExpand = this.state.get('autoExpand')
    
    // Get region around brush
    const minX = Math.max(0, Math.floor(x - brushSize))
    const maxX = Math.min(this.imageDataCache.width - 1, Math.ceil(x + brushSize))
    const minY = Math.max(0, Math.floor(y - brushSize))
    const maxY = Math.min(this.imageDataCache.height - 1, Math.ceil(y + brushSize))
    
    // Mark this region as processed
    const regionKey = `${Math.floor(x / brushSize)},${Math.floor(y / brushSize)}`
    if (this.state.get('processedRegions').has(regionKey)) {
      return // Already processed this region
    }
    this.state.get('processedRegions').add(regionKey)
    
    // Get target color at center
    const centerX = Math.floor(x)
    const centerY = Math.floor(y)
    const targetColor = this.getPixelColor(centerX, centerY)
    
    if (!targetColor) return
    
    // Process pixels in brush area
    const pixelsToProcess: Array<{x: number, y: number}> = []
    
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        // Check if within brush circle
        const dx = px - x
        const dy = py - y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance <= brushSize) {
          pixelsToProcess.push({x: px, y: py})
        }
      }
    }
    
    // Process pixels with flood fill if auto-expand is on
    if (autoExpand) {
      this.floodFillSelect(pixelsToProcess, targetColor, tolerance)
    } else {
      // Just select pixels in brush area that match tolerance
      for (const pixel of pixelsToProcess) {
        const pixelColor = this.getPixelColor(pixel.x, pixel.y)
        if (pixelColor && this.colorMatches(pixelColor, targetColor, tolerance)) {
          this.state.get('selectedPixels').add(`${pixel.x},${pixel.y}`)
        }
      }
    }
    
    // Update visual feedback
    this.updateFeedback()
  }
  
  /**
   * Expand selection along a path
   */
  private expandSelectionAlongPath(from: Point, to: Point): void {
    const steps = Math.ceil(Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    ))
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = from.x + (to.x - from.x) * t
      const y = from.y + (to.y - from.y) * t
      
      this.expandSelection(x, y)
    }
  }
  
  /**
   * Flood fill selection from seed pixels
   */
  private floodFillSelect(
    seedPixels: Array<{x: number, y: number}>,
    targetColor: {r: number, g: number, b: number, a: number},
    tolerance: number
  ): void {
    if (!this.imageDataCache) return
    
    const selectedPixels = this.state.get('selectedPixels')
    const edgeDetection = this.state.get('edgeDetection')
    const queue = [...seedPixels]
    const processed = new Set<string>()
    
    while (queue.length > 0) {
      const pixel = queue.shift()!
      const key = `${pixel.x},${pixel.y}`
      
      if (processed.has(key) || selectedPixels.has(key)) continue
      processed.add(key)
      
      const pixelColor = this.getPixelColor(pixel.x, pixel.y)
      if (!pixelColor) continue
      
      // Check color match
      if (!this.colorMatches(pixelColor, targetColor, tolerance)) continue
      
      // Check edge if edge detection is on
      if (edgeDetection && this.isEdgePixel(pixel.x, pixel.y)) {
        // More conservative at edges
        if (!this.colorMatches(pixelColor, targetColor, tolerance * 0.5)) continue
      }
      
      // Add to selection
      selectedPixels.add(key)
      
      // Add neighbors to queue
      const neighbors = [
        {x: pixel.x - 1, y: pixel.y},
        {x: pixel.x + 1, y: pixel.y},
        {x: pixel.x, y: pixel.y - 1},
        {x: pixel.x, y: pixel.y + 1}
      ]
      
      for (const neighbor of neighbors) {
        if (neighbor.x >= 0 && neighbor.x < this.imageDataCache.width &&
            neighbor.y >= 0 && neighbor.y < this.imageDataCache.height) {
          queue.push(neighbor)
        }
      }
    }
  }
  
  /**
   * Get pixel color from cached image data
   */
  private getPixelColor(x: number, y: number): {r: number, g: number, b: number, a: number} | null {
    if (!this.imageDataCache) return null
    
    const index = (Math.floor(y) * this.imageDataCache.width + Math.floor(x)) * 4
    
    return {
      r: this.imageDataCache.data[index],
      g: this.imageDataCache.data[index + 1],
      b: this.imageDataCache.data[index + 2],
      a: this.imageDataCache.data[index + 3]
    }
  }
  
  /**
   * Check if two colors match within tolerance
   */
  private colorMatches(
    c1: {r: number, g: number, b: number, a: number},
    c2: {r: number, g: number, b: number, a: number},
    tolerance: number
  ): boolean {
    const dr = c1.r - c2.r
    const dg = c1.g - c2.g
    const db = c1.b - c2.b
    const da = c1.a - c2.a
    
    const distance = Math.sqrt(dr * dr + dg * dg + db * db + da * da)
    return distance <= tolerance
  }
  
  /**
   * Detect if pixel is on an edge
   */
  private isEdgePixel(x: number, y: number): boolean {
    if (!this.imageDataCache) return false
    
    // Simple edge detection using color gradient
    const center = this.getPixelColor(x, y)
    if (!center) return false
    
    let gradientSum = 0
    const neighbors = [
      {x: x - 1, y: y},
      {x: x + 1, y: y},
      {x: x, y: y - 1},
      {x: x, y: y + 1}
    ]
    
    for (const neighbor of neighbors) {
      const neighborColor = this.getPixelColor(neighbor.x, neighbor.y)
      if (neighborColor) {
        const dr = center.r - neighborColor.r
        const dg = center.g - neighborColor.g
        const db = center.b - neighborColor.b
        gradientSum += Math.abs(dr) + Math.abs(dg) + Math.abs(db)
      }
    }
    
    // Threshold for edge detection
    return gradientSum > 30
  }
  
  /**
   * Update visual feedback
   */
  private updateFeedback(): void {
    if (!this.canvas) return
    
    // Remove old feedback
    if (this.feedbackPath) {
      this.canvas.remove(this.feedbackPath)
    }
    
    // Create path from selected pixels
    const pathData = this.createPathFromPixels()
    if (!pathData) return
    
    this.feedbackPath = new Path(pathData, {
      ...selectionStyle,
      fill: 'rgba(0, 120, 255, 0.3)',
      opacity: 0.5
    })
    
    this.canvas.add(this.feedbackPath)
    this.canvas.renderAll()
  }
  
  /**
   * Create SVG path from selected pixels
   */
  private createPathFromPixels(): string | null {
    const selectedPixels = this.state.get('selectedPixels')
    if (selectedPixels.size === 0) return null
    
    // Convert pixels to contour
    // This is a simplified version - a real implementation would use
    // marching squares or similar algorithm
    const pixels = Array.from(selectedPixels).map(key => {
      const [x, y] = key.split(',').map(Number)
      return {x, y}
    })
    
    if (pixels.length === 0) return null
    
    // Find bounds
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const pixel of pixels) {
      minX = Math.min(minX, pixel.x)
      minY = Math.min(minY, pixel.y)
      maxX = Math.max(maxX, pixel.x)
      maxY = Math.max(maxY, pixel.y)
    }
    
    // Create simple rectangular path for now
    return `
      M ${minX} ${minY}
      L ${maxX} ${minY}
      L ${maxX} ${maxY}
      L ${minX} ${maxY}
      Z
    `
  }
  
  /**
   * Create final selection from pixels
   */
  private createSelectionFromPixels(): void {
    if (!this.canvas) return
    
    const selectedPixels = this.state.get('selectedPixels')
    if (selectedPixels.size === 0) return
    
    // Get selection manager and mode
    const canvasStore = useCanvasStore.getState()
    const selectionStore = useSelectionStore.getState()
    const historyStore = useHistoryStore.getState()
    
    if (!canvasStore.selectionManager || !canvasStore.selectionRenderer) {
      console.error('Selection system not initialized')
      return
    }
    
    // Create image data mask from selected pixels
    const width = this.canvas.width!
    const height = this.canvas.height!
    const maskData = new ImageData(width, height)
    
    // Fill mask with selected pixels
    for (const key of selectedPixels) {
      const [x, y] = key.split(',').map(Number)
      const index = (y * width + x) * 4
      maskData.data[index + 3] = 255 // Set alpha to fully selected
    }
    
    // Find bounds
    let minX = width, minY = height
    let maxX = 0, maxY = 0
    
    for (const key of selectedPixels) {
      const [x, y] = key.split(',').map(Number)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
    
    const bounds = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
    
    // Create the selection command
    const command = new CreateSelectionCommand(
      canvasStore.selectionManager,
      {
        mask: maskData,
        bounds
      },
      selectionStore.mode
    )
    
    // Execute the command through history
    historyStore.executeCommand(command)
    
    // Update selection state
    selectionStore.updateSelectionState(true, bounds)
    
    // Start rendering
    canvasStore.selectionRenderer.startRendering()
    
    // Clean up feedback
    if (this.feedbackPath) {
      this.canvas.remove(this.feedbackPath)
      this.feedbackPath = null
    }
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up feedback
    if (this.feedbackPath) {
      canvas.remove(this.feedbackPath)
      this.feedbackPath = null
    }
    
    // Clear cache
    this.imageDataCache = null
    
    // Reset state
    this.state.reset()
    
    canvas.renderAll()
  }
}

// Export singleton instance
export const quickSelectionTool = new QuickSelectionTool() 