import { Wand2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { Polygon } from 'fabric'
import { BaseTool } from './base/BaseTool'
import { selectionStyle, startMarchingAnts, stopMarchingAnts, type SelectionShape } from './utils/selectionRenderer'
import { useSelectionStore } from '@/store/selectionStore'
import { createToolState } from './utils/toolState'

// Magic wand tool state
type MagicWandToolState = {
  lastSelection: Polygon | null
}

/**
 * Magic Wand Tool - Creates color-based selections
 * Click to select similar colors within tolerance
 */
class MagicWandTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.MAGIC_WAND
  name = 'Magic Wand Tool'
  icon = Wand2
  cursor = 'crosshair'
  shortcut = 'W'
  
  // Encapsulated state
  private state = createToolState<MagicWandToolState>({
    lastSelection: null
  })
  
  // Store reference
  private selectionStore = useSelectionStore.getState()
  
  /**
   * Get tool options
   */
  private get tolerance(): number {
    return this.toolOptionsStore.getOptionValue<number>(this.id, 'tolerance') ?? 32
  }
  
  private get contiguous(): boolean {
    return this.toolOptionsStore.getOptionValue<boolean>(this.id, 'contiguous') ?? true
  }
  
  private get selectionMode(): 'new' | 'add' | 'subtract' | 'intersect' {
    const mode = this.toolOptionsStore.getOptionValue<string>(this.id, 'selectionMode')
    return (mode as 'new' | 'add' | 'subtract' | 'intersect') || 'new'
  }
  
  /**
   * Tool setup
   */
  protected setupTool(canvas: Canvas): void {
    // Disable object selection
    canvas.selection = false
    
    // Set up click handler
    this.addCanvasEvent('mouse:down', (e: unknown) => {
      const event = e as { scenePoint: { x: number; y: number } }
      this.handleClick(event.scenePoint)
    })
  }
  
  /**
   * Tool cleanup
   */
  protected cleanup(canvas: Canvas): void {
    // Clean up any existing selections
    const objects = canvas.getObjects()
    objects.forEach(obj => {
      if (obj instanceof Polygon && !obj.selectable) {
        stopMarchingAnts(obj as SelectionShape)
        canvas.remove(obj)
      }
    })
    
    // Reset state
    this.state.reset()
    
    // Re-enable object selection
    canvas.selection = true
    canvas.renderAll()
  }
  
  /**
   * Handle click to create selection
   */
  private async handleClick(point: { x: number; y: number }): Promise<void> {
    if (!this.canvas) return
    
    await this.trackAsync('magicWandClick', async () => {
      // TODO: Implement actual color-based selection algorithm
      // This would involve:
      // 1. Getting pixel data at click point
      // 2. Flood fill algorithm to find contiguous pixels within tolerance
      // 3. Converting pixel selection to vector path
      // 4. Creating selection from path
      
      // For MVP, create a simple rectangular selection at click point
      const selectionSize = 100
      const points = [
        { x: point.x - selectionSize/2, y: point.y - selectionSize/2 },
        { x: point.x + selectionSize/2, y: point.y - selectionSize/2 },
        { x: point.x + selectionSize/2, y: point.y + selectionSize/2 },
        { x: point.x - selectionSize/2, y: point.y + selectionSize/2 },
      ]
      
      // Create selection polygon
      const selection = new Polygon(points, {
        ...selectionStyle,
      })
      
      this.canvas!.add(selection)
      
      // Start marching ants animation
      startMarchingAnts(selection as SelectionShape, this.canvas!)
      
      // Apply selection based on current mode
      this.selectionStore.applySelection(this.canvas!, selection)
      
      // Store reference
      this.state.set('lastSelection', selection)
      
      // TODO: Create SelectionCommand when selection commands are implemented
      console.log('Magic wand selection created:', {
        mode: this.selectionMode,
        tolerance: this.tolerance,
        contiguous: this.contiguous,
        clickPoint: point
      })
      
      this.canvas!.renderAll()
    })
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