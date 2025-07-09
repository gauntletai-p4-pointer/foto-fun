import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { FabricImage, filters } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

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
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const action = this.getOptionValue('action')
      
      if (action === 'toggle') {
        this.toggleInvert(canvas)
        // Reset the action
        useToolOptionsStore.getState().updateOption(this.id, 'action', null)
      }
    })
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the invert state - let it persist
    this.state.setState({
      isApplying: false,
      isInverted: this.state.get('isInverted')
    })
  }
  
  private toggleInvert(canvas: Canvas): void {
    this.executeWithGuard('isApplying', async () => {
      const newState = !this.state.get('isInverted')
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('No images found to invert')
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
  
  // Remove duplicate getOptionValue method - use the one from BaseTool
}

// Export singleton
export const invertTool = new InvertTool() 