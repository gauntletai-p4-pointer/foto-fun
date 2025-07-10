import { BaseTool } from '../base/BaseTool'
import { TOOL_IDS } from '@/constants'
import { Palette } from 'lucide-react'
import { createToolState } from '../utils/toolState'
import { filters } from 'fabric'
import type { Canvas } from 'fabric'

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
  
  // Required: Setup tool
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected setupTool(canvas: Canvas): void {
    // Subscribe to action changes
    this.subscribeToToolOptions(() => {
      const action = this.getOptionValue<string>('action')
      
      if (action === 'toggle') {
        this.toggleGrayscale()
        // Reset the action
        this.updateOptionSafely('action', null)
      }
    })
  }
  
  // Required: Cleanup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected cleanup(canvas: Canvas): void {
    // Don't reset the grayscale state - let it persist
    this.state.setState({
      isApplying: false,
      isGrayscale: this.state.get('isGrayscale')
    })
  }
  
  // Required: Activation
  onActivate(canvas: Canvas): void {
    // Call parent implementation which sets up the tool
    super.onActivate(canvas)
  }
  
  private toggleGrayscale(): void {
    if (!this.canvas) {
      console.error('[GrayscaleTool] No canvas available!')
      return
    }
    
    this.executeWithGuard('isApplying', async () => {
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('[GrayscaleTool] No images found to apply grayscale')
        return
      }
      
      // Check if ANY of the target images already have grayscale applied
      const hasGrayscaleApplied = images.some(img => {
        return img.filters?.some((f: unknown) => f instanceof filters.Grayscale) || false
      })
      
      // If any image has grayscale, remove from all. Otherwise, add to all.
      const shouldApplyGrayscale = !hasGrayscaleApplied
      
      console.log(`[GrayscaleTool] Checking grayscale state: hasGrayscale=${hasGrayscaleApplied}, willApply=${shouldApplyGrayscale}`)
      
      // Apply to all image objects
      await this.applyImageFilters(
        images,
        'Grayscale',
        () => shouldApplyGrayscale ? new filters.Grayscale() : null,
        shouldApplyGrayscale ? 'Apply grayscale' : 'Remove grayscale'
      )
      
      // Update state to reflect the action taken (for UI purposes only)
      this.state.set('isGrayscale', shouldApplyGrayscale)
    })
  }
  
  // Remove duplicate getOptionValue method - use the one from BaseTool
}

// Export singleton
export const grayscaleTool = new GrayscaleTool() 