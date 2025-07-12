import type { CanvasManager, Layer } from '@/lib/editor/canvas/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import Konva from 'konva'

/**
 * PixelBuffer - Efficient pixel manipulation for drawing tools
 * Now uses dependency injection instead of singleton pattern
 */
export class PixelBuffer {
  private typedEventBus: TypedEventBus
  private buffer: ImageData | null = null
  private canvas: HTMLCanvasElement | null = null
  private context: CanvasRenderingContext2D | null = null

  constructor(typedEventBus: TypedEventBus) {
    this.typedEventBus = typedEventBus
  }
  
  /**
   * Initialize the pixel buffer from the layer
   */
  private initializeBuffer(): void {
    if (!this.canvas || !this.context) {
      throw new Error('Canvas not initialized')
    }
    
    const stage = this.canvas
    // Fix: Use canvas dimensions instead of stage.size()
    const stageWidth = this.canvas.width
    const stageHeight = this.canvas.height
    
    // Set working canvas size
    this.canvas.width = stageWidth
    this.canvas.height = stageHeight
    
    // Clear the canvas
    this.context.clearRect(0, 0, stageWidth, stageHeight)
    
    // Draw the layer to the working canvas - only if layer exists
    if (this.layer && this.layer.konvaLayer) {
      const layerCanvas = this.layer.konvaLayer.toCanvas()
      this.context.drawImage(layerCanvas, 0, 0)
    }
    
    // Get pixel data
    this.buffer = this.context.getImageData(
      0, 0, 
      stageWidth, 
      stageHeight
    )
  }
  
  /**
   * Get pixel data - either for entire canvas or specific region
   */
  getPixelData(): ImageData
  getPixelData(x: number, y: number, width: number, height: number): ImageData
  getPixelData(x?: number, y?: number, width?: number, height?: number): ImageData {
    if (!this.context || !this.canvas) {
      throw new Error('Canvas not initialized')
    }
    
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      // Return entire canvas data
      return this.context.getImageData(
        0, 0,
        this.canvas.width,
        this.canvas.height
      )
    }
    
    if (!this.buffer) {
      throw new Error('Pixel buffer not initialized')
    }
    
    // Ensure bounds are within canvas
    const clampedX = Math.max(0, Math.floor(x))
    const clampedY = Math.max(0, Math.floor(y))
    const clampedWidth = Math.min(width, this.canvas.width - clampedX)
    const clampedHeight = Math.min(height, this.canvas.height - clampedY)
    
    return this.context.getImageData(
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
    if (!this.context || !this.canvas) {
      throw new Error('Canvas not initialized')
    }
    
    this.context.putImageData(imageData, 0, 0)
    
    // Update our cached pixel data
    this.buffer = this.context.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
    )
  }
  
  /**
   * Set pixel data for a specific region
   */
  setPixelData(imageData: ImageData, x: number, y: number): void {
    if (!this.context || !this.canvas) {
      throw new Error('Canvas not initialized')
    }
    
    this.context.putImageData(imageData, Math.floor(x), Math.floor(y))
    
    // Update our cached pixel data
    this.buffer = this.context.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
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
    const prevComposite = this.context.globalCompositeOperation
    const prevAlpha = this.context.globalAlpha
    
    // Set blend mode and opacity
    this.context.globalCompositeOperation = blendMode
    this.context.globalAlpha = opacity
    
    // Apply stamp
    this.context.putImageData(coloredStamp, stampX, stampY)
    
    // Restore previous state
    this.context.globalCompositeOperation = prevComposite
    this.context.globalAlpha = prevAlpha
    
    // Update pixel data
    this.buffer = this.context.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
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
    const dataUrl = this.canvas.toDataURL()
    
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
            width: this.canvas.width,
            height: this.canvas.height
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
    return this.buffer
  }
  
  /**
   * Clear the pixel buffer
   */
  clear(): void {
    if (!this.context || !this.canvas) {
      throw new Error('Canvas not initialized')
    }
    
    this.context.clearRect(
      0, 0,
      this.canvas.width,
      this.canvas.height
    )
    
    this.buffer = this.context.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
    )
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    this.buffer = null
    // Canvas will be garbage collected
  }
  
  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    if (!this.canvas) {
      throw new Error('Canvas not initialized')
    }
    return {
      width: this.canvas.width,
      height: this.canvas.height
    }
  }
} 