import { RotateCw } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { Point } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
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
        // Apply the quick rotation
        this.applyRotation(canvas, quickRotate)
        this.state.set('lastAngle', quickRotate)
        // Update the angle slider to match
        useToolOptionsStore.getState().updateOption(this.id, 'angle', quickRotate)
        // Reset the button group value
        useToolOptionsStore.getState().updateOption(this.id, 'quickRotate', null)
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
      const objects = canvas.getObjects()
      if (objects.length === 0) return
      
      // Get the center point of the canvas
      const centerX = canvas.getWidth() / 2
      const centerY = canvas.getHeight() / 2
      
      // Apply rotation to all objects
      objects.forEach((obj: FabricObject) => {
        // Store the old state for undo
        const oldAngle = obj.angle || 0
        
        // Calculate the angle difference from the last rotation
        const angleDiff = angle - this.state.get('lastAngle')
        
        // Rotate the object
        const newAngle = oldAngle + angleDiff
        obj.rotate(newAngle)
        
        // Update object position to maintain rotation around center
        if (angleDiff !== 0) {
          const point = obj.getCenterPoint()
          const radians = (angleDiff * Math.PI) / 180
          
          // Calculate new position after rotation around center
          const newX = centerX + (point.x - centerX) * Math.cos(radians) - (point.y - centerY) * Math.sin(radians)
          const newY = centerY + (point.x - centerX) * Math.sin(radians) + (point.y - centerY) * Math.cos(radians)
          
          obj.setPositionByOrigin(new Point(newX, newY), 'center', 'center')
        }
        
        obj.setCoords()
        
        // Record command for undo/redo
        const command = new ModifyCommand(
          canvas,
          obj,
          { angle: newAngle, left: obj.left, top: obj.top },
          `Rotate by ${angleDiff}°`
        )
        this.executeCommand(command)
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isRotating', false)
    }
  }
  
  private getOptionValue(optionId: string): unknown {
    const toolOptions = useToolOptionsStore.getState().getToolOptions(this.id)
    const option = toolOptions?.find(opt => opt.id === optionId)
    return option?.value
  }
}

// Export singleton
export const rotateTool = new RotateTool() 