import { Type } from 'lucide-react'
import { IText, Textbox } from 'fabric'
import { TOOL_IDS } from '@/constants'
import { BaseTextTool } from '../base/BaseTextTool'
import { useSelectionStore } from '@/store/selectionStore'
import { useCanvasStore } from '@/store/canvasStore'

/**
 * Type Mask Tool - Creates selections in the shape of text
 * Instead of adding text to the canvas, it creates a selection mask
 */
class TypeMaskTool extends BaseTextTool {
  // Tool identification
  id = TOOL_IDS.TYPE_MASK
  name = 'Type Mask Tool'
  icon = Type
  cursor = 'text'
  shortcut = undefined // Access via tool palette
  
  /**
   * Override commitText to create selection instead of keeping text
   */
  protected commitText(): void {
    const currentText = this.state.get('currentText')
    
    if (!currentText || !this.canvas || this.state.get('isCommitting')) return
    
    // Set guard flag to prevent re-entry
    this.state.set('isCommitting', true)
    
    try {
      // Clean up event handlers first
      this.cleanupTextEventHandlers()
      
      // Exit editing mode
      if (currentText.isEditing) {
        currentText.exitEditing()
      }
      
      // Restore controls temporarily for proper bounds calculation
      currentText.set({
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false
      })
      
      // If text is not empty (and not just our placeholder space), convert to selection
      if (currentText.text && currentText.text.trim() !== '') {
        this.convertTextToSelection(currentText)
      }
      
      // Always remove the text object (we only want the selection)
      this.canvas.remove(currentText)
      this.canvas.renderAll()
      
      // Reset state
      this.state.setState({
        currentText: null,
        isEditing: false,
        originalText: '',
        isCommitting: false
      })
    } catch (error) {
      console.error('Error committing text mask:', error)
      // Ensure we reset the committing flag even on error
      this.state.set('isCommitting', false)
    }
  }
  
  /**
   * Convert text object to selection mask
   */
  private convertTextToSelection(textObject: IText | Textbox): void {
    if (!this.canvas) return
    
    const { selectionManager } = useCanvasStore.getState()
    if (!selectionManager) return
    
    // Get text bounds
    const textBounds = textObject.getBoundingRect()
    
    // Create a temporary canvas to render the text
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = Math.ceil(textBounds.width)
    tempCanvas.height = Math.ceil(textBounds.height)
    const tempCtx = tempCanvas.getContext('2d')
    
    if (!tempCtx) return
    
    // Configure text rendering
    tempCtx.font = `${textObject.fontStyle} ${textObject.fontWeight} ${textObject.fontSize}px ${textObject.fontFamily}`
    tempCtx.textAlign = textObject.textAlign as CanvasTextAlign
    tempCtx.textBaseline = 'top'
    tempCtx.fillStyle = 'white'
    
    // Clear and fill background
    tempCtx.fillStyle = 'black'
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    
    // Draw text in white
    tempCtx.fillStyle = 'white'
    
    // Handle multi-line text
    const lines = textObject.text?.split('\n') || []
    const lineHeight = textObject.lineHeight ? textObject.fontSize * textObject.lineHeight : textObject.fontSize * 1.16
    
    lines.forEach((line, index) => {
      const yPos = index * lineHeight
      
      // Calculate x position based on alignment
      let xPos = 0
      if (textObject.textAlign === 'center') {
        xPos = tempCanvas.width / 2
      } else if (textObject.textAlign === 'right') {
        xPos = tempCanvas.width
      }
      
      tempCtx.fillText(line, xPos, yPos)
    })
    
    // Get image data and create selection from white pixels
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
    const selectionData = new ImageData(this.canvas.width, this.canvas.height)
    
    // Map text pixels to selection at the correct position
    const startX = Math.round(textBounds.left)
    const startY = Math.round(textBounds.top)
    
    for (let y = 0; y < tempCanvas.height; y++) {
      for (let x = 0; x < tempCanvas.width; x++) {
        const srcIndex = (y * tempCanvas.width + x) * 4
        const dstX = startX + x
        const dstY = startY + y
        
        // Check bounds
        if (dstX >= 0 && dstX < this.canvas.width && dstY >= 0 && dstY < this.canvas.height) {
          const dstIndex = (dstY * this.canvas.width + dstX) * 4
          
          // Copy alpha from red channel (since we drew in white)
          const alpha = imageData.data[srcIndex]
          selectionData.data[dstIndex + 3] = alpha
        }
      }
    }
    
    // Apply the selection
    const selectionMode = useSelectionStore.getState().mode
    
    // Calculate bounds for the selection
    const selectionBounds = {
      x: Math.round(textBounds.left),
      y: Math.round(textBounds.top),
      width: Math.ceil(textBounds.width),
      height: Math.ceil(textBounds.height)
    }
    
    // Use restoreSelection to apply the mask
    if (selectionMode === 'replace') {
      selectionManager.restoreSelection(selectionData, selectionBounds)
    } else {
      // For other modes, we need to apply the mode manually
      // First restore the selection, then the SelectionManager will handle the mode
      selectionManager.restoreSelection(selectionData, selectionBounds)
    }
    
    // Clean up
    tempCanvas.remove()
  }
  
  /**
   * Create a text object for mask creation
   */
  protected createTextObject(x: number, y: number): IText {
    // Create a new text object with visual indicators
    const fontFamily = this.getOptionValue<string>('fontFamily') || 'Arial'
    const fontSize = this.getOptionValue<number>('fontSize') || 60
    const color = this.getOptionValue<string>('color') || '#000000'
    const alignment = this.getOptionValue<string>('alignment') || 'left'
    const bold = this.getOptionValue<boolean>('bold') || false
    const italic = this.getOptionValue<boolean>('italic') || false
    const underline = this.getOptionValue<boolean>('underline') || false
    
    const text = new IText(' ', {
      left: x,
      top: y,
      fontFamily,
      fontSize,
      fill: color,
      textAlign: alignment,
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
      underline,
      editable: true,
      cursorColor: color, // Match cursor color to text color
      cursorWidth: 2,
      cursorDelay: 500,
      cursorDuration: 500,
      selectionColor: 'rgba(100, 100, 255, 0.3)',
      selectionStart: 0,
      selectionEnd: 1, // Select the placeholder space
      evented: true,
      // Visual indicator that this is a mask tool
      stroke: '#0066ff',
      strokeWidth: 1,
      strokeDashArray: [5, 5]
    })
    
    return text
  }
}

// Export singleton instance
export const typeMaskTool = new TypeMaskTool() 