/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { RotateCcw } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type InvertToolState = {
  isApplying: boolean
  isInverted: boolean
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
    isApplying: false,
    isInverted: false
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
    // Don't reset the invert state - let it persist
    this.state.setState({
      isApplying: false,
      isInverted: this.state.get('isInverted')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  private async toggleInvert(): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    const newState = !this.state.get('isInverted')
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter(this.getDefaultParams())
      this.state.set('isInverted', newState)
    } finally {
      this.state.set('isApplying', false)
    }
  }
  
  // Remove duplicate getOptionValue method - use the one from BaseTool
}

// Export singleton
export const invertTool = new InvertTool() 