/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Focus } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'

// Define tool state
type BlurToolState = {
  isAdjusting: boolean
  blur: number
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
    blur: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'blur'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { blur: this.state.get('blur') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const blur = this.getOptionValue('blur')
      if (typeof blur === 'number' && blur !== this.state.get('blur')) {
        await this.applyBlur(blur)
        this.state.set('blur', blur)
      }
    })
    
    // Apply initial value if any
    const initialBlur = this.getOptionValue('blur')
    if (typeof initialBlur === 'number' && initialBlur !== 0) {
      this.applyBlur(initialBlur).then(() => {
        this.state.set('blur', initialBlur)
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
      blur: this.state.get('blur')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  /**
   * Apply blur filter
   */
  private async applyBlur(blur: number): Promise<void> {
    if (this.state.get('isAdjusting')) return
    
    this.state.set('isAdjusting', true)
    this.state.set('blur', blur)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ blur })
    } finally {
      this.state.set('isAdjusting', false)
    }
  }
}

// Export singleton
export const blurTool = new BlurTool() 