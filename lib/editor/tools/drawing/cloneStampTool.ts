import { Stamp } from 'lucide-react'
import { BasePixelTool } from '../base/BasePixelTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import { TOOL_IDS } from '@/constants'

/**
 * Clone Stamp Tool
 * Allows copying pixels from one area to another with brush-like control
 */
export class CloneStampTool extends BasePixelTool {
  id = TOOL_IDS.CLONE_STAMP
  name = 'Clone Stamp Tool'
  icon = Stamp
  cursor = 'none' // Custom cursor
  shortcut = 'S'
  
  // Clone source
  private sourcePoint: Point | null = null
  private sourceOffset: Point = { x: 0, y: 0 }
  private sourceData: ImageData | null = null
  
  // Clone modes
  private aligned = true // Source moves with brush vs stays fixed
  private sampleMode: 'current' | 'currentAndBelow' | 'all' = 'currentAndBelow'
  private showOverlay = true
  private overlayOpacity = 0.5
  
  // Current stamp
  private currentStamp: ImageData | null = null
  private lastStampSize = 0
  
  protected setupTool(): void {
    super.setupTool()
    
    // Set default clone stamp settings
    this.brushSettings = {
      size: 100,
      hardness: 0,
      opacity: 100,
      flow: 100,
      spacing: 0, // Continuous for cloning
      smoothing: 10,
      pressureSensitivity: {
        size: true,
        opacity: true,
        flow: false
      }
    }
  }
  
  /**
   * Get tool-specific options
   */
  getToolOptions(): Record<string, any> {
    return {
      size: {
        type: 'slider',
        label: 'Size',
        value: this.brushSettings.size,
        min: 1,
        max: 500,
        onChange: (value: number) => {
          this.brushSettings.size = value
          this.currentStamp = null
        }
      },
      hardness: {
        type: 'slider',
        label: 'Hardness',
        value: this.brushSettings.hardness,
        min: 0,
        max: 100,
        onChange: (value: number) => {
          this.brushSettings.hardness = value
          this.currentStamp = null
        }
      },
      opacity: {
        type: 'slider',
        label: 'Opacity',
        value: this.brushSettings.opacity,
        min: 0,
        max: 100,
        onChange: (value: number) => {
          this.brushSettings.opacity = value
        }
      },
      flow: {
        type: 'slider',
        label: 'Flow',
        value: this.brushSettings.flow,
        min: 0,
        max: 100,
        onChange: (value: number) => {
          this.brushSettings.flow = value
        }
      },
      aligned: {
        type: 'toggle',
        label: 'Aligned',
        value: this.aligned,
        onChange: (value: boolean) => {
          this.aligned = value
        }
      },
      sampleMode: {
        type: 'select',
        label: 'Sample',
        value: this.sampleMode,
        options: [
          { value: 'current', label: 'Current Layer' },
          { value: 'currentAndBelow', label: 'Current & Below' },
          { value: 'all', label: 'All Layers' }
        ],
        onChange: (value: string) => {
          this.sampleMode = value as typeof this.sampleMode
        }
      },
      showOverlay: {
        type: 'toggle',
        label: 'Show Overlay',
        value: this.showOverlay,
        onChange: (value: boolean) => {
          this.showOverlay = value
        }
      },
      overlayOpacity: {
        type: 'slider',
        label: 'Overlay Opacity',
        value: this.overlayOpacity * 100,
        min: 0,
        max: 100,
        disabled: !this.showOverlay,
        onChange: (value: number) => {
          this.overlayOpacity = value / 100
        }
      }
    }
  }
  
  /**
   * Handle Alt+Click to set source point
   */
  onMouseDown(event: ToolEvent): void {
    if (event.altKey) {
      // Set source point
      this.setSourcePoint(event.point)
      return
    }
    
    if (!this.sourcePoint) {
      // Need source point first
      console.warn('Clone Stamp: Alt-click to set source point first')
      return
    }
    
    // Start cloning
    super.onMouseDown(event)
  }
  
  /**
   * Set the source point for cloning
   */
  private setSourcePoint(point: Point): void {
    this.sourcePoint = point
    
    // Calculate initial offset
    if (this.lastPoint) {
      this.sourceOffset = {
        x: point.x - this.lastPoint.x,
        y: point.y - this.lastPoint.y
      }
    }
    
    // Sample source data for preview
    this.sampleSourceData()
    
    console.log('Clone source set at:', point)
  }
  
