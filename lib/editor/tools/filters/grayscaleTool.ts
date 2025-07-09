import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { FabricImage, filters } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type GrayscaleToolState = {
  isApplying: boolean
  isGrayscale: boolean
}

class GrayscaleTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.GRAYSCALE
  name = 'Grayscale'
  icon = Palette
  cursor = 'default'
  shortcut = 'G'
  
  // Tool state
  private state = createToolState<GrayscaleToolState>({
    isApplying: false,
    isGrayscale: false
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const action = this.getOptionValue('action')
      
      if (action === 'toggle') {
        this.toggleGrayscale(canvas)
        // Reset the action
        useToolOptionsStore.getState().updateOption(this.id, 'action', null)
      }
    })
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the grayscale state - let it persist
    this.state.setState({
      isApplying: false,
      isGrayscale: this.state.get('isGrayscale')
    })
  }
  
  private toggleGrayscale(canvas: Canvas): void {
    this.executeWithGuard('isApplying', async () => {
      const newState = !this.state.get('isGrayscale')
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('No images found to apply grayscale')
        return
      }
      
      // Apply to all image objects
      await this.applyImageFilters(
        images,
        'Grayscale',
        () => newState ? new filters.Grayscale() : null,
        newState ? 'Apply grayscale' : 'Remove grayscale'
      )
      
      this.state.set('isGrayscale', newState)
    })
  }
  
  // Remove duplicate getOptionValue method - use the one from BaseTool
}

// Export singleton
export const grayscaleTool = new GrayscaleTool() 