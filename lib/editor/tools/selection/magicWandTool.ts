import { Wand2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { Path } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'
import type { Point } from '../utils/constraints'

// Magic wand tool state - use type instead of interface for index signature
type MagicWandState = {
  tolerance: number
  contiguous: boolean
  sampleAllLayers: boolean
}

/**
 * Magic Wand Tool - Selects areas of similar color
 * This is a simplified implementation for demonstration
 */
class MagicWandTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.MAGIC_WAND
  name = 'Magic Wand Tool'
  icon = Wand2
  cursor = 'crosshair'
  shortcut = 'W'
  
  // Tool state
  protected state = createToolState<MagicWandState>({
    tolerance: 32,
    contiguous: true,
    sampleAllLayers: false
  })
  
  /**
   * Tool-specific setup
   */
  protected setupTool(): void {
    // Set up event handlers
    this.addCanvasEvent('mouse:down', (e: unknown) => this.handleClick(e as { scenePoint: Point }))
    
    // Subscribe to tool options
    this.subscribeToToolOptions((options) => {
      const tolerance = options.find(opt => opt.id === 'tolerance')?.value
      if (tolerance !== undefined) {
        this.state.set('tolerance', tolerance as number)
      }
      
      const contiguous = options.find(opt => opt.id === 'contiguous')?.value
      if (contiguous !== undefined) {
        this.state.set('contiguous', contiguous as boolean)
      }
      
      const sampleAllLayers = options.find(opt => opt.id === 'sampleAllLayers')?.value
      if (sampleAllLayers !== undefined) {
        this.state.set('sampleAllLayers', sampleAllLayers as boolean)
      }
    })
  }
  
  /**
   * Handle click to select similar colors
   */
  private handleClick(e: { scenePoint: Point }): void {
    if (!this.canvas) return
    
    const pointer = e.scenePoint
    
    // Track performance
    this.track('magicWandSelect', () => {
      // Get canvas image data
      const ctx = this.canvas!.getContext()
      const imageData = ctx.getImageData(0, 0, this.canvas!.width!, this.canvas!.height!)
      
      // Get clicked pixel color
      const x = Math.floor(pointer.x)
      const y = Math.floor(pointer.y)
      const index = (y * imageData.width + x) * 4
      
      const targetColor = {
        r: imageData.data[index],
        g: imageData.data[index + 1],
        b: imageData.data[index + 2],
        a: imageData.data[index + 3]
      }
      
      // Create selection based on color similarity
      const selection = this.createColorSelection(imageData, targetColor, x, y)
      
      if (selection) {
        this.applySelection(selection)
      }
    })
  }
  
  /**
   * Create selection based on color similarity
   * This is a simplified implementation - a real magic wand would use
   * flood fill algorithm for contiguous selection
   */
  private createColorSelection(
    imageData: ImageData,
    targetColor: { r: number; g: number; b: number; a: number },
    startX: number,
    startY: number
  ): Path | null {
    // For demonstration, create a simple rectangular selection
    // In a real implementation, this would use flood fill to find connected pixels
    const bounds = {
      minX: startX,
      maxX: startX,
      minY: startY,
      maxY: startY
    }
    
    // Simplified: just create a small selection around the click point
    const size = 50
    bounds.minX = Math.max(0, startX - size)
    bounds.maxX = Math.min(imageData.width, startX + size)
    bounds.minY = Math.max(0, startY - size)
    bounds.maxY = Math.min(imageData.height, startY + size)
    
    // Create path for selection
    const pathData = `
      M ${bounds.minX} ${bounds.minY}
      L ${bounds.maxX} ${bounds.minY}
      L ${bounds.maxX} ${bounds.maxY}
      L ${bounds.minX} ${bounds.maxY}
      Z
    `
    
    return new Path(pathData, {
      ...selectionStyle
    })
  }
  
  /**
   * Apply the selection
   */
  private applySelection(selection: Path): void {
    if (!this.canvas) return
    
    // Get selection manager and mode
    const canvasStore = useCanvasStore.getState()
    const selectionStore = useSelectionStore.getState()
    
    if (!canvasStore.selectionManager || !canvasStore.selectionRenderer) {
      console.error('Selection system not initialized')
      return
    }
    
    // Add the path temporarily to get bounds
    this.canvas.add(selection)
    
    // Create pixel selection from path
    canvasStore.selectionManager.createFromPath(selection, selectionStore.mode)
    
    // Update selection state
    const bounds = selection.getBoundingRect()
    selectionStore.updateSelectionState(true, {
      x: bounds.left,
      y: bounds.top,
      width: bounds.width,
      height: bounds.height
    })
    
    // Remove the temporary path
    this.canvas.remove(selection)
    
    // Start rendering the selection
    canvasStore.selectionRenderer.startRendering()
    
    console.log('Magic wand selection created:', {
      mode: selectionStore.mode,
      tolerance: this.state.get('tolerance')
    })
  }
  
  /**
   * Tool-specific cleanup
   */
  protected cleanup(): void {
    // Reset state if needed
    this.state.reset()
  }
}

// Export singleton instance
export const magicWandTool = new MagicWandTool()

// TODO: Implement actual magic wand algorithm
// This would involve:
// 1. Getting pixel data at click point
// 2. Flood fill algorithm to find contiguous pixels within tolerance
// 3. Converting pixel selection to vector path
// 4. Creating selection from path 