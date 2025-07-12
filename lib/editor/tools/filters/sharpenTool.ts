/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Zap } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useCanvasStore } from '@/store/canvasStore'
import { LayerAwareSelectionManager } from '@/lib/editor/selection/LayerAwareSelectionManager'
import { FilterPipeline } from '@/lib/editor/filters/FilterPipeline'

// Define tool state
type SharpenToolState = {
  isApplying: boolean
  strength: number
}

class SharpenTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.SHARPEN
  name = 'Sharpen'
  icon = Zap
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<SharpenToolState>({
    isApplying: false,
    strength: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'sharpen'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { strength: this.state.get('strength') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    console.log('[SharpenTool] Setting up sharpen tool')
    
    // Initialize filter pipeline and selection manager
    const canvasStore = useCanvasStore.getState()
    this.selectionManager = canvasStore.selectionManager as LayerAwareSelectionManager
    
    if (!this.selectionManager) {
      console.error('[SharpenTool] Selection manager not found')
      return
    }
    
    this.filterPipeline = new FilterPipeline(canvas, this.selectionManager)
    console.log('[SharpenTool] Filter pipeline created')
    
    // Track original filter states for preview
    this.originalFilterStates = new Map()
    this.isPreviewMode = false
    
    // Get current filter value
    const currentValue = this.getCurrentFilterValue()
    
    // Update state with current value
    this.state.set('strength', currentValue.strength || 0)
    
    // Find the sharpen tool button element
    const sharpenButton = document.querySelector(`button[data-tool-id="${this.id}"]`) as HTMLElement
    
    // Open the adjustment dialog
    canvasStore.setActiveAdjustmentTool({
      toolId: this.id,
      toolName: this.name,
      currentValue: currentValue.strength || 0,
      anchorElement: sharpenButton
    })
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
    console.log('[SharpenTool] Setup complete')
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
      strength: 0,
      isApplying: false
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Apply sharpen filter (private method for tool options)
   */
  private async applySharpenFromOptions(strength: number): Promise<void> {
    console.log('[SharpenTool] applySharpenFromOptions called with strength:', strength)
    
    if (this.state.get('isApplying')) {
      console.log('[SharpenTool] Already applying, skipping')
      return
    }
    
    this.state.set('isApplying', true)
    this.state.set('strength', strength)
    
    try {
      console.log('[SharpenTool] Calling base class applyFilter')
      // Use the base class applyFilter method
      await this.applyFilter({ strength })
      console.log('[SharpenTool] Sharpen filter applied successfully')
    } catch (error) {
      console.error('[SharpenTool] Error applying sharpen:', error)
    } finally {
      this.state.set('isApplying', false)
    }
  }

  /**
   * Apply sharpen preview (temporary)
   */
  async previewSharpen(strength: number): Promise<void> {
    if (this.state.get('isApplying')) {
      return
    }
    
    this.state.set('isApplying', true)
    
    try {
      await this.previewFilter({ strength: strength })
    } catch (error) {
      console.error('[SharpenTool] Preview failed:', error)
    } finally {
      this.state.set('isApplying', false)
    }
  }

  /**
   * Apply sharpen adjustment (permanent)
   */
  async applySharpen(strength: number): Promise<void> {
    if (this.state.get('isApplying')) {
      return
    }
    
    this.state.set('isApplying', true)
    
    try {
      await this.applyFilter({ strength: strength })
    } catch (error) {
      console.error('[SharpenTool] Apply failed:', error)
    } finally {
      this.state.set('isApplying', false)
    }
  }

  /**
   * Reset sharpen to default
   */
  resetSharpen(): void {
    // Reset to the original sharpen value when dialog was opened
    const originalStrength = this.state.get('strength')
    
    // Reset to the original strength value
    this.previewFilter({ strength: originalStrength }).catch((error: any) => {
      console.error('[SharpenTool] Reset failed:', error)
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
export const sharpenTool = new SharpenTool() 