import Konva from 'konva'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import type { SelectionManager } from './SelectionManager'
import type { PixelSelection } from '@/types'

/**
 * SelectionRenderer - Handles visual rendering of selections with marching ants
 * 
 * This class is responsible for displaying the selection visually
 * on the canvas using Konva, including the marching ants animation.
 * It uses edge detection to create accurate selection boundaries.
 */
export class SelectionRenderer {
  private canvasManager: CanvasManager
  private selectionManager: SelectionManager
  private selectionGroup: Konva.Group | null = null
  private marchingAntsAnimation: Konva.Animation | null = null
  private animationOffset = 0
  private overlayLayer: Konva.Layer | null = null
  
  constructor(canvasManager: CanvasManager, selectionManager: SelectionManager) {
    this.canvasManager = canvasManager
    this.selectionManager = selectionManager
    this.initializeOverlayLayer()
  }
  
  /**
   * Initialize or get the overlay layer for selection rendering
   */
  private initializeOverlayLayer(): void {
    const stage = this.canvasManager.konvaStage
    
    // Find or create overlay layer
    let overlayLayer = stage.findOne('.selection-overlay') as Konva.Layer
    
    if (!overlayLayer) {
      overlayLayer = new Konva.Layer({
        name: 'selection-overlay',
        listening: false
      })
      stage.add(overlayLayer)
    }
    
    this.overlayLayer = overlayLayer
  }
  
  /**
   * Start rendering the selection
   */
  startRendering(): void {
    if (this.marchingAntsAnimation) return
    
    const selection = this.selectionManager.getSelection()
    if (!selection || !this.overlayLayer) return
    
    // Create initial display
    this.updateSelectionDisplay()
    
    // Create marching ants animation
    this.marchingAntsAnimation = new Konva.Animation((frame) => {
      if (frame) {
        this.animationOffset = (frame.time / 100) % 10
        this.updateMarchingAnts()
      }
    }, this.overlayLayer)
    
    this.marchingAntsAnimation.start()
  }
  
  /**
   * Stop rendering the selection
   */
  stopRendering(): void {
    if (this.marchingAntsAnimation) {
      this.marchingAntsAnimation.stop()
      this.marchingAntsAnimation = null
    }
    this.clearSelectionDisplay()
  }
  
  /**
   * Update the selection display
   */
  updateSelectionDisplay(): void {
    // Clear existing display
    this.clearSelectionDisplay()
    
    const selection = this.selectionManager.getSelection()
    if (!selection || !this.overlayLayer) return
    
    // Create selection outline
    const selectionPaths = this.createSelectionPaths(selection)
    
    if (selectionPaths.length > 0) {
      this.selectionGroup = new Konva.Group({
        name: 'selection-marching-ants'
      })
      
      // Add all paths to the group
      selectionPaths.forEach(pathData => {
        const pathGroup = this.createMarchingAntsPath(pathData)
        this.selectionGroup!.add(pathGroup)
      })
      
      this.overlayLayer.add(this.selectionGroup)
      this.overlayLayer.batchDraw()
    }
  }
  
  /**
   * Update only the marching ants offset
   */
  private updateMarchingAnts(): void {
    if (!this.selectionGroup) return
    
    // Update dash offset for all marching ants paths
    this.selectionGroup.find('.marching-ants').forEach((node) => {
      if (node instanceof Konva.Path) {
        node.dashOffset(-this.animationOffset)
      }
    })
    
    this.overlayLayer?.batchDraw()
  }
  
  /**
   * Clear the selection display
   */
  private clearSelectionDisplay(): void {
    if (this.selectionGroup) {
      this.selectionGroup.destroy()
      this.selectionGroup = null
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.batchDraw()
    }
  }
  
  /**
   * Create marching ants path visual
   */
  private createMarchingAntsPath(pathData: string): Konva.Group {
    const group = new Konva.Group()
    
    // White background stroke for visibility
    const backgroundPath = new Konva.Path({
      data: pathData,
      stroke: 'white',
      strokeWidth: 2,
      fill: 'transparent',
      listening: false
    })
    
    // Black marching ants
    const marchingAntsPath = new Konva.Path({
      data: pathData,
      stroke: 'black',
      strokeWidth: 1,
      dash: [4, 4],
      dashOffset: -this.animationOffset,
      fill: 'transparent',
      listening: false,
      name: 'marching-ants'
    })
    
    group.add(backgroundPath)
    group.add(marchingAntsPath)
    
    return group
  }
  
