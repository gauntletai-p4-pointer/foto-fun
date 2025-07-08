import { Maximize2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject } from 'fabric'
import { Point } from 'fabric'
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
      const objects = canvas.getObjects()
      if (objects.length === 0) return
      
      // Calculate scale factors
      let scaleX = widthValue / 100
      let scaleY = heightValue / 100
      
      if (maintainAspectRatio) {
        // Use the smaller scale to maintain aspect ratio
        const scale = Math.min(scaleX, scaleY)
        scaleX = scale
        scaleY = scale
      }
      
      // Apply resize to all objects
      objects.forEach((obj: FabricObject) => {
        const oldScaleX = obj.scaleX || 1
        const oldScaleY = obj.scaleY || 1
        
        // Calculate new scale relative to original
        const newScaleX = (oldScaleX / (this.state.get('lastWidth') / 100)) * scaleX
        const newScaleY = (oldScaleY / (this.state.get('lastHeight') / 100)) * scaleY
        
        obj.scale(newScaleX)
        obj.scaleY = newScaleY
        
        // Adjust position to keep centered
        const centerX = canvas.getWidth() / 2
        const centerY = canvas.getHeight() / 2
        const objCenter = obj.getCenterPoint()
        
        const newLeft = centerX + (objCenter.x - centerX) * (scaleX / (this.state.get('lastWidth') / 100))
        const newTop = centerY + (objCenter.y - centerY) * (scaleY / (this.state.get('lastHeight') / 100))
        
        obj.setPositionByOrigin(new Point(newLeft, newTop), 'center', 'center')
        obj.setCoords()
        
        // Record command for undo/redo
        const command = new ModifyCommand(
          canvas,
          obj,
          { scaleX: newScaleX, scaleY: newScaleY, left: obj.left, top: obj.top },
          `Resize to ${Math.round(widthValue)}%`
        )
        this.executeCommand(command)
      })
      
      // Update canvas dimensions if resizing canvas itself
      if (mode === 'absolute') {
        const newWidth = (this.state.get('originalWidth') * widthValue) / 100
        const newHeight = (this.state.get('originalHeight') * heightValue) / 100
        canvas.setDimensions({ width: newWidth, height: newHeight })
      }
      
      canvas.renderAll()
    } finally {
      this.state.set('isResizing', false)
    }
  }
  
  private getOptionValue(optionId: string): unknown {
    const toolOptions = useToolOptionsStore.getState().getToolOptions(this.id)
    const option = toolOptions?.find(opt => opt.id === optionId)
    return option?.value
  }
}

// Export singleton
export const resizeTool = new ResizeTool() 