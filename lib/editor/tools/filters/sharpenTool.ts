/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Focus } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'

// Define tool state
type SharpenToolState = {
  isApplying: boolean
  lastSharpen: number
}

class SharpenTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.SHARPEN
  name = 'Sharpen'
  icon = Focus
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<SharpenToolState>({
    isApplying: false,
    lastSharpen: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'sharpen'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { strength: this.state.get('lastSharpen') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const sharpen = this.getOptionValue('sharpen')
      if (typeof sharpen === 'number' && sharpen !== this.state.get('lastSharpen')) {
        await this.applySharpen(sharpen)
        this.state.set('lastSharpen', sharpen)
      }
    })
    
    // Apply initial value if any
    const initialSharpen = this.getOptionValue('sharpen')
    if (typeof initialSharpen === 'number' && initialSharpen !== 0) {
      this.applySharpen(initialSharpen).then(() => {
        this.state.set('lastSharpen', initialSharpen)
      })
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  // Required: Cleanup
  protected cleanupFilterTool(): void {
    // Don't reset the sharpen - let it persist
    this.state.setState({
      isApplying: false,
      lastSharpen: this.state.get('lastSharpen')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Apply sharpen filter
   */
  private async applySharpen(sharpen: number): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    this.state.set('lastSharpen', sharpen)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ sharpen })
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const sharpenTool = new SharpenTool() 