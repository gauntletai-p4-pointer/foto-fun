import { Contrast } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { FabricImage, filters } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type InvertToolState = {
  isApplying: boolean
  isInverted: boolean
}

class InvertTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.INVERT
  name = 'Invert'
  icon = Contrast
  cursor = 'default'
  shortcut = 'I'
  
  // Tool state
  private state = createToolState<InvertToolState>({
    isApplying: false,
    isInverted: false
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const action = this.getOptionValue('action')
      
      if (action === 'toggle') {
        this.toggleInvert(canvas)
        // Reset the action
        useToolOptionsStore.getState().updateOption(this.id, 'action', null)
      }
    })
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the invert state - let it persist
    this.state.setState({
      isApplying: false,
      isInverted: this.state.get('isInverted')
    })
  }
  
  private toggleInvert(canvas: Canvas): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    const newState = !this.state.get('isInverted')
    
    try {
      const objects = canvas.getObjects()
      
      // Apply to all image objects
      objects.forEach((obj) => {
        if (obj instanceof FabricImage) {
          // Remove existing invert filter
          const existingFilters = obj.filters?.filter(
            (f: unknown) => !(f instanceof filters.Invert)
          ) || []
          
          // Add invert filter if enabling
          if (newState) {
            const invertFilter = new filters.Invert()
            obj.filters = [...existingFilters, invertFilter] as typeof obj.filters
          } else {
            obj.filters = existingFilters as typeof obj.filters
          }
          
          // Apply filters and re-render
          obj.applyFilters()
          
          // Record command for undo/redo
          const command = new ModifyCommand(
            canvas,
            obj,
            { filters: obj.filters },
            newState ? 'Apply invert' : 'Remove invert'
          )
          this.executeCommand(command)
        }
      })
      
      canvas.renderAll()
      this.state.set('isInverted', newState)
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
export const invertTool = new InvertTool() 