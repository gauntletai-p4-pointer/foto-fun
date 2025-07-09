import { Command } from '../base'
import type { Canvas } from 'fabric'
import { FabricImage } from 'fabric'

interface CropBounds {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Command to crop the canvas content
 * Simplified implementation matching proven working solution
 */
export class CropCommand extends Command {
  private canvas: Canvas
  private cropBounds: CropBounds
  private originalCanvasSize: { width: number; height: number }
  private originalContent: string = ''
  
  constructor(canvas: Canvas, cropBounds: CropBounds) {
    super('Crop image')
    this.canvas = canvas
    this.cropBounds = cropBounds
    
    // Store original canvas size
    this.originalCanvasSize = {
      width: canvas.getWidth(),
      height: canvas.getHeight()
    }
  }
  
  async execute(): Promise<void> {
    const { left, top, width, height } = this.cropBounds
    
    console.log('[CropCommand] Cropping with bounds:', this.cropBounds)
    console.log('[CropCommand] Canvas dimensions:', {
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight()
    })
    
    // Debug what's on the canvas
    const objects = this.canvas.getObjects()
    console.log('[CropCommand] Objects on canvas:', objects.length)
    objects.forEach((obj, i) => {
      console.log(`[CropCommand] Object ${i}:`, {
        type: obj.type,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        originX: obj.originX,
        originY: obj.originY,
        bounds: obj.getBoundingRect()
      })
    })
    
    // Save original canvas state for undo
    this.originalContent = JSON.stringify(this.canvas.toJSON())
    
    // First, let's see what toDataURL returns without any parameters
    const fullDataUrl = this.canvas.toDataURL()
    console.log('[CropCommand] Full canvas data URL length:', fullDataUrl.length)
    
    // Export only the crop area using Fabric's toDataURL
    const croppedDataUrl = this.canvas.toDataURL({
      left: left,
      top: top,
      width: width,
      height: height,
      multiplier: 1
    })
    
    console.log('[CropCommand] Cropped data URL length:', croppedDataUrl.length)
    console.log('[CropCommand] URLs are same?', fullDataUrl === croppedDataUrl)
    
    console.log('[CropCommand] Created cropped data URL')
    
    // Create new image from cropped data
    return new Promise((resolve, reject) => {
      const croppedImage = new Image()
      
      croppedImage.onload = () => {
        console.log('[CropCommand] Cropped image loaded:', croppedImage.width, 'x', croppedImage.height)
        
        // Let's check if the image actually has content
        const testCanvas = document.createElement('canvas')
        testCanvas.width = croppedImage.width
        testCanvas.height = croppedImage.height
        const testCtx = testCanvas.getContext('2d')!
        testCtx.drawImage(croppedImage, 0, 0)
        
        const imageData = testCtx.getImageData(0, 0, testCanvas.width, testCanvas.height)
        let hasVisiblePixels = false
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] > 0) { // Check alpha channel
            hasVisiblePixels = true
            break
          }
        }
        
        console.log('[CropCommand] Image has visible pixels:', hasVisiblePixels)
        console.log('[CropCommand] First few pixels:', Array.from(imageData.data.slice(0, 16)))
        
        // Clear the canvas
        this.canvas.clear()
        
        // Create fabric image from cropped image
        const fabricImage = new FabricImage(croppedImage)
        
        // Set position to 0,0 (top-left)
        fabricImage.set({
          left: 0,
          top: 0
        })
        
        // Resize canvas to match cropped size
        this.canvas.setDimensions({
          width: width,
          height: height
        })
        
        // Add the cropped image
        this.canvas.add(fabricImage)
        this.canvas.renderAll()
        
        console.log('[CropCommand] Crop complete')
        resolve()
      }
      
      croppedImage.onerror = (error) => {
        console.error('[CropCommand] Error loading cropped image:', error)
        reject(new Error('Failed to load cropped image'))
      }
      
      croppedImage.src = croppedDataUrl
    })
  }
  
  async undo(): Promise<void> {
    // Restore original canvas size
    this.canvas.setDimensions(this.originalCanvasSize)
    
    // Restore original content
    return new Promise((resolve) => {
      this.canvas.loadFromJSON(this.originalContent, () => {
        this.canvas.renderAll()
        resolve()
      })
    })
  }
  
  async redo(): Promise<void> {
    // Simply re-execute
    await this.execute()
  }
  
  canExecute(): boolean {
    // Can execute if crop bounds are valid
    const canvasWidth = this.canvas.getWidth()
    const canvasHeight = this.canvas.getHeight()
    
    return (
      this.cropBounds.left >= 0 &&
      this.cropBounds.top >= 0 &&
      this.cropBounds.left + this.cropBounds.width <= canvasWidth &&
      this.cropBounds.top + this.cropBounds.height <= canvasHeight &&
      this.cropBounds.width > 0 &&
      this.cropBounds.height > 0
    )
  }
} 