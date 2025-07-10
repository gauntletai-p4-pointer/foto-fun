/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Sliders } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseFilterTool } from '../filters/BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useCanvasStore } from '@/store/canvasStore'
import type { Canvas } from 'fabric'

/**
 * Exposure Tool State
 */
type ExposureState = {
  exposure: number
  isAdjusting: boolean
  dialogShown: boolean
}

/**
 * Exposure Tool - Adjust image exposure
 * Now uses modal dialog with preview functionality
 */
class ExposureTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.EXPOSURE
  name = 'Exposure'
  icon = Sliders
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<ExposureState>({
    exposure: 0,
    isAdjusting: false,
    dialogShown: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'brightness' // Exposure uses brightness filter with different values
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
    
    // Get current filter value (exposure uses brightness internally)
    const currentValue = this.getCurrentFilterValue()
    
    // Convert brightness value back to exposure percentage
    const currentExposure = currentValue.adjustment > 0 
      ? currentValue.adjustment / 0.015 * 100
      : currentValue.adjustment / 0.01 * 100
    
    // Update state with current value
    this.state.set('exposure', currentExposure)
    
    // Find the exposure tool button element
    const exposureButton = document.querySelector(`button[data-tool-id="${this.id}"]`) as HTMLElement
    
    // Open the adjustment dialog
    const canvasStore = useCanvasStore.getState()
    
    // Always show dialog when tool is activated
    this.state.set('dialogShown', true)
    
    canvasStore.setActiveAdjustmentTool({
      toolId: this.id,
      toolName: this.name,
      currentValue: 0,  // Always start slider at 0 for incremental adjustments
      anchorElement: exposureButton
    })
  }
  
  /**
   * Apply exposure preview (temporary)
   */
  async previewExposure(exposure: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base exposure value (what was there when dialog opened)
      const baseExposure = this.state.get('exposure')
      // Apply the slider value as an increment to the base
      const totalExposure = baseExposure + exposure
      
      // Convert exposure percentage to brightness value
      const brightnessValue = totalExposure > 0 
        ? totalExposure * 0.015 / 100  // Positive exposure brightens more dramatically
        : totalExposure * 0.01 / 100   // Negative exposure darkens less dramatically
      
      // Use the base class preview method with brightness adjustment
      await this.applyFilterPreview({ adjustment: brightnessValue * 100 })
    } catch (error) {
      console.error('[ExposureTool] Preview failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Apply exposure adjustment (permanent)
   */
  async applyExposure(exposure: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base exposure value (what was there when dialog opened)
      const baseExposure = this.state.get('exposure')
      // Apply the slider value as an increment to the base
      const totalExposure = baseExposure + exposure
      
      // Convert exposure percentage to brightness value
      const brightnessValue = totalExposure > 0 
        ? totalExposure * 0.015 / 100  // Positive exposure brightens more dramatically
        : totalExposure * 0.01 / 100   // Negative exposure darkens less dramatically
      
      // Use the base class apply method with brightness adjustment
      await this.applyFilter({ adjustment: brightnessValue * 100 })
    } catch (error) {
      console.error('[ExposureTool] Apply failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Reset exposure to default
   */
  resetExposure(): void {
    // Get the base exposure value (what was there when dialog opened)
    const baseExposure = this.state.get('exposure')
    
    // Convert back to brightness value
    const brightnessValue = baseExposure > 0 
      ? baseExposure * 0.015 / 100
      : baseExposure * 0.01 / 100
    
    // Reset to the base exposure
    this.applyFilterPreview({ adjustment: brightnessValue * 100 }).catch(error => {
      console.error('[ExposureTool] Reset failed:', error)
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
      exposure: 0,
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
export const exposureTool = new ExposureTool() 