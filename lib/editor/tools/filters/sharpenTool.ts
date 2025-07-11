/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Zap } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'

// Define tool state
type SharpenToolState = {
  isApplying: boolean
  strength: number
}

class SharpenTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.SHARPEN
  name = 'Sharpen'
  icon = Zap
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<SharpenToolState>({
    isApplying: false,
    strength: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'sharpen'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { strength: this.state.get('strength') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const strength = this.getOptionValue('sharpen')
      if (typeof strength === 'number' && strength !== this.state.get('strength')) {
        await this.applySharpen(strength)
        this.state.set('strength', strength)
      }
    })
    
    // Apply initial value if any
    const initialStrength = this.getOptionValue('sharpen')
    if (typeof initialStrength === 'number' && initialStrength !== 0) {
      this.applySharpen(initialStrength).then(() => {
        this.state.set('strength', initialStrength)
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
      strength: this.state.get('strength')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Apply sharpen filter
   */
  private async applySharpen(strength: number): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    this.state.set('strength', strength)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ strength })
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const sharpenTool = new SharpenTool() 