import { RotateCw } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type RotateToolState = {
  isRotating: boolean
  lastAngle: number
}

class RotateTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.ROTATE
  name = 'Rotate'
  icon = RotateCw
  cursor = 'default'
  shortcut = 'R'
  
  // Tool state
  private state = createToolState<RotateToolState>({
    isRotating: false,
    lastAngle: 0
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      // Check for quick rotate button press
      const quickRotate = this.getOptionValue('quickRotate')
      if (typeof quickRotate === 'number') {
        // Quick rotate values are relative rotations to apply
        // Apply the rotation relative to current state
        const currentAngle = this.state.get('lastAngle')
        const newAngle = currentAngle + quickRotate
        
        // Apply the rotation
        this.applyRotation(canvas, newAngle)
        this.state.set('lastAngle', newAngle)
        
        // Update the angle slider to match the new total rotation
        this.updateOptionSafely('angle', newAngle)
        // Reset the button group value
        this.updateOptionSafely('quickRotate', null)
        return
      }
      
      // Otherwise check the angle slider
      const angle = this.getOptionValue('angle')
      if (typeof angle === 'number' && angle !== this.state.get('lastAngle')) {
        this.applyRotation(canvas, angle)
        this.state.set('lastAngle', angle)
      }
    })
    
    // Apply initial value if any
    const initialAngle = this.getOptionValue('angle')
    if (typeof initialAngle === 'number' && initialAngle !== 0) {
      this.applyRotation(canvas, initialAngle)
      this.state.set('lastAngle', initialAngle)
    }
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the rotation - let it persist
    // Reset only the internal state
    this.state.setState({
      isRotating: false,
      lastAngle: this.state.get('lastAngle')
    })
  }
  
  private applyRotation(canvas: Canvas, angle: number): void {
    if (this.state.get('isRotating')) return
    
    this.state.set('isRotating', true)
    
    try {
      // Use getTargetObjects which respects selection snapshot
      const objectsToRotate = this.getTargetObjects()
      
      if (objectsToRotate.length === 0) return
      
      // Calculate the angle difference from the last rotation
      const angleDiff = angle - this.state.get('lastAngle')
      
      // Apply rotation to target objects
      objectsToRotate.forEach((obj: FabricObject) => {
        // Store the old state for undo
        const oldAngle = obj.angle || 0
        
        // Calculate new angle
        const newAngle = oldAngle + angleDiff
        
        // For in-place rotation, we only need to update the angle
        // The object's position (left/top) should remain the same
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          obj,
          { angle: newAngle },
          `Rotate by ${angleDiff}°`
        )
        
        // Execute the command (which will apply the changes)
        this.executeCommand(command)
        
        // IMPORTANT: Update object coordinates after rotation
        obj.setCoords()
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isRotating', false)
    }
  }
  
  /**
   * Reset the tool's state for AI calls to ensure additive rotation
   * This allows each AI rotation command to be applied relative to current state
   */
  public resetForAICall(): void {
    this.state.set('lastAngle', 0)
  }
}

// Export singleton
export const rotateTool = new RotateTool() 