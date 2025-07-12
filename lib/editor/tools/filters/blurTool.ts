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
    
    // Get current filter value
    const currentValue = this.getCurrentFilterValue()
    
    // Update state with current value
    this.state.set('radius', currentValue.radius || 0)
    
    // Find the blur tool button element
    const blurButton = document.querySelector(`button[data-tool-id="${this.id}"]`) as HTMLElement
    
    // Open the adjustment dialog
    canvasStore.setActiveAdjustmentTool({
      toolId: this.id,
      toolName: this.name,
      currentValue: currentValue.radius || 0,
      anchorElement: blurButton
    })
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
    console.log('[BlurTool] Setup complete')
  }
  
  // Required: Cleanup
  protected cleanupFilterTool(): void {
    // Close the dialog if it's open
    const canvasStore = useCanvasStore.getState()
    if (canvasStore.activeAdjustmentTool?.toolId === this.id) {
      canvasStore.setActiveAdjustmentTool(null)
    }
    
    // Reset state
    this.state.setState({
      radius: 0,
      isAdjusting: false
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Apply blur filter (private method for tool options)
   */
  private async applyBlurFromOptions(radius: number): Promise<void> {
    console.log('[BlurTool] applyBlurFromOptions called with radius:', radius)
    
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

  /**
   * Apply blur preview (temporary)
   */
  async previewBlur(radius: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      await this.previewFilter({ radius: radius })
    } catch (error) {
      console.error('[BlurTool] Preview failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }

  /**
   * Apply blur adjustment (permanent)
   */
  async applyBlur(radius: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      await this.applyFilter({ radius: radius })
    } catch (error) {
      console.error('[BlurTool] Apply failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }

  /**
   * Reset blur to default
   */
  resetBlur(): void {
    // Reset to the original blur value when dialog was opened
    const originalRadius = this.state.get('radius')
    
    // Reset to the original radius value
    this.previewFilter({ radius: originalRadius }).catch((error: any) => {
      console.error('[BlurTool] Reset failed:', error)
    })
  }

  // Override onDeactivate to close dialog
  onDeactivate(canvas: Canvas): void {
    // Ensure dialog is closed when tool is deactivated
    const canvasStore = useCanvasStore.getState()
    if (canvasStore.activeAdjustmentTool?.toolId === this.id) {
      canvasStore.setActiveAdjustmentTool(null)
    }
    
    super.onDeactivate(canvas)
  }
}

// Export singleton
export const blurTool = new BlurTool() 