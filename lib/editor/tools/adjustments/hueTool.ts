/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Paintbrush } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseFilterTool } from '../filters/BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useCanvasStore } from '@/store/canvasStore'
import type { Canvas } from 'fabric'

/**
 * Hue Tool State
 */
type HueState = {
  rotation: number
  isAdjusting: boolean
  dialogShown: boolean
}

/**
 * Hue Tool - Rotate image colors on the color wheel
 * Now uses modal dialog with preview functionality
 */
class HueTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.HUE
  name = 'Hue'
  icon = Paintbrush
  cursor = 'default'
  shortcut = undefined // No default shortcut
  
  // Tool state
  private state = createToolState<HueState>({
    rotation: 0,
    isAdjusting: false,
    dialogShown: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'hue'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { rotation: 0 }
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
    this.state.set('rotation', currentValue.rotation)
    
    // Find the hue tool button element
    const hueButton = document.querySelector(`button[data-tool-id="${this.id}"]`) as HTMLElement
    
    // Open the adjustment dialog
    const canvasStore = useCanvasStore.getState()
    
    // Always show dialog when tool is activated
    this.state.set('dialogShown', true)
    
    canvasStore.setActiveAdjustmentTool({
      toolId: this.id,
      toolName: this.name,
      currentValue: 0,  // Always start slider at 0 for incremental adjustments
      anchorElement: hueButton
    })
  }
  
  /**
   * Apply hue preview (temporary)
   */
  async previewHue(rotation: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base rotation value (what was there when dialog opened)
      const baseRotation = this.state.get('rotation')
      // Apply the slider value as an increment to the base
      const totalRotation = baseRotation + rotation
      
      // Use the base class preview method
      await this.applyFilterPreview({ rotation: totalRotation })
    } catch (error) {
      console.error('[HueTool] Preview failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Apply hue adjustment (permanent)
   */
  async applyHue(rotation: number): Promise<void> {
    if (this.state.get('isAdjusting')) {
      return
    }
    
    this.state.set('isAdjusting', true)
    
    try {
      // Get the base rotation value (what was there when dialog opened)
      const baseRotation = this.state.get('rotation')
      // Apply the slider value as an increment to the base
      const totalRotation = baseRotation + rotation
      
      // Use the base class apply method
      await this.applyFilter({ rotation: totalRotation })
    } catch (error) {
      console.error('[HueTool] Apply failed:', error)
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
  
  /**
   * Reset hue to default
   */
  resetHue(): void {
    // Get the base rotation value (what was there when dialog opened)
    const baseRotation = this.state.get('rotation')
    
    // Reset to the base rotation (not 0)
    this.applyFilterPreview({ rotation: baseRotation }).catch(error => {
      console.error('[HueTool] Reset failed:', error)
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
      rotation: 0,
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
export const hueTool = new HueTool() 