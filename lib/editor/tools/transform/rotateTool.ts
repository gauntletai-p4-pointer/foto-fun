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
      // Check for active selection first
      const activeObjects = canvas.getActiveObjects()
      const hasSelection = activeObjects.length > 0
      
      // Determine which objects to rotate
      const objectsToRotate = hasSelection ? activeObjects : canvas.getObjects()
      
      if (objectsToRotate.length === 0) return
      
      console.log(`[RotateTool] Rotating ${objectsToRotate.length} object(s) by ${angle}° - ${hasSelection ? 'selected only' : 'all objects'}`)
      
      // Get the center point of the canvas
      const centerX = canvas.getWidth() / 2
      const centerY = canvas.getHeight() / 2
      
      // Calculate the angle difference from the last rotation
      const angleDiff = angle - this.state.get('lastAngle')
      
      // Apply rotation to target objects
      objectsToRotate.forEach((obj: FabricObject) => {
        // Store the old state for undo
        const oldAngle = obj.angle || 0
        const oldLeft = obj.left || 0
        const oldTop = obj.top || 0
        
        // Calculate new angle
        const newAngle = oldAngle + angleDiff
        
        // Calculate new position after rotation around center
        let newLeft = oldLeft
        let newTop = oldTop
        
        if (angleDiff !== 0) {
          const point = obj.getCenterPoint()
          const radians = (angleDiff * Math.PI) / 180
          
          // Calculate new position after rotation around center
          const newX = centerX + (point.x - centerX) * Math.cos(radians) - (point.y - centerY) * Math.sin(radians)
          const newY = centerY + (point.x - centerX) * Math.sin(radians) + (point.y - centerY) * Math.cos(radians)
          
          const newPoint = new Point(newX, newY)
          // Calculate left/top from center point
          newLeft = newPoint.x - (obj.width || 0) * (obj.scaleX || 1) / 2
          newTop = newPoint.y - (obj.height || 0) * (obj.scaleY || 1) / 2
        }
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          obj,
          { angle: newAngle, left: newLeft, top: newTop },
          `Rotate by ${angleDiff}°`
        )
        
        // Execute the command (which will apply the changes)
        this.executeCommand(command)
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