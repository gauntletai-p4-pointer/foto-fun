import { Camera } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'

// Define tool state
type SepiaToolState = {
  isApplying: boolean
  lastIntensity: number
}

class SepiaTool extends BaseFilterTool {
  // Required properties
  id = TOOL_IDS.SEPIA
  name = 'Sepia'
  icon = Camera
  cursor = 'default'
  shortcut = 'P'
  
  // Tool state
  private state = createToolState<SepiaToolState>({
    isApplying: false,
    lastIntensity: 0
  })
  
  // Required: Get filter name
  protected getFilterName(): string {
    return 'sepia'
  }
  
  // Required: Get default params
  protected getDefaultParams(): any {
    return { intensity: this.state.get('lastIntensity') }
  }
  
  // Required: Setup
  protected setupFilterTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const intensity = this.getOptionValue('intensity')
      if (typeof intensity === 'number' && intensity !== this.state.get('lastIntensity')) {
        await this.applySepia(intensity)
        this.state.set('lastIntensity', intensity)
      }
    })
    
    // Apply initial value if any
    const initialIntensity = this.getOptionValue('intensity')
    if (typeof initialIntensity === 'number' && initialIntensity !== 0) {
      this.applySepia(initialIntensity).then(() => {
        this.state.set('lastIntensity', initialIntensity)
      })
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
  }
  
  // Required: Cleanup
  protected cleanupFilterTool(): void {
    // Don't reset the sepia - let it persist
    this.state.setState({
      isApplying: false,
      lastIntensity: this.state.get('lastIntensity')
    })
  }
  
  // Required: Base cleanup (from BaseTool)
  protected cleanup(): void {
    this.cleanupTool()
  }
  
  private async applySepia(intensityValue: number): Promise<void> {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      // Use the base class applyFilter method
      await this.applyFilter({ intensity: intensityValue })
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
export const sepiaTool = new SepiaTool() 