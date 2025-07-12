import type { CanvasManager, Layer } from '@/lib/editor/canvas/types'
import { getTypedEventBus } from '@/lib/events/core/TypedEventBus'
import Konva from 'konva'

/**
 * PixelBuffer manages pixel data for efficient painting operations
 * Handles conversion between Konva nodes and pixel data
 */
export class PixelBuffer {
  private canvas: CanvasManager
  private layer: Layer
  private pixelData: ImageData | null = null
  private workingCanvas: HTMLCanvasElement
  private workingContext: CanvasRenderingContext2D
  private typedEventBus = getTypedEventBus()
  
  constructor(canvas: CanvasManager, layer: Layer) {
    this.canvas = canvas
    this.layer = layer
    
    // Create working canvas for pixel operations
    this.workingCanvas = document.createElement('canvas')
    this.workingContext = this.workingCanvas.getContext('2d', {
      willReadFrequently: true,
      alpha: true
    })!
    
    this.initializeBuffer()
  }
  
  /**
   * Initialize the pixel buffer from the layer
   */
  private initializeBuffer(): void {
    const stage = this.canvas.stage
    const stageSize = stage.size()
    
    // Set working canvas size
    this.workingCanvas.width = stageSize.width
    this.workingCanvas.height = stageSize.height
    
    // Clear the canvas
    this.workingContext.clearRect(0, 0, stageSize.width, stageSize.height)
    
    // Draw the layer to the working canvas
    const layerCanvas = this.layer.konvaLayer.toCanvas()
    this.workingContext.drawImage(layerCanvas, 0, 0)
    
    // Get pixel data
    this.pixelData = this.workingContext.getImageData(
      0, 0, 
      stageSize.width, 
      stageSize.height
    )
  }
  
  /**
   * Get pixel data - either for entire canvas or specific region
   */
  getPixelData(): ImageData
  getPixelData(x: number, y: number, width: number, height: number): ImageData
  getPixelData(x?: number, y?: number, width?: number, height?: number): ImageData {
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      // Return entire canvas data
      return this.workingContext.getImageData(
        0, 0,
        this.workingCanvas.width,
        this.workingCanvas.height
      )
    }
    
    if (!this.pixelData) {
      throw new Error('Pixel buffer not initialized')
    }
    
    // Ensure bounds are within canvas
    const clampedX = Math.max(0, Math.floor(x))
    const clampedY = Math.max(0, Math.floor(y))
    const clampedWidth = Math.min(width, this.workingCanvas.width - clampedX)
    const clampedHeight = Math.min(height, this.workingCanvas.height - clampedY)
    
    return this.workingContext.getImageData(
      clampedX, 
      clampedY, 
      clampedWidth, 
      clampedHeight
    )
  }
  
  /**
   * Update pixels with new image data
   */
  updatePixels(imageData: ImageData): void {
    this.workingContext.putImageData(imageData, 0, 0)
    
    // Update our cached pixel data
    this.pixelData = this.workingContext.getImageData(
      0, 0,
      this.workingCanvas.width,
      this.workingCanvas.height
    )
  }
  
  /**
   * Set pixel data for a specific region
   */
  setPixelData(imageData: ImageData, x: number, y: number): void {
    this.workingContext.putImageData(imageData, Math.floor(x), Math.floor(y))
    
    // Update our cached pixel data
    this.pixelData = this.workingContext.getImageData(
      0, 0,
      this.workingCanvas.width,
      this.workingCanvas.height
    )
  }
  
  /**
   * Apply a brush stamp at a specific position
   */
  applyBrushStamp(
    stamp: ImageData,
    x: number,
    y: number,
    color: { r: number; g: number; b: number },
    opacity: number,
    blendMode: GlobalCompositeOperation
  ): void {
    // Calculate stamp position
    const stampX = Math.floor(x - stamp.width / 2)
    const stampY = Math.floor(y - stamp.height / 2)
    
    // Create colored stamp
    const coloredStamp = this.colorizeStamp(stamp, color)
    
    // Save current composite operation
    const prevComposite = this.workingContext.globalCompositeOperation
    const prevAlpha = this.workingContext.globalAlpha
    
    // Set blend mode and opacity
    this.workingContext.globalCompositeOperation = blendMode
    this.workingContext.globalAlpha = opacity
    
    // Apply stamp
    this.workingContext.putImageData(coloredStamp, stampX, stampY)
    
    // Restore previous state
    this.workingContext.globalCompositeOperation = prevComposite
    this.workingContext.globalAlpha = prevAlpha
    
    // Update pixel data
    this.pixelData = this.workingContext.getImageData(
      0, 0,
      this.workingCanvas.width,
      this.workingCanvas.height
    )
  }
  
  /**
   * Colorize a brush stamp
   */
  private colorizeStamp(
    stamp: ImageData,
    color: { r: number; g: number; b: number }
  ): ImageData {
    const colored = new ImageData(stamp.width, stamp.height)
    const data = stamp.data
    const coloredData = colored.data
    
    for (let i = 0; i < data.length; i += 4) {
      // Use alpha from stamp, apply color
      coloredData[i] = color.r
      coloredData[i + 1] = color.g
      coloredData[i + 2] = color.b
      coloredData[i + 3] = data[i + 3] // Keep original alpha
    }
    
    return colored
  }
  
  /**
   * Commit the current stroke to the layer
   */
  async commitStroke(): Promise<void> {
    // Create a Konva image from the stroke data
    const imageObj = new Image()
    const dataUrl = this.workingCanvas.toDataURL()
    
    return new Promise((resolve) => {
      imageObj.onload = () => {
        // Clear the layer
        this.layer.konvaLayer.destroyChildren()
        
        // Add the new image
        const konvaImage = new Konva.Image({
          image: imageObj,
          x: 0,
          y: 0
        })
        
        this.layer.konvaLayer.add(konvaImage)
        this.layer.konvaLayer.batchDraw()
        
        // Emit paint event
        this.typedEventBus.emit('drawing.completed', {
          toolId: 'brush',
          pathId: `stroke-${Date.now()}`,
          bounds: {
            x: 0,
            y: 0,
            width: this.workingCanvas.width,
            height: this.workingCanvas.height
          }
        })
        
        resolve()
      }
      
      imageObj.src = dataUrl
    })
  }
  
  /**
   * Get the full pixel data
   */
  getFullPixelData(): ImageData | null {
    return this.pixelData
  }
  
  /**
   * Clear the pixel buffer
   */
  clear(): void {
    this.workingContext.clearRect(
      0, 0,
      this.workingCanvas.width,
      this.workingCanvas.height
    )
    
    this.pixelData = this.workingContext.getImageData(
      0, 0,
      this.workingCanvas.width,
      this.workingCanvas.height
    )
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    this.pixelData = null
    // Canvas will be garbage collected
  }
  
  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.workingCanvas.width,
      height: this.workingCanvas.height
    }
  }
} 