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
      const newState = !this.state.get('isInverted')
      
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('[InvertTool] No images found to apply invert')
        return
      }
      
      // Apply to all image objects
      await this.applyImageFilters(
        images,
        'Invert',
        () => newState ? new filters.Invert() : null,
        newState ? 'Apply invert' : 'Remove invert'
      )
      
      this.state.set('isInverted', newState)
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