import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type GrayscaleToolState = {
  isApplying: boolean
  isGrayscale: boolean
}

class GrayscaleTool extends BaseFilterTool {
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
    // Don't reset the grayscale state - let it persist
    this.state.setState({
      isApplying: false,
      isGrayscale: this.state.get('isGrayscale')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  private async toggleGrayscale(): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    const newState = !this.state.get('isGrayscale')
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter(this.getDefaultParams())
      
      this.state.set('isGrayscale', newState)
    } finally {
      this.state.set('isApplying', false)
    }
  }
  
  private getOptionValue(optionId: string): unknown {
    const toolOptions = useToolOptionsStore.getState().getToolOptions(this.id)
    const option = toolOptions?.find(opt => opt.id === optionId)
    return option?.value
  }
}

// Export singleton
export const grayscaleTool = new GrayscaleTool() 