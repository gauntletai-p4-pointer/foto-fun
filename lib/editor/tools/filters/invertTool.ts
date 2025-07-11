/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { RotateCcw } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricImage } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type InvertToolState = {
  isApplying: boolean
}

class InvertTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.INVERT
  name = 'Invert'
  icon = RotateCcw
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<InvertToolState>({
    isApplying: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'invert'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return {} // Invert has no parameters
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const action = this.getOptionValue('action')
      
      if (action === 'toggle') {
        await this.toggleInvert()
        // Reset the action
        useToolOptionsStore.getState().updateOption(this.id, 'action', null)
      }
    })
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  // Required: Cleanup
  protected cleanupFilterTool(): void {
    // Reset applying state
    this.state.setState({
      isApplying: false
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Check if invert filter is already applied to the target images
   */
  private hasInvert(): boolean {
    const targetImages = this.getTargetImages()
    if (targetImages.length === 0) return false
    
    // Check the first image for invert filter
    const firstImage = targetImages[0] as FabricImage
    if (!firstImage.filters || firstImage.filters.length === 0) return false
    
    // Look for Invert filter
    return firstImage.filters.some((filter: any) => {
      const filterType = filter.type || filter.constructor.name
      return filterType === 'Invert'
    })
  }
  
  private async toggleInvert(): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      // Check current state
      const isCurrentlyInverted = this.hasInvert()
      
      if (isCurrentlyInverted) {
        // Remove invert - apply with params that indicate removal
        await this.applyFilter({ remove: true })
      } else {
        // Add invert - apply normally
        await this.applyFilter({})
      }
    } finally {
      this.state.set('isApplying', false)
    }
  }
  
  // Remove duplicate getOptionValue method - use the one from BaseTool
}

// Export singleton
export const invertTool = new InvertTool() 