  /**
   * Create selection paths from pixel selection using edge detection
   */
  private createSelectionPaths(selection: PixelSelection): string[] {
    const { mask, bounds } = selection
    
    // Use marching squares algorithm to find edges
    const edges = this.findSelectionEdges(mask, bounds)
    
    // Convert edge points to SVG paths
    return this.edgesToPaths(edges)
  }
  
  /**
   * Find selection edges using a simplified marching squares algorithm
   */
  private findSelectionEdges(mask: ImageData, bounds: { x: number; y: number; width: number; height: number }): number[][][] {
    const edges: number[][][] = []
    const width = mask.width
    const height = mask.height
    const data = mask.data
    
    // Helper to check if pixel is selected
    const isSelected = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false
      const idx = (y * width + x) * 4
      return data[idx + 3] > 128 // Alpha > 50%
    }
    
    // Find horizontal edges
    const visitedH = new Set<string>()
    
    for (let y = 0; y <= height; y++) {
      for (let x = 0; x < width; x++) {
        const above = isSelected(x, y - 1)
        const below = isSelected(x, y)
        
        if (above !== below) {
          const key = `h:${x},${y}`
          if (!visitedH.has(key)) {
            // Start tracing edge
            const edge = this.traceHorizontalEdge(x, y, mask, visitedH)
            if (edge.length > 1) {
              edges.push(edge)
            }
          }
        }
      }
    }
    
    // Find vertical edges
    const visitedV = new Set<string>()
    
    for (let x = 0; x <= width; x++) {
      for (let y = 0; y < height; y++) {
        const left = isSelected(x - 1, y)
        const right = isSelected(x, y)
        
        if (left !== right) {
          const key = `v:${x},${y}`
          if (!visitedV.has(key)) {
            // Start tracing edge
            const edge = this.traceVerticalEdge(x, y, mask, visitedV)
            if (edge.length > 1) {
              edges.push(edge)
            }
          }
        }
      }
    }
    
    // Offset edges by bounds
    return edges.map(edge => 
      edge.map(point => [point[0] + bounds.x, point[1] + bounds.y])
    )
  }
  
  /**
   * Trace a horizontal edge
   */
  private traceHorizontalEdge(startX: number, y: number, mask: ImageData, visited: Set<string>): number[][] {
    const edge: number[][] = []
    const width = mask.width
    const data = mask.data
    
    const isSelected = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= mask.height) return false
      const idx = (y * width + x) * 4
      return data[idx + 3] > 128
    }
    
    let x = startX
    
    // Trace edge
    while (x < width) {
      const above = isSelected(x, y - 1)
      const below = isSelected(x, y)
      
      if (above !== below) {
        const key = `h:${x},${y}`
        if (visited.has(key)) break
        
        visited.add(key)
        edge.push([x, y])
        x++
      } else {
        break
      }
    }
    
    return edge
  }
  
  /**
   * Trace a vertical edge
   */
  private traceVerticalEdge(x: number, startY: number, mask: ImageData, visited: Set<string>): number[][] {
    const edge: number[][] = []
    const width = mask.width
    const height = mask.height
    const data = mask.data
    
    const isSelected = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false
      const idx = (y * width + x) * 4
      return data[idx + 3] > 128
    }
    
    let y = startY
    
    // Trace edge
    while (y < height) {
      const left = isSelected(x - 1, y)
      const right = isSelected(x, y)
      
      if (left !== right) {
        const key = `v:${x},${y}`
        if (visited.has(key)) break
        
        visited.add(key)
        edge.push([x, y])
        y++
      } else {
        break
      }
    }
    
    return edge
  }
  
  /**
   * Convert edge arrays to SVG path strings
   */
  private edgesToPaths(edges: number[][][]): string[] {
    return edges.map(edge => {
      if (edge.length < 2) return ''
      
      let path = `M ${edge[0][0]} ${edge[0][1]}`
      for (let i = 1; i < edge.length; i++) {
        path += ` L ${edge[i][0]} ${edge[i][1]}`
      }
      
      return path
    }).filter(path => path.length > 0)
  }
  
  /**
   * Check if currently animating
   */
  isRendering(): boolean {
    return this.marchingAntsAnimation !== null && this.marchingAntsAnimation.isRunning()
  }
  
  /**
   * Destroy the renderer and clean up resources
   */
  destroy(): void {
    this.stopRendering()
    
    if (this.overlayLayer) {
      this.overlayLayer.destroy()
      this.overlayLayer = null
    }
  }
} 