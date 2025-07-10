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
    // Ensure all existing images have centeredRotation enabled
    this.ensureCenteredRotation(canvas)
    
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      // Check for quick rotate button press
      const quickRotate = this.getOptionValue('quickRotate')
      if (typeof quickRotate === 'number') {
        // Apply the quick rotation as an additive rotation
        this.applyQuickRotation(canvas, quickRotate)
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
  
  /**
   * Ensure all images on canvas have centeredRotation enabled
   */
  private ensureCenteredRotation(canvas: Canvas): void {
    const objects = canvas.getObjects()
    console.log('[RotateTool] Ensuring centered rotation for all objects')
    objects.forEach((obj: FabricObject) => {
      if (obj.type === 'image' && !obj.centeredRotation) {
        console.log('[RotateTool] Setting centeredRotation for image:', {
          id: obj.get('id' as any),
          currentCenteredRotation: obj.centeredRotation,
          originX: obj.originX,
          originY: obj.originY
        })
        obj.set('centeredRotation', true)
      }
    })
  }
  
  /**
   * Reset lastAngle for AI calls to ensure rotations are relative
   */
  public resetForAICall(): void {
    this.state.set('lastAngle', 0)
  }
  
  /**
   * Apply a quick rotation (additive)
   */
  private applyQuickRotation(canvas: Canvas, rotationAmount: number): void {
    if (this.state.get('isRotating')) return
    
    this.state.set('isRotating', true)
    
    try {
      // Check for active selection first
      const activeObjects = canvas.getActiveObjects()
      const hasSelection = activeObjects.length > 0
      
      // Determine which objects to rotate
      const objectsToRotate = hasSelection ? activeObjects : canvas.getObjects()
      
      if (objectsToRotate.length === 0) return
      
      console.log(`[RotateTool] Quick rotating ${objectsToRotate.length} object(s) by ${rotationAmount}°`)
      
      // Apply rotation to target objects
      objectsToRotate.forEach((obj: FabricObject) => {
        console.log('[RotateTool] Before rotation:', {
          type: obj.type,
          centeredRotation: obj.centeredRotation,
          originX: obj.originX,
          originY: obj.originY,
          left: obj.left,
          top: obj.top,
          angle: obj.angle,
          width: obj.width,
          height: obj.height,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY
        })
        
        // Get the center point before rotation
        const center = obj.getCenterPoint()
        console.log('[RotateTool] Center point before rotation:', center)
        
        // Store old angle
        const oldAngle = obj.angle || 0
        const newAngle = oldAngle + rotationAmount
        
        // Apply the rotation
        obj.set('angle', newAngle)
        
        // Get the new center point after rotation
        const newCenter = obj.getCenterPoint()
        console.log('[RotateTool] Center point after rotation:', newCenter)
        
        // Calculate the offset needed to keep the center in the same place
        const offsetX = center.x - newCenter.x
        const offsetY = center.y - newCenter.y
        
        console.log('[RotateTool] Offset needed:', { offsetX, offsetY })
        
        // Adjust the position to keep the center point fixed
        obj.set({
          left: (obj.left || 0) + offsetX,
          top: (obj.top || 0) + offsetY
        })
        
        // Update object's coordinates
        obj.setCoords()
        
        console.log('[RotateTool] After rotation and adjustment:', {
          angle: obj.angle,
          left: obj.left,
          top: obj.top,
          centerPoint: obj.getCenterPoint()
        })
        
        // Create command for history - capture the final state
        const command = new ModifyCommand(
          canvas,
          obj,
          { 
            angle: obj.angle,
            left: obj.left,
            top: obj.top
          },
          `Rotate by ${rotationAmount}°`
        )
        
        // Execute the command for history tracking
        this.executeCommand(command)
      })
      
      // Update the angle slider to reflect the new rotation
      // Calculate what the slider should show based on the first object
      if (objectsToRotate.length > 0) {
        const firstObject = objectsToRotate[0]
        const newAngle = (firstObject.angle || 0) % 360
        this.state.set('lastAngle', newAngle)
        useToolOptionsStore.getState().updateOption(this.id, 'angle', newAngle)
      }
      
      canvas.renderAll()
    } finally {
      this.state.set('isRotating', false)
    }
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
      
      // Calculate the angle difference from the last rotation
      const angleDiff = angle - this.state.get('lastAngle')
      
      // Apply rotation to target objects
      objectsToRotate.forEach((obj: FabricObject) => {
        console.log('[RotateTool] Before rotation:', {
          type: obj.type,
          centeredRotation: obj.centeredRotation,
          originX: obj.originX,
          originY: obj.originY,
          left: obj.left,
          top: obj.top,
          angle: obj.angle,
          width: obj.width,
          height: obj.height,
          scaleX: obj.scaleX,
          scaleY: obj.scaleY
        })
        
        // Get the center point before rotation
        const center = obj.getCenterPoint()
        console.log('[RotateTool] Center point before rotation:', center)
        
        // Store old angle and calculate new
        const oldAngle = obj.angle || 0
        const newAngle = oldAngle + angleDiff
        
        // Apply the rotation
        obj.set('angle', newAngle)
        
        // Get the new center point after rotation
        const newCenter = obj.getCenterPoint()
        console.log('[RotateTool] Center point after rotation:', newCenter)
        
        // Calculate the offset needed to keep the center in the same place
        const offsetX = center.x - newCenter.x
        const offsetY = center.y - newCenter.y
        
        console.log('[RotateTool] Offset needed:', { offsetX, offsetY })
        
        // Adjust the position to keep the center point fixed
        obj.set({
          left: (obj.left || 0) + offsetX,
          top: (obj.top || 0) + offsetY
        })
        
        // Update object's coordinates
        obj.setCoords()
        
        console.log('[RotateTool] After rotation and adjustment:', {
          angle: obj.angle,
          left: obj.left,
          top: obj.top,
          centerPoint: obj.getCenterPoint()
        })
        
        // Create command for history - capture the final state
        const command = new ModifyCommand(
          canvas,
          obj,
          { 
            angle: obj.angle,
            left: obj.left,
            top: obj.top
          },
          `Rotate by ${angleDiff}°`
        )
        
        // Execute the command for history tracking
        this.executeCommand(command)
      })
      
      canvas.renderAll()
    } finally {
      this.state.set('isRotating', false)
    }
  }
}

// Export singleton
export const rotateTool = new RotateTool() 