  /**
   * Sample source data based on current settings
   */
  private sampleSourceData(): void {
    if (!this.pixelBuffer || !this.sourcePoint) return
    
    const size = Math.ceil(this.brushSettings.size * 2) // Extra margin for movement
    const halfSize = Math.floor(size / 2)
    
    // Get source area based on sample mode
    let sourceData: ImageData | null = null
    
    switch (this.sampleMode) {
      case 'current':
        sourceData = this.pixelBuffer.getPixelData()
        break
      case 'currentAndBelow':
        // TODO: Implement sampling from current and below layers
        sourceData = this.pixelBuffer.getPixelData()
        break
      case 'all':
        // TODO: Implement sampling from all layers
        sourceData = this.pixelBuffer.getPixelData()
        break
    }
    
    if (!sourceData) return
    
    // Extract region around source point
    this.sourceData = new ImageData(size, size)
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcX = Math.floor(this.sourcePoint.x - halfSize + x)
        const srcY = Math.floor(this.sourcePoint.y - halfSize + y)
        
        if (srcX >= 0 && srcX < sourceData.width && srcY >= 0 && srcY < sourceData.height) {
          const srcIndex = (srcY * sourceData.width + srcX) * 4
          const dstIndex = (y * size + x) * 4
          
          this.sourceData.data[dstIndex] = sourceData.data[srcIndex]
          this.sourceData.data[dstIndex + 1] = sourceData.data[srcIndex + 1]
          this.sourceData.data[dstIndex + 2] = sourceData.data[srcIndex + 2]
          this.sourceData.data[dstIndex + 3] = sourceData.data[srcIndex + 3]
        }
      }
    }
  }
  
  /**
   * Generate clone stamp
   */
  private generateCloneStamp(): ImageData {
    const size = Math.ceil(this.brushSettings.size)
    
    // Use brush engine to create the stamp shape
    return this.brushEngine.generateBrushTip(size, this.brushSettings.hardness)
  }
  
  /**
   * Apply paint (clone) at the given point
   */
  protected applyPaint(point: Point, pressure: number = 1): void {
    if (!this.pixelBuffer || !this.currentStroke || !this.sourcePoint || !this.sourceData) return
    
    // Generate or update clone stamp
    if (!this.currentStamp || this.lastStampSize !== this.brushSettings.size) {
      this.currentStamp = this.generateCloneStamp()
      this.lastStampSize = this.brushSettings.size
    }
    
    // Calculate source position
    let sourceX: number, sourceY: number
    
    if (this.aligned) {
      // Source moves with brush
      sourceX = this.sourcePoint.x + (point.x - (this.paintPath[0]?.x || point.x))
      sourceY = this.sourcePoint.y + (point.y - (this.paintPath[0]?.y || point.y))
    } else {
      // Source stays fixed
      sourceX = this.sourcePoint.x
      sourceY = this.sourcePoint.y
    }
    
    // Apply cloning
    this.applyCloneStamp(point, { x: sourceX, y: sourceY }, pressure)
  }
  
  /**
   * Apply clone stamp from source to destination
   */
  private applyCloneStamp(destPoint: Point, sourcePoint: Point, pressure: number): void {
    if (!this.currentStamp || !this.currentStroke || !this.sourceData) return
    
    const stampSize = this.currentStamp.width
    const halfSize = Math.floor(stampSize / 2)
    const sourceDataHalfSize = Math.floor(this.sourceData.width / 2)
    
    // Calculate actual opacity based on pressure
    const opacity = this.brushSettings.pressureSensitivity.opacity
      ? this.brushSettings.opacity * pressure / 100
      : this.brushSettings.opacity / 100
    
    const { width, height } = this.currentStroke
    
    // Apply clone stamp
    for (let sy = 0; sy < stampSize; sy++) {
      for (let sx = 0; sx < stampSize; sx++) {
        // Destination coordinates
        const destX = Math.floor(destPoint.x - halfSize + sx)
        const destY = Math.floor(destPoint.y - halfSize + sy)
        
        if (destX < 0 || destX >= width || destY < 0 || destY >= height) continue
        
        // Source coordinates (in sourceData buffer)
        const srcX = Math.floor(sourcePoint.x - this.sourcePoint.x + sourceDataHalfSize + sx - halfSize)
        const srcY = Math.floor(sourcePoint.y - this.sourcePoint.y + sourceDataHalfSize + sy - halfSize)
        
        if (srcX < 0 || srcX >= this.sourceData.width || srcY < 0 || srcY >= this.sourceData.height) continue
        
        const strokeIndex = (destY * width + destX) * 4
        const stampIndex = (sy * stampSize + sx) * 4
        const sourceIndex = (srcY * this.sourceData.width + srcX) * 4
        
        // Get stamp alpha (brush shape)
        const stampAlpha = this.currentStamp.data[stampIndex + 3] / 255
        
        if (stampAlpha > 0) {
          // Get source color
          const srcR = this.sourceData.data[sourceIndex]
          const srcG = this.sourceData.data[sourceIndex + 1]
          const srcB = this.sourceData.data[sourceIndex + 2]
          const srcA = this.sourceData.data[sourceIndex + 3] / 255
          
          // Get destination color
          const dstR = this.currentStroke.data[strokeIndex]
          const dstG = this.currentStroke.data[strokeIndex + 1]
          const dstB = this.currentStroke.data[strokeIndex + 2]
          const dstA = this.currentStroke.data[strokeIndex + 3] / 255
          
          // Calculate final alpha
          const finalAlpha = stampAlpha * opacity * srcA
          
          // Blend colors
          const blended = this.blendingEngine.blendPixels(
            { r: srcR, g: srcG, b: srcB, a: srcA * 255 },
            { r: dstR, g: dstG, b: dstB, a: dstA * 255 },
            'source-over',
            finalAlpha
          )
          
          // Apply with flow
          if (this.brushSettings.flow < 100) {
            const flow = this.brushSettings.flow / 100
            this.currentStroke!.data[strokeIndex] = Math.floor(dstR + (blended.r - dstR) * flow)
            this.currentStroke!.data[strokeIndex + 1] = Math.floor(dstG + (blended.g - dstG) * flow)
            this.currentStroke!.data[strokeIndex + 2] = Math.floor(dstB + (blended.b - dstB) * flow)
            this.currentStroke!.data[strokeIndex + 3] = Math.floor(dstA * 255 + (blended.a - dstA * 255) * flow)
          } else {
            this.currentStroke!.data[strokeIndex] = blended.r
            this.currentStroke!.data[strokeIndex + 1] = blended.g
            this.currentStroke!.data[strokeIndex + 2] = blended.b
            this.currentStroke!.data[strokeIndex + 3] = blended.a
          }
        }
      }
    }
  }
  
  /**
   * Begin clone stroke
   */
  protected beginStroke(_event: ToolEvent): void {
    const dimensions = this.pixelBuffer?.getDimensions()
    if (!dimensions) return
    
    // Create stroke buffer with existing content
    this.currentStroke = new ImageData(dimensions.width, dimensions.height)
    
    // Copy existing layer data
    const layerData = this.pixelBuffer?.getPixelData()
    if (layerData) {
      for (let i = 0; i < layerData.data.length; i++) {
        this.currentStroke.data[i] = layerData.data[i]
      }
    }
    
    // Reset smoothing
    this.brushEngine.resetSmoothing()
    
    // Update source data if needed
    if (this.aligned && this.sourcePoint) {
      this.sampleSourceData()
    }
  }
  
  /**
   * Update stroke - apply to pixel buffer
   */
  protected updateStroke(): void {
    if (!this.currentStroke || !this.pixelBuffer) return
    
    // Update the pixel buffer with cloned data
    this.pixelBuffer.updatePixels(this.currentStroke)
  }
  
  /**
   * Get custom cursor for clone stamp
   */
  getCursor(): string {
    // Generate brush cursor with crosshair
    const size = Math.ceil(this.brushSettings.size)
    const cursor = this.brushEngine.createBrushCursor(this.brushSettings)
    const dataUrl = cursor.toDataURL()
    
    return `url(${dataUrl}) ${size / 2} ${size / 2}, crosshair`
  }
  
  /**
   * Render overlay preview (if enabled)
   */
  renderOverlay(ctx: CanvasRenderingContext2D, currentPoint: Point): void {
    if (!this.showOverlay || !this.sourcePoint || !this.sourceData) return
    
    // Calculate source position for preview
    let sourceX: number, sourceY: number
    
    if (this.aligned && this.paintPath.length > 0) {
      sourceX = this.sourcePoint.x + (currentPoint.x - this.paintPath[0].x)
      sourceY = this.sourcePoint.y + (currentPoint.y - this.paintPath[0].y)
    } else {
      sourceX = this.sourcePoint.x
      sourceY = this.sourcePoint.y
    }
    
    // Draw semi-transparent preview at cursor position
    ctx.save()
    ctx.globalAlpha = this.overlayOpacity
    
    // Create temp canvas for preview
    const previewSize = Math.ceil(this.brushSettings.size)
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = previewSize
    tempCanvas.height = previewSize
    const tempCtx = tempCanvas.getContext('2d')!
    
    // Extract preview from source data
    const halfSize = Math.floor(previewSize / 2)
    const sourceDataHalfSize = Math.floor(this.sourceData.width / 2)
    
    const previewData = tempCtx.createImageData(previewSize, previewSize)
    
    for (let y = 0; y < previewSize; y++) {
      for (let x = 0; x < previewSize; x++) {
        const srcX = Math.floor(sourceX - this.sourcePoint.x + sourceDataHalfSize + x - halfSize)
        const srcY = Math.floor(sourceY - this.sourcePoint.y + sourceDataHalfSize + y - halfSize)
        
        if (srcX >= 0 && srcX < this.sourceData.width && srcY >= 0 && srcY < this.sourceData.height) {
          const srcIndex = (srcY * this.sourceData.width + srcX) * 4
          const dstIndex = (y * previewSize + x) * 4
          
          previewData.data[dstIndex] = this.sourceData.data[srcIndex]
          previewData.data[dstIndex + 1] = this.sourceData.data[srcIndex + 1]
          previewData.data[dstIndex + 2] = this.sourceData.data[srcIndex + 2]
          previewData.data[dstIndex + 3] = this.sourceData.data[srcIndex + 3]
        }
      }
    }
    
    tempCtx.putImageData(previewData, 0, 0)
    
    // Apply brush mask
    if (this.currentStamp) {
      tempCtx.globalCompositeOperation = 'destination-in'
      tempCtx.putImageData(this.currentStamp, 0, 0)
    }
    
    // Draw preview at cursor
    ctx.drawImage(
      tempCanvas,
      currentPoint.x - halfSize,
      currentPoint.y - halfSize
    )
    
    ctx.restore()
  }
} 