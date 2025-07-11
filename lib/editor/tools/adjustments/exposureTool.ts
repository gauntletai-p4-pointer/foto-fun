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
   * Convert brightness adjustment to exposure percentage
   */
  private brightnessToExposure(brightnessAdjustment: number): number {
    console.log('[ExposureTool] Converting brightness to exposure:', brightnessAdjustment)
    
    // Brightness adjustment is already in percentage (-100 to 100)
    // We need to reverse the exposure formula
    let exposure: number
    
    if (brightnessAdjustment === 0) {
      exposure = 0
    } else if (brightnessAdjustment > 0) {
      // Positive: brightness = exposure * 0.015
      // So: exposure = brightness / 0.015
      exposure = brightnessAdjustment / 0.015
    } else {
      // Negative: brightness = exposure * 0.01
      // So: exposure = brightness / 0.01
      exposure = brightnessAdjustment / 0.01
    }
    
    console.log('[ExposureTool] Converted to exposure:', exposure)
    return exposure
  }
  
  /**
   * Convert exposure percentage to brightness adjustment
   */
  private exposureToBrightness(exposurePercent: number): number {
    console.log('[ExposureTool] Converting exposure to brightness:', exposurePercent)
    
    let brightness: number
    
    if (exposurePercent === 0) {
      brightness = 0
    } else if (exposurePercent > 0) {
      // Positive exposure brightens more dramatically
      brightness = exposurePercent * 0.015
    } else {
      // Negative exposure darkens less dramatically
      brightness = exposurePercent * 0.01
    }
    
    console.log('[ExposureTool] Converted to brightness:', brightness)
    return brightness
  }
  
  /**
   * Tool setup - opens adjustment dialog
   */
  protected setupFilterTool(canvas: Canvas): void {
    console.log('[ExposureTool] setupFilterTool called')
    
    // Reset dialog shown state to ensure it opens
    this.state.set('dialogShown', false)
    
    // Get current filter value (exposure uses brightness internally)
    const currentValue = this.getCurrentFilterValue()
    console.log('[ExposureTool] Current filter value:', currentValue)
    
    // Convert brightness value back to exposure percentage
    const currentExposure = this.brightnessToExposure(currentValue.adjustment)
    
    // Clamp exposure to reasonable range
    const clampedExposure = Math.max(-100, Math.min(100, currentExposure))
    if (currentExposure !== clampedExposure) {
      console.warn('[ExposureTool] Exposure clamped from', currentExposure, 'to', clampedExposure)
    }
    
    // Update state with current value
    this.state.set('exposure', clampedExposure)
    console.log('[ExposureTool] Base exposure set to:', clampedExposure)
    
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
    
    console.log('[ExposureTool] Dialog opened with slider starting at 0')
  }
  
  /**
   * Apply exposure preview (temporary)
   */
  async previewExposure(exposure: number): Promise<void> {
    console.log('[ExposureTool] previewExposure called with exposure:', exposure)
    
    if (this.state.get('isAdjusting')) {
      console.log('[ExposureTool] Already adjusting, skipping preview')
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base exposure value (what was there when dialog opened)
      const baseExposure = this.state.get('exposure')
      console.log('[ExposureTool] Base exposure:', baseExposure)
      console.log('[ExposureTool] Slider exposure:', exposure)
      
      // Apply the slider value as an increment to the base
      const totalExposure = baseExposure + exposure
      console.log('[ExposureTool] Total exposure:', totalExposure)
      
      // Clamp total exposure
      const clampedExposure = Math.max(-100, Math.min(100, totalExposure))
      if (totalExposure !== clampedExposure) {
        console.warn('[ExposureTool] Total exposure clamped from', totalExposure, 'to', clampedExposure)
      }
      
      // Convert exposure percentage to brightness value
      const brightnessValue = this.exposureToBrightness(clampedExposure)
      console.log('[ExposureTool] Brightness adjustment to apply:', brightnessValue)
      
      // Use the base class preview method with brightness adjustment
      await this.previewFilter({ adjustment: brightnessValue })
      console.log('[ExposureTool] Preview applied successfully')
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
    console.log('[ExposureTool] applyExposure called with exposure:', exposure)
    
    if (this.state.get('isAdjusting')) {
      console.log('[ExposureTool] Already adjusting, skipping apply')
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base exposure value (what was there when dialog opened)
      const baseExposure = this.state.get('exposure')
      console.log('[ExposureTool] Base exposure:', baseExposure)
      console.log('[ExposureTool] Slider exposure:', exposure)
      
      // Apply the slider value as an increment to the base
      const totalExposure = baseExposure + exposure
      console.log('[ExposureTool] Total exposure:', totalExposure)
      
      // Clamp total exposure
      const clampedExposure = Math.max(-100, Math.min(100, totalExposure))
      if (totalExposure !== clampedExposure) {
        console.warn('[ExposureTool] Total exposure clamped from', totalExposure, 'to', clampedExposure)
      }
      
      // Convert exposure percentage to brightness value
      const brightnessValue = this.exposureToBrightness(clampedExposure)
      console.log('[ExposureTool] Brightness adjustment to apply:', brightnessValue)
      
      // Use the base class apply method with brightness adjustment
      await this.applyFilter({ adjustment: brightnessValue })
      console.log('[ExposureTool] Exposure applied successfully')
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
    console.log('[ExposureTool] resetExposure called')
    
    // Get the base exposure value (what was there when dialog opened)
    const baseExposure = this.state.get('exposure')
    console.log('[ExposureTool] Resetting to base exposure:', baseExposure)
    
    // Convert back to brightness value
    const brightnessValue = this.exposureToBrightness(baseExposure)
    console.log('[ExposureTool] Brightness value for reset:', brightnessValue)
    
    // Reset to the base exposure
    this.previewFilter({ adjustment: brightnessValue }).catch((error: any) => {
      console.error('[ExposureTool] Reset failed:', error)
    })
  }
  
  /**
   * Tool cleanup
   */
  protected cleanupFilterTool(): void {
    console.log('[ExposureTool] cleanupFilterTool called')
    
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
    
    console.log('[ExposureTool] Cleanup complete')
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  // Override onActivate to log
  onActivate(canvas: Canvas): void {
    console.log('[ExposureTool] Tool activated')
    super.onActivate(canvas)
  }
  
  // Override onDeactivate to log
  onDeactivate(canvas: Canvas): void {
    console.log('[ExposureTool] Tool deactivated')
    
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