/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Focus } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'

// Define tool state
type BlurToolState = {
  isAdjusting: boolean
  radius: number
}

class BlurTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Focus
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<BlurToolState>({
    isAdjusting: false,
    radius: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'blur'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { radius: this.state.get('radius') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const radius = this.getOptionValue('blur')
      if (typeof radius === 'number' && radius !== this.state.get('radius')) {
        await this.applyBlur(radius)
        this.state.set('radius', radius)
      }
    })
    
    // Apply initial value if any
    const initialRadius = this.getOptionValue('blur')
    if (typeof initialRadius === 'number' && initialRadius !== 0) {
      this.applyBlur(initialRadius).then(() => {
        this.state.set('radius', initialRadius)
      })
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  // Required: Cleanup
  protected cleanupFilterTool(): void {
    // Don't reset the blur - let it persist
    this.state.setState({
      isAdjusting: false,
      radius: this.state.get('radius')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Apply blur filter
   */
  private async applyBlur(radius: number): Promise<void> {
    if (this.state.get('isAdjusting')) return
    
    this.state.set('isAdjusting', true)
    this.state.set('radius', radius)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ radius })
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
}

// Export singleton
export const blurTool = new BlurTool() 