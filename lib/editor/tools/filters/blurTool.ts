import { Brush } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { ModifyCommand } from '@/lib/editor/commands/canvas/ModifyCommand'
import * as fabric from 'fabric'

// Define tool state
type BlurToolState = {
  isApplying: boolean
  lastBlur: number
}

class BlurTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.BLUR
  name = 'Blur'
  icon = Brush
  cursor = 'default'
  shortcut = undefined // Access via filters menu
  
  // Tool state
  private state = createToolState<BlurToolState>({
    isApplying: false,
    lastBlur: 0
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const blur = this.getOptionValue('blur')
      if (typeof blur === 'number' && blur !== this.state.get('lastBlur')) {
        this.applyBlur(canvas, blur)
        this.state.set('lastBlur', blur)
      }
    })
    
    // Apply initial value if any
    const initialBlur = this.getOptionValue('blur')
    if (typeof initialBlur === 'number' && initialBlur !== 0) {
      this.applyBlur(canvas, initialBlur)
      this.state.set('lastBlur', initialBlur)
    }
  }
  
  // Required: Cleanup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected cleanup(canvas: Canvas): void {
    // Don't reset the blur - let it persist
    this.state.setState({
      isApplying: false,
      lastBlur: this.state.get('lastBlur')
    })
  }
  
  private applyBlur(canvas: Canvas, blurValue: number): void {
    if (this.state.get('isApplying')) return
    
    this.state.set('isApplying', true)
    
    try {
      const images = this.getTargetImages()
      
      if (images.length === 0) {
        console.warn('No images found to apply blur')
        return
      }
      
      // Apply to all image objects
      images.forEach((img) => {
        // Calculate new filters array
        const existingFilters = img.filters?.filter(
          (f: unknown) => !(f instanceof fabric.filters.Blur)
        ) || []
        
        let newFilters: typeof img.filters
        if (blurValue > 0) {
          const blurFilter = new fabric.filters.Blur({
            blur: blurValue / 100 // Convert percentage to 0-1 range
          })
          newFilters = [...existingFilters, blurFilter] as typeof img.filters
        } else {
          newFilters = existingFilters as typeof img.filters
        }
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          img,
          { filters: newFilters },
          `Apply blur: ${blurValue}%`
        )
        
        // Execute the command (which will apply the changes and handle applyFilters)
        this.executeCommand(command)
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isApplying', false)
    }
  }
}

// Export singleton
export const blurTool = new BlurTool() 