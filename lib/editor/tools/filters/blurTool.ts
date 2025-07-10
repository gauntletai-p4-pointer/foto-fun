import { Aperture } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type BlurToolState = {
  isApplying: boolean
  lastBlur: number
}

class BlurTool extends BaseFilterTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Aperture
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<BlurToolState>({
    isApplying: false,
    lastBlur: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'blur'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { radius: this.state.get('lastBlur') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const blur = this.getOptionValue('blur')
      if (typeof blur === 'number' && blur !== this.state.get('lastBlur')) {
        await this.applyBlur(blur)
        this.state.set('lastBlur', blur)
      }
    })
    
    // Apply initial value if any
    const initialBlur = this.getOptionValue('blur')
    if (typeof initialBlur === 'number' && initialBlur !== 0) {
      this.applyBlur(initialBlur).then(() => {
        this.state.set('lastBlur', initialBlur)
      })
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  // Required: Cleanup
  protected cleanupFilterTool(): void {
    // Don't reset the blur - let it persist
    this.state.setState({
      isApplying: false,
      lastBlur: this.state.get('lastBlur')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  private async applyBlur(blurValue: number): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ radius: blurValue })
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
export const blurTool = new BlurTool() 