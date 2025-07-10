import { Sun } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type SepiaToolState = {
  isApplying: boolean
  isSepia: boolean
}

class SepiaTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.SEPIA
  name = 'Sepia'
  icon = Sun
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<SepiaToolState>({
    isApplying: false,
    isSepia: false
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
    // Don't reset the sepia state - let it persist
    this.state.setState({
      isApplying: false,
      isSepia: this.state.get('isSepia')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  private async toggleSepia(): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    const newState = !this.state.get('isSepia')
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter(this.getDefaultParams())
      this.state.set('isSepia', newState)
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const sepiaTool = new SepiaTool() 