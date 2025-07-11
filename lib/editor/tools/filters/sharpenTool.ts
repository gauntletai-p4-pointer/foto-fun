/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Zap } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseFilterTool } from './BaseFilterTool'
import { createToolState } from '../utils/toolState'
import { useCanvasStore } from '@/store/canvasStore'
import { LayerAwareSelectionManager } from '@/lib/editor/selection/LayerAwareSelectionManager'
import { FilterPipeline } from '@/lib/editor/filters/FilterPipeline'

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
    console.log('[SharpenTool] Setting up sharpen tool')
    
    // Initialize filter pipeline and selection manager
    const canvasStore = useCanvasStore.getState()
    this.selectionManager = canvasStore.selectionManager as LayerAwareSelectionManager
    
    if (!this.selectionManager) {
      console.error('[SharpenTool] Selection manager not found')
      return
    }
    
    this.filterPipeline = new FilterPipeline(canvas, this.selectionManager)
    console.log('[SharpenTool] Filter pipeline created')
    
    // Track original filter states for preview
    this.originalFilterStates = new Map()
    this.isPreviewMode = false
    
    // Subscribe to tool options
    this.subscribeToToolOptions(async () => {
      const strength = this.getOptionValue('sharpen')
      console.log('[SharpenTool] Tool option changed, strength:', strength)
      if (typeof strength === 'number' && strength !== this.state.get('strength')) {
        await this.applySharpen(strength)
        this.state.set('strength', strength)
      }
    })
    
    // Apply initial value if any
    const initialStrength = this.getOptionValue('sharpen')
    console.log('[SharpenTool] Initial strength:', initialStrength)
    if (typeof initialStrength === 'number' && initialStrength !== 0) {
      this.applySharpen(initialStrength).then(() => {
        this.state.set('strength', initialStrength)
      })
    }
    
    // Show selection indicator on tool activation
    this.showSelectionIndicator()
    console.log('[SharpenTool] Setup complete')
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
    console.log('[SharpenTool] applySharpen called with strength:', strength)
    
    if (this.state.get('isApplying')) {
      console.log('[SharpenTool] Already applying, skipping')
      return
    }
    
    this.state.set('isApplying', true)
    this.state.set('strength', strength)
    
    try {
      console.log('[SharpenTool] Calling base class applyFilter')
      // Use the base class applyFilter method
      await this.applyFilter({ strength })
      console.log('[SharpenTool] Sharpen filter applied successfully')
    } catch (error) {
      console.error('[SharpenTool] Error applying sharpen:', error)
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const sharpenTool = new SharpenTool() 