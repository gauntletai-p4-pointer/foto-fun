/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Target } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useCanvasStore } from '@/store/canvasStore'
import { LayerAwareSelectionManager } from '@/lib/editor/selection/LayerAwareSelectionManager'
import { FilterPipeline } from '@/lib/editor/filters/FilterPipeline'

// Define tool state
type BlurToolState = {
  isAdjusting: boolean
  radius: number
}

class BlurTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Target
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<BlurToolState>({
    isAdjusting: false,
    radius: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'blur'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { radius: this.state.get('radius') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    console.log('[BlurTool] Setting up blur tool')
    
    // Initialize filter pipeline and selection manager
    const canvasStore = useCanvasStore.getState()
    this.selectionManager = canvasStore.selectionManager as LayerAwareSelectionManager
    
    if (!this.selectionManager) {
      console.error('[BlurTool] Selection manager not found')
      return
    }
    
    this.filterPipeline = new FilterPipeline(canvas, this.selectionManager)
    console.log('[BlurTool] Filter pipeline created')
    
    // Track original filter states for preview
    this.originalFilterStates = new Map()
    this.isPreviewMode = false
    
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const radius = this.getOptionValue('blur')
      console.log('[BlurTool] Tool option changed, radius:', radius)
      if (typeof radius === 'number' && radius !== this.state.get('radius')) {
        await this.applyBlur(radius)
        this.state.set('radius', radius)
      }
    })
    
    // Apply initial value if any
    const initialRadius = this.getOptionValue('blur')
    console.log('[BlurTool] Initial radius:', initialRadius)
    if (typeof initialRadius === 'number' && initialRadius !== 0) {
      this.applyBlur(initialRadius).then(() => {
        this.state.set('radius', initialRadius)
      })
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
    console.log('[BlurTool] Setup complete')
  }
  
  // Required: Cleanup
  protected cleanupFilterTool(): void {
    // Don't reset the blur - let it persist
    this.state.setState({
      isAdjusting: false,
      radius: this.state.get('radius')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Apply blur filter
   */
  private async applyBlur(radius: number): Promise<void> {
    console.log('[BlurTool] applyBlur called with radius:', radius)
    
    if (this.state.get('isAdjusting')) {
      console.log('[BlurTool] Already adjusting, skipping')
      return
    }
    
    this.state.set('isAdjusting', true)
    this.state.set('radius', radius)
    
    try {
      console.log('[BlurTool] Calling base class applyFilter')
      // Use the base class applyFilter method
      await this.applyFilter({ radius })
      console.log('[BlurTool] Blur filter applied successfully')
    } catch (error) {
      console.error('[BlurTool] Error applying blur:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
}

// Export singleton
export const blurTool = new BlurTool() 