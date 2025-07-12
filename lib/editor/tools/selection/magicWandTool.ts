import { Wand2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { Path } from 'fabric'
import type { TPointerEventInfo } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { selectionStyle } from '../utils/selectionRenderer'
import { useCanvasStore } from '@/store/canvasStore'
import { useSelectionStore } from '@/store/selectionStore'
import { CreateSelectionCommand } from '@/lib/editor/commands/selection'
import { useObjectRegistryStore } from '@/store/objectRegistryStore'
import { LayerAwareSelectionManager } from '@/lib/editor/selection/LayerAwareSelectionManager'
import { markAsSystemObject } from '@/lib/editor/utils/systemObjects'
import { SystemObjectType } from '@/types/fabric'

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
  
  // Store reference
  protected selectionStore = useSelectionStore.getState()
  
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
    this.addCanvasEvent('mouse:down', (e: unknown) => this.handleMouseDown(e as TPointerEventInfo<MouseEvent>))
    
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
   * Handle mouse down - create selection based on color
   */
  private handleMouseDown(e: TPointerEventInfo<MouseEvent>): void {
    if (!this.canvas) return
    
    // Use Fabric's getPointer method to get the correct transformed coordinates
    const pointer = this.canvas.getPointer(e.e)
    const x = Math.floor(pointer.x)
    const y = Math.floor(pointer.y)
    
    // Check if we're in object mode
    const selectionTarget = this.toolOptionsStore.getOptionValue<string>(this.id, 'selectionTarget') || 'auto'
    let targetObjectId: string | null = null
    let isObjectMode = false
    
    // Determine target object based on selection target mode
    if (selectionTarget === 'auto' || selectionTarget === 'object') {
      const objectRegistry = useObjectRegistryStore.getState()
      const targetObject = objectRegistry.getTopObjectAtPixel(x, y)
      
      if (targetObject) {
        targetObjectId = targetObject.get('id') as string
        isObjectMode = true
        
        // Get selection manager and set active object
        const selectionManager = this.canvasStore.selectionManager as LayerAwareSelectionManager
        if (selectionManager) {
          selectionManager.setActiveObject(targetObjectId)
          selectionManager.setSelectionMode('object')
        }
      } else if (selectionTarget === 'auto') {
        // In auto mode, if no object clicked, use canvas mode
        const selectionManager = this.canvasStore.selectionManager as LayerAwareSelectionManager
        if (selectionManager) {
          selectionManager.setActiveObject(null)
          selectionManager.setSelectionMode('global')
        }
      }
    } else if (selectionTarget === 'canvas') {
      // Canvas mode
      const selectionManager = this.canvasStore.selectionManager as LayerAwareSelectionManager
      if (selectionManager) {
        selectionManager.setActiveObject(null)
        selectionManager.setSelectionMode('global')
      }
    }
    
    // Get canvas image data
    const ctx = this.canvas.getContext()
    const imageData = ctx.getImageData(0, 0, this.canvas.width!, this.canvas.height!)
    
    // Create selection based on color at clicked point
    this.createColorSelection(x, y, imageData, targetObjectId, isObjectMode)
  }
  
  /**
   * Create selection based on color similarity
   * This is a simplified implementation - a real magic wand would use
   * flood fill algorithm for contiguous selection
   */
  private createColorSelection(x: number, y: number, imageData: ImageData, targetObjectId: string | null, isObjectMode: boolean): void {
    // Get clicked pixel color
    // const index = (y * imageData.width + x) * 4
    // TODO: Use targetColor for actual color-based selection with flood fill
    // const targetColor = {
    //   r: imageData.data[index],
    //   g: imageData.data[index + 1],
    //   b: imageData.data[index + 2],
    //   a: imageData.data[index + 3]
    // }
    
    // For demonstration, create a simple rectangular selection
    // In a real implementation, this would use flood fill to find connected pixels
    const bounds = {
      minX: x,
      maxX: x,
      minY: y,
      maxY: y
    }
    
    // Simplified: just create a small selection around the click point
    const size = 50
    bounds.minX = Math.max(0, x - size)
    bounds.maxX = Math.min(imageData.width, x + size)
    bounds.minY = Math.max(0, y - size)
    bounds.maxY = Math.min(imageData.height, y + size)
    
    // Create path for selection
    const pathData = `
      M ${bounds.minX} ${bounds.minY}
      L ${bounds.maxX} ${bounds.minY}
      L ${bounds.maxX} ${bounds.maxY}
      L ${bounds.minX} ${bounds.maxY}
      Z
    `
    
    const selection = new Path(pathData, {
      ...selectionStyle
    })
    
    // Mark as system object
    markAsSystemObject(selection, SystemObjectType.TEMPORARY)
    
    // Apply the selection
    this.applySelection(selection)
  }
  
  /**
   * Apply the selection
   */
  private applySelection(selection: Path): void {
    if (!this.canvas) return
    
    // Get selection manager
    const canvasStore = useCanvasStore.getState()
    const selectionManager = canvasStore.selectionManager
    
    if (!selectionManager) {
      console.error('Selection system not initialized')
      return
    }
    
    // Get selection mode from tool options
    const mode = this.toolOptionsStore.getOptionValue<string>(this.id, 'selectionMode') || 'new'
    
    // Add the path temporarily to canvas
    this.canvas.add(selection)
    
    // Create the selection - the selection manager will handle object-aware logic
    selectionManager.createFromPath(
      selection,
      mode === 'new' ? 'replace' : mode as 'add' | 'subtract' | 'intersect'
    )
    
    // Record command for undo/redo
    const currentSelection = selectionManager.getSelection()
    if (currentSelection) {
      const command = new CreateSelectionCommand(
        selectionManager, 
        currentSelection, 
        mode === 'new' ? 'replace' : mode as 'add' | 'subtract' | 'intersect'
      )
      this.historyStore.executeCommand(command)
      
      // Update selection store
      const bounds = selection.getBoundingRect()
      this.selectionStore.updateSelectionState(true, {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
      })
      
      // Start rendering the selection with marching ants
      const { selectionRenderer } = canvasStore
      if (selectionRenderer) {
        selectionRenderer.startRendering()
      }
    }
    
    // Remove the temporary path
    this.canvas.remove(selection)
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