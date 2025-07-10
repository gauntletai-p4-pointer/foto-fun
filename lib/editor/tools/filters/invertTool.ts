import { BaseTool } from '../base/BaseTool'
import { TOOL_IDS } from '@/constants'
import { Contrast } from 'lucide-react'
import { createToolState } from '../utils/toolState'
import { filters } from 'fabric'
import type { Canvas } from 'fabric'

// Define tool state
type InvertToolState = {
  isApplying: boolean
  isInverted: boolean
}

class InvertTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.INVERT
  name = 'Invert'
  icon = Contrast
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<InvertToolState>({
    isApplying: false,
    isInverted: false
  })
  
  // Required: Setup tool
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setupTool(canvas: Canvas): void {
    // Subscribe to action changes
    this.subscribeToToolOptions(() => {
      const action = this.getOptionValue<string>('action')
      
      if (action === 'toggle') {
        this.toggleInvert()
        // Reset the action
        this.updateOptionSafely('action', null)
      }
    })
  }
  
  // Required: Cleanup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected cleanup(canvas: Canvas): void {
    // Don't reset the invert state - let it persist
    this.state.setState({
      isApplying: false,
      isInverted: this.state.get('isInverted')
    })
  }
  
  private toggleInvert(): void {
    if (!this.canvas) {
      console.error('[InvertTool] No canvas available!')
      return
    }
    
    this.executeWithGuard('isApplying', async () => {
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('[InvertTool] No images found to apply invert')
        return
      }
      
      // Check if ANY of the target images already have invert applied
      // This ensures consistent behavior across multiple selections
      const hasInvertApplied = images.some(img => {
        return img.filters?.some((f: unknown) => f instanceof filters.Invert) || false
      })
      
      // If any image has invert, remove from all. Otherwise, add to all.
      const shouldApplyInvert = !hasInvertApplied
      
      console.log(`[InvertTool] Checking invert state: hasInvert=${hasInvertApplied}, willApply=${shouldApplyInvert}`)
      
      // Apply to all image objects
      await this.applyImageFilters(
        images,
        'Invert',
        () => shouldApplyInvert ? new filters.Invert() : null,
        shouldApplyInvert ? 'Apply invert' : 'Remove invert'
      )
      
      // Update state to reflect the action taken (for UI purposes only)
      this.state.set('isInverted', shouldApplyInvert)
    })
  }
  
  // Required: Activation
  onActivate(canvas: Canvas): void {
    // Call parent implementation which sets up the tool
    super.onActivate(canvas)
  }
  
  // Remove duplicate getOptionValue method - use the one from BaseTool
}

// Export singleton
export const invertTool = new InvertTool() 