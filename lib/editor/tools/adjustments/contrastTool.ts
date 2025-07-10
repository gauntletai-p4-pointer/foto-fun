/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseFilterTool } from '../filters/BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useCanvasStore } from '@/store/canvasStore'
import type { Canvas } from 'fabric'

/**
 * Contrast Tool State
 */
type ContrastState = {
  adjustment: number
  isAdjusting: boolean
  dialogShown: boolean
}

/**
 * Contrast Tool - Adjust image contrast
 * Now uses modal dialog with preview functionality
 */
class ContrastTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.CONTRAST
  name = 'Contrast'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<ContrastState>({
    adjustment: 0,
    isAdjusting: false,
    dialogShown: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'contrast'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { adjustment: 0 }
  }
  
  /**
   * Tool setup - opens adjustment dialog
   */
  protected setupFilterTool(canvas: Canvas): void {
    // Reset dialog shown state to ensure it opens
    this.state.set('dialogShown', false)
    
    // Get current filter value
    const currentValue = this.getCurrentFilterValue()
    
    // Update state with current value
    this.state.set('adjustment', currentValue.adjustment)
    
    // Find the contrast tool button element
    const contrastButton = document.querySelector(`button[data-tool-id="${this.id}"]`) as HTMLElement
    
    // Open the adjustment dialog
    const canvasStore = useCanvasStore.getState()
    
    // Always show dialog when tool is activated
    this.state.set('dialogShown', true)
    
    canvasStore.setActiveAdjustmentTool({
      toolId: this.id,
      toolName: this.name,
      currentValue: 0,  // Always start slider at 0 for incremental adjustments
      anchorElement: contrastButton
    })
  }
  
  /**
   * Apply contrast preview (temporary)
   */
  async previewContrast(adjustment: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base adjustment value (what was there when dialog opened)
      const baseAdjustment = this.state.get('adjustment')
      // Apply the slider value as an increment to the base
      const totalAdjustment = baseAdjustment + adjustment
      
      // Use the base class preview method
      await this.applyFilterPreview({ adjustment: totalAdjustment })
    } catch (error) {
      console.error('[ContrastTool] Preview failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Apply contrast adjustment (permanent)
   */
  async applyContrast(adjustment: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base adjustment value (what was there when dialog opened)
      const baseAdjustment = this.state.get('adjustment')
      // Apply the slider value as an increment to the base
      const totalAdjustment = baseAdjustment + adjustment
      
      // Use the base class apply method
      await this.applyFilter({ adjustment: totalAdjustment })
    } catch (error) {
      console.error('[ContrastTool] Apply failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Reset contrast to default
   */
  resetContrast(): void {
    // Get the base adjustment value (what was there when dialog opened)
    const baseAdjustment = this.state.get('adjustment')
    
    // Reset to the base adjustment (not 0)
    this.applyFilterPreview({ adjustment: baseAdjustment }).catch(error => {
      console.error('[ContrastTool] Reset failed:', error)
    })
  }
  
  /**
   * Tool cleanup
   */
  protected cleanupFilterTool(): void {
    // Close the dialog if it's open
    const canvasStore = useCanvasStore.getState()
    if (canvasStore.activeAdjustmentTool?.toolId === this.id) {
      canvasStore.setActiveAdjustmentTool(null)
    }
    
    // Reset state
    this.state.setState({
      adjustment: 0,
      isAdjusting: false,
      dialogShown: false
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  // Override onActivate to log
  onActivate(canvas: Canvas): void {
    super.onActivate(canvas)
  }
  
  // Override onDeactivate to log
  onDeactivate(canvas: Canvas): void {
    // Ensure dialog is closed when tool is deactivated
    const canvasStore = useCanvasStore.getState()
    if (canvasStore.activeAdjustmentTool?.toolId === this.id) {
      canvasStore.setActiveAdjustmentTool(null)
    }
    
    super.onDeactivate(canvas)
  }
}

// Export singleton instance
export const contrastTool = new ContrastTool() 