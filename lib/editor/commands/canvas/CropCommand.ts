import { Command } from '../base'
import type { Canvas, TMat2D } from 'fabric'
import { FabricImage } from 'fabric'

interface CropBounds {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Command to crop the canvas content
 * Handles viewport transformations properly
 */
export class CropCommand extends Command {
  private canvas: Canvas
  private cropBounds: CropBounds
  private originalContent: string = ''
  private originalViewportTransform: TMat2D | undefined
  
  constructor(canvas: Canvas, cropBounds: CropBounds) {
    super('Crop image')
    this.canvas = canvas
    this.cropBounds = cropBounds
    
    // Store original viewport transform
    this.originalViewportTransform = canvas.viewportTransform ? [...canvas.viewportTransform] as TMat2D : undefined
  }
  
  async execute(): Promise<void> {
    const { left, top, width, height } = this.cropBounds
    
    console.log('[CropCommand] Cropping with bounds:', this.cropBounds)
    console.log('[CropCommand] Canvas dimensions:', {
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight()
    })
    console.log('[CropCommand] Viewport transform:', this.canvas.viewportTransform)
    
    // Debug what's on the canvas
    const objects = this.canvas.getObjects()
    console.log('[CropCommand] Objects on canvas:', objects.length)
    
    // Save original canvas state for undo
    this.originalContent = JSON.stringify(this.canvas.toJSON())
    
    // Reset viewport transform temporarily to ensure we crop the right area
    const currentViewport = this.canvas.viewportTransform ? [...this.canvas.viewportTransform] as TMat2D : undefined
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0] as TMat2D)
    
    try {
      // Export the specific region from fabric canvas
      const dataUrl = this.canvas.toDataURL({
        left: left,
        top: top,
        width: width,
        height: height,
        format: 'png',
        multiplier: 1,
        enableRetinaScaling: false
      })
      
      console.log('[CropCommand] Created cropped data URL, length:', dataUrl.length)
      
      // Restore viewport before continuing
      if (currentViewport) {
        this.canvas.setViewportTransform(currentViewport)
      }
      
      // Create new image from cropped data
      return new Promise((resolve, reject) => {
        const croppedImage = new Image()
        
        croppedImage.onload = () => {
          console.log('[CropCommand] Cropped image loaded:', croppedImage.width, 'x', croppedImage.height)
          
          // Clear the canvas
          this.canvas.clear()
          
          // Create fabric image from cropped image
          const fabricImage = new FabricImage(croppedImage, {
            left: 0,
            top: 0,
            centeredRotation: true  // Ensure rotation happens around center
          })
          
          // Add the cropped image to the canvas (keeping original canvas size)
          this.canvas.add(fabricImage)
          
          // Center the cropped image on the canvas
          this.canvas.centerObject(fabricImage)
          fabricImage.setCoords()
          
          // Make it selectable
          fabricImage.set({
            selectable: true,
            evented: true
          })
          
          this.canvas.renderAll()
          
          console.log('[CropCommand] Crop complete - image centered on original canvas size')
          resolve()
        }
        
        croppedImage.onerror = (error) => {
          console.error('[CropCommand] Error loading cropped image:', error)
          reject(new Error('Failed to load cropped image'))
        }
        
        croppedImage.src = dataUrl
      })
    } catch (error) {
      // Restore viewport on error
      if (currentViewport) {
        this.canvas.setViewportTransform(currentViewport)
      }
      throw error
    }
  }
  
  async undo(): Promise<void> {
    // Restore original viewport transform
    if (this.originalViewportTransform) {
      this.canvas.setViewportTransform(this.originalViewportTransform)
    }
    
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
    
    const checks = {
      leftValid: this.cropBounds.left >= 0,
      topValid: this.cropBounds.top >= 0,
      rightValid: this.cropBounds.left + this.cropBounds.width <= canvasWidth,
      bottomValid: this.cropBounds.top + this.cropBounds.height <= canvasHeight,
      widthValid: this.cropBounds.width > 0,
      heightValid: this.cropBounds.height > 0
    }
    
    const allValid = Object.values(checks).every(v => v)
    
    if (!allValid) {
      console.log('[CropCommand] canExecute failed:', {
        cropBounds: this.cropBounds,
        canvasSize: { width: canvasWidth, height: canvasHeight },
        checks,
        rightEdge: this.cropBounds.left + this.cropBounds.width,
        bottomEdge: this.cropBounds.top + this.cropBounds.height
      })
    }
    
    return allValid
  }
} 