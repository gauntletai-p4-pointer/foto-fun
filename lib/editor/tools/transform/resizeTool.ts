import { Maximize2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { BaseTool } from '../base/BaseTool'
import { createToolState } from '../utils/toolState'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import { ModifyCommand } from '@/lib/editor/commands/canvas'

// Define tool state
type ResizeToolState = {
  isResizing: boolean
  lastWidth: number
  lastHeight: number
  originalWidth: number
  originalHeight: number
}

class ResizeTool extends BaseTool {
  // Required properties
  id = TOOL_IDS.RESIZE
  name = 'Resize'
  icon = Maximize2
  cursor = 'default'
  shortcut = 'S'
  
  // Tool state
  private state = createToolState<ResizeToolState>({
    isResizing: false,
    lastWidth: 100,
    lastHeight: 100,
    originalWidth: 0,
    originalHeight: 0
  })
  
  // Required: Setup
  protected setupTool(canvas: Canvas): void {
    // Capture original dimensions
    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()
    this.state.setState({
      originalWidth: canvasWidth,
      originalHeight: canvasHeight,
      lastWidth: 100,
      lastHeight: 100
    })
    
    // Initialize tool options with current dimensions
    useToolOptionsStore.getState().updateOption(this.id, 'width', canvasWidth)
    useToolOptionsStore.getState().updateOption(this.id, 'height', canvasHeight)
    
    // Subscribe to tool options
    this.subscribeToToolOptions(() => {
      const mode = this.getOptionValue('mode') as string
      const maintainAspectRatio = this.getOptionValue('maintainAspectRatio') as boolean
      
      if (mode === 'percentage') {
        const percentage = this.getOptionValue('percentage')
        if (typeof percentage === 'number' && percentage !== this.state.get('lastWidth')) {
          this.applyResize(canvas, 'percentage', percentage, percentage, maintainAspectRatio)
          this.state.set('lastWidth', percentage)
          this.state.set('lastHeight', percentage)
        }
      } else {
        const width = this.getOptionValue('width')
        const height = this.getOptionValue('height')
        
        if (typeof width === 'number' && typeof height === 'number') {
          const widthPercentage = (width / this.state.get('originalWidth')) * 100
          const heightPercentage = (height / this.state.get('originalHeight')) * 100
          
          if (widthPercentage !== this.state.get('lastWidth') || heightPercentage !== this.state.get('lastHeight')) {
            this.applyResize(canvas, 'absolute', widthPercentage, heightPercentage, maintainAspectRatio)
            this.state.set('lastWidth', widthPercentage)
            this.state.set('lastHeight', heightPercentage)
          }
        }
      }
    })
  }
  
  // Required: Cleanup
  protected cleanup(): void {
    // Don't reset the resize - let it persist
    // Reset only the internal state
    this.state.setState({
      isResizing: false,
      lastWidth: this.state.get('lastWidth'),
      lastHeight: this.state.get('lastHeight'),
      originalWidth: this.state.get('originalWidth'),
      originalHeight: this.state.get('originalHeight')
    })
  }
  
  private applyResize(
    canvas: Canvas, 
    mode: 'percentage' | 'absolute',
    widthValue: number,
    heightValue: number,
    maintainAspectRatio: boolean
  ): void {
    if (this.state.get('isResizing')) return
    
    this.state.set('isResizing', true)
    
    try {
      // Check for active selection first
      const activeObjects = canvas.getActiveObjects()
      const hasSelection = activeObjects.length > 0
      
      // Determine which objects to resize
      const objectsToResize = hasSelection ? activeObjects : canvas.getObjects()
      
      if (objectsToResize.length === 0) return
      
      console.log(`[ResizeTool] Resizing ${objectsToResize.length} object(s) - ${hasSelection ? 'selected only' : 'all objects'}`)
      
      // Calculate scale factors
      let scaleX = widthValue / 100
      let scaleY = heightValue / 100
      
      if (maintainAspectRatio) {
        // Use the smaller scale to maintain aspect ratio
        const scale = Math.min(scaleX, scaleY)
        scaleX = scale
        scaleY = scale
      }
      
      // Apply resize to target objects
      objectsToResize.forEach((obj: FabricObject) => {
        const oldScaleX = obj.scaleX || 1
        const oldScaleY = obj.scaleY || 1
        
        // Calculate new scale relative to original
        const newScaleX = (oldScaleX / (this.state.get('lastWidth') / 100)) * scaleX
        const newScaleY = (oldScaleY / (this.state.get('lastHeight') / 100)) * scaleY
        
        // Calculate new position to keep centered
        const centerX = canvas.getWidth() / 2
        const centerY = canvas.getHeight() / 2
        const objCenter = obj.getCenterPoint()
        
        const scaleFactor = scaleX / (this.state.get('lastWidth') / 100)
        const newLeft = centerX + (objCenter.x - centerX) * scaleFactor
        const newTop = centerY + (objCenter.y - centerY) * scaleFactor
        
        // Create command BEFORE modifying the object
        const command = new ModifyCommand(
          canvas,
          obj,
          { 
            scaleX: newScaleX, 
            scaleY: newScaleY, 
            left: newLeft - (obj.width || 0) * newScaleX / 2,
            top: newTop - (obj.height || 0) * newScaleY / 2
          },
          `Resize to ${Math.round(widthValue)}%`
        )
        
        // Execute the command (which will apply the changes)
        this.executeCommand(command)
      })
      
      canvas.renderAll()
      
      // Update state
      this.state.set('lastWidth', widthValue)
      this.state.set('lastHeight', heightValue)
    } finally {
      this.state.set('isResizing', false)
    }
  }
}

// Export singleton
export const resizeTool = new ResizeTool() 