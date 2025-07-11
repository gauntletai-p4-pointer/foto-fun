/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Camera } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricImage } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type SepiaToolState = {
  isApplying: boolean
}

class SepiaTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.SEPIA
  name = 'Sepia'
  icon = Camera
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<SepiaToolState>({
    isApplying: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'sepia'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return {} // Sepia has no parameters
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const action = this.getOptionValue('action')
      
      if (action === 'toggle') {
        await this.toggleSepia()
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
   * Check if sepia filter is already applied to the target images
   */
  private hasSepia(): boolean {
    const targetImages = this.getTargetImages()
    if (targetImages.length === 0) return false
    
    // Check the first image for sepia filter
    const firstImage = targetImages[0] as FabricImage
    if (!firstImage.filters || firstImage.filters.length === 0) return false
    
    // Look for Sepia filter
    return firstImage.filters.some((filter: any) => {
      const filterType = filter.type || filter.constructor.name
      return filterType === 'Sepia'
    })
  }
  
  private async toggleSepia(): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      // Check current state
      const isCurrentlySepia = this.hasSepia()
      
      if (isCurrentlySepia) {
        // Remove sepia - apply with params that indicate removal
        await this.applyFilter({ remove: true })
      } else {
        // Add sepia - apply normally
        await this.applyFilter({})
      }
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const sepiaTool = new SepiaTool() 