/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Thermometer } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseFilterTool } from '../filters/BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useCanvasStore } from '@/store/canvasStore'
import type { Canvas } from 'fabric'

/**
 * Color Temperature Tool State
 */
type ColorTemperatureState = {
  temperature: number
  isAdjusting: boolean
  dialogShown: boolean
}

/**
 * Color Temperature Tool - Adjust warm/cool balance
 * Now uses modal dialog with preview functionality
 */
class ColorTemperatureTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.COLOR_TEMPERATURE
  name = 'Color Temperature'
  icon = Thermometer
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<ColorTemperatureState>({
    temperature: 0,
    isAdjusting: false,
    dialogShown: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'colortemperature' // Color temperature uses custom filter with selection support
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { temperature: 0 }
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
    this.state.set('temperature', currentValue.temperature || 0)
    
    // Find the color temperature tool button element
    const colorTempButton = document.querySelector(`button[data-tool-id="${this.id}"]`) as HTMLElement
    
    // Open the adjustment dialog
    const canvasStore = useCanvasStore.getState()
    
    // Always show dialog when tool is activated
    this.state.set('dialogShown', true)
    
    canvasStore.setActiveAdjustmentTool({
      toolId: this.id,
      toolName: this.name,
      currentValue: 0,  // Always start slider at 0 for incremental adjustments
      anchorElement: colorTempButton
    })
  }
  
  /**
   * Apply color temperature preview (temporary)
   */
  async previewColorTemperature(temperature: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base temperature value (what was there when dialog opened)
      const baseTemperature = this.state.get('temperature')
      // Apply the slider value as an increment to the base
      const totalTemperature = baseTemperature + temperature
      
      // Use the base class preview method
      await this.applyFilterPreview({ temperature: totalTemperature })
    } catch (error) {
      console.error('[ColorTemperatureTool] Preview failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Apply color temperature adjustment (permanent)
   */
  async applyColorTemperature(temperature: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base temperature value (what was there when dialog opened)
      const baseTemperature = this.state.get('temperature')
      // Apply the slider value as an increment to the base
      const totalTemperature = baseTemperature + temperature
      
      // Use the base class apply method
      await this.applyFilter({ temperature: totalTemperature })
    } catch (error) {
      console.error('[ColorTemperatureTool] Apply failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Reset color temperature to default
   */
  resetColorTemperature(): void {
    // Get the base temperature value (what was there when dialog opened)
    const baseTemperature = this.state.get('temperature')
    
    // Reset to the base temperature (not 0)
    this.applyFilterPreview({ temperature: baseTemperature }).catch(error => {
      console.error('[ColorTemperatureTool] Reset failed:', error)
    })
  }
  
  /**
   * Override to provide custom filter creation
   */
  protected async createFilter(filterParams: any): Promise<any> {
    const { filters } = await import('fabric')
    const temperature = filterParams.temperature || 0
    
    // Calculate RGB adjustments based on temperature
    const tempAdjust = temperature / 100
    
    // Create a color matrix that shifts colors
    // Warmer: increase red, decrease blue
    // Cooler: decrease red, increase blue
    const matrix = [
      1 + tempAdjust * 0.2, 0, 0, 0, 0,    // Red channel
      0, 1, 0, 0, 0,                       // Green channel (unchanged)
      0, 0, 1 - tempAdjust * 0.2, 0, 0,    // Blue channel
      0, 0, 0, 1, 0                        // Alpha channel
    ]
    
    return new filters.ColorMatrix({ matrix })
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
      temperature: 0,
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
export const colorTemperatureTool = new ColorTemperatureTool() 