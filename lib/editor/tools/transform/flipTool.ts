import { FlipHorizontal2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type FlipToolState = {
  isFlipping: boolean
  horizontalFlipped: boolean
  verticalFlipped: boolean
}

class FlipTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.FLIP
  name = 'Flip'
  icon = FlipHorizontal2
  cursor = 'default'
  shortcut = 'F'
  
  // Tool state
  private state = createToolState<FlipToolState>({
    isFlipping: false,
    horizontalFlipped: false,
    verticalFlipped: false
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const flipAction = this.getOptionValue('flipAction')
      
      if (flipAction === 'horizontal') {
        this.applyFlip(canvas, 'horizontal')
        // Reset the action
        useToolOptionsStore.getState().updateOption(this.id, 'flipAction', null)
      } else if (flipAction === 'vertical') {
        this.applyFlip(canvas, 'vertical')
        // Reset the action
        useToolOptionsStore.getState().updateOption(this.id, 'flipAction', null)
      }
    })
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the flip state - let it persist
    // Reset only the internal state
    this.state.setState({
      isFlipping: false,
      horizontalFlipped: this.state.get('horizontalFlipped'),
      verticalFlipped: this.state.get('verticalFlipped')
    })
  }
  
  private applyFlip(canvas: Canvas, direction: 'horizontal' | 'vertical'): void {
    if (this.state.get('isFlipping')) return
    
    this.state.set('isFlipping', true)
    
    try {
      // Check for active selection first
      const activeObjects = canvas.getActiveObjects()
      const hasSelection = activeObjects.length > 0
      
      // Determine which objects to flip
      const objectsToFlip = hasSelection ? activeObjects : canvas.getObjects()
      
      if (objectsToFlip.length === 0) return
      
      console.log(`[FlipTool] Flipping ${objectsToFlip.length} object(s) - ${hasSelection ? 'selected only' : 'all objects'}`)
      
      // Apply flip to target objects
      objectsToFlip.forEach((obj: FabricObject) => {
        const oldFlipX = obj.flipX || false
        const oldFlipY = obj.flipY || false
        
        // Calculate new flip values
        const newFlipX = direction === 'horizontal' ? !oldFlipX : oldFlipX
        const newFlipY = direction === 'vertical' ? !oldFlipY : oldFlipY
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          obj,
          { flipX: newFlipX, flipY: newFlipY },
          `Flip ${direction}`
        )
        
        // Execute the command (which will apply the changes and setCoords)
        this.executeCommand(command)
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isFlipping', false)
    }
  }
}

// Export singleton
export const flipTool = new FlipTool() 