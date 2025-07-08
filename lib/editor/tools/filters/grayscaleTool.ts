import { Palette } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { FabricImage, filters } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type GrayscaleToolState = {
  isApplying: boolean
  isGrayscale: boolean
}

class GrayscaleTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.GRAYSCALE
  name = 'Grayscale'
  icon = Palette
  cursor = 'default'
  shortcut = 'G'
  
  // Tool state
  private state = createToolState<GrayscaleToolState>({
    isApplying: false,
    isGrayscale: false
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const action = this.getOptionValue('action')
      
      if (action === 'toggle') {
        this.toggleGrayscale(canvas)
        // Reset the action
        useToolOptionsStore.getState().updateOption(this.id, 'action', null)
      }
    })
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the grayscale state - let it persist
    this.state.setState({
      isApplying: false,
      isGrayscale: this.state.get('isGrayscale')
    })
  }
  
  private toggleGrayscale(canvas: Canvas): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    const newState = !this.state.get('isGrayscale')
    
    try {
      const objects = canvas.getObjects()
      
      // Apply to all image objects
      objects.forEach((obj) => {
        if (obj instanceof FabricImage) {
          // Remove existing grayscale filter
          const existingFilters = obj.filters?.filter(
            (f: unknown) => !(f instanceof filters.Grayscale)
          ) || []
          
          // Add grayscale filter if enabling
          if (newState) {
            const grayscaleFilter = new filters.Grayscale()
            obj.filters = [...existingFilters, grayscaleFilter] as typeof obj.filters
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
            newState ? 'Apply grayscale' : 'Remove grayscale'
          )
          this.executeCommand(command)
        }
      })
      
      canvas.renderAll()
      this.state.set('isGrayscale', newState)
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
export const grayscaleTool = new GrayscaleTool() 