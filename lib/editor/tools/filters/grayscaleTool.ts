/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Monitor } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricImage } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type GrayscaleToolState = {
  isApplying: boolean
}

class GrayscaleTool extends BaseFilterTool {
  // Required properties
  id = TOOL_IDS.GRAYSCALE
  name = 'Grayscale'
  icon = Monitor
  cursor = 'default'
  shortcut = 'G'
  
  // Tool state
  private state = createToolState<GrayscaleToolState>({
    isApplying: false
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'grayscale'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return {} // Grayscale has no parameters
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const action = this.getOptionValue('action')
      
      if (action === 'toggle') {
        await this.toggleGrayscale()
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
   * Check if grayscale filter is already applied to the target images
   */
  private hasGrayscale(): boolean {
    const targetImages = this.getTargetImages()
    if (targetImages.length === 0) return false
    
    // Check the first image for grayscale filter
    const firstImage = targetImages[0] as FabricImage
    if (!firstImage.filters || firstImage.filters.length === 0) return false
    
    // Look for Grayscale filter
    return firstImage.filters.some((filter: any) => {
      const filterType = filter.type || filter.constructor.name
      return filterType === 'Grayscale'
    })
  }
  
  private async toggleGrayscale(): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      // Check current state
      const isCurrentlyGrayscale = this.hasGrayscale()
      
      if (isCurrentlyGrayscale) {
        // Remove grayscale - apply with params that indicate removal
        await this.applyFilter({ remove: true })
      } else {
        // Add grayscale - apply normally
        await this.applyFilter({})
      }
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const grayscaleTool = new GrayscaleTool() 