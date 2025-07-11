import { Eraser } from 'lucide-react'
import { BasePixelTool } from '../base/BasePixelTool'
import type { Point } from '@/lib/editor/canvas/types'
import { TOOL_IDS } from '@/constants'

/**
 * Eraser Tool with multiple modes
 * Supports Brush, Pencil, Block modes and Background Eraser
 */
export class EraserTool extends BasePixelTool {
  id = TOOL_IDS.ERASER
  name = 'Eraser Tool'
  icon = Eraser
  cursor = 'none' // Custom cursor
  shortcut = 'E'
  
  // Eraser modes
  private mode: 'brush' | 'pencil' | 'block' | 'background' = 'brush'
  
  // Background eraser settings
  private tolerance = 50 // 0-255
  private sampleContinuous = true
  private protectForeground = false
  
  // Current eraser stamp
  private currentEraserStamp: ImageData | null = null
  private lastEraserSize = 0
  
  protected setupTool(): void {
    super.setupTool()
    
    // Set default eraser settings
    this.brushSettings = {
      size: 20,
      hardness: 0,
      opacity: 100,
      flow: 100,
      spacing: 25,
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
  getToolOptions(): Record<string, unknown> {
    return {
      mode: {
        type: 'select',
        label: 'Mode',
        value: this.mode,
        options: [
          { value: 'brush', label: 'Brush' },
          { value: 'pencil', label: 'Pencil' },
          { value: 'block', label: 'Block' },
          { value: 'background', label: 'Background Eraser' }
        ],
        onChange: (value: string) => {
          this.mode = value as typeof this.mode
          this.updateBrushSettings()
        }
      },
      size: {
        type: 'slider',
        label: 'Size',
        value: this.brushSettings.size,
        min: 1,
        max: 500,
        onChange: (value: number) => {
          this.brushSettings.size = value
          this.currentEraserStamp = null
        }
      },
      hardness: {
        type: 'slider',
        label: 'Hardness',
        value: this.brushSettings.hardness,
        min: 0,
        max: 100,
        disabled: this.mode === 'pencil' || this.mode === 'block',
        onChange: (value: number) => {
          this.brushSettings.hardness = value
          this.currentEraserStamp = null
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
        disabled: this.mode === 'background',
        onChange: (value: number) => {
          this.brushSettings.flow = value
        }
      },
      tolerance: {
        type: 'slider',
        label: 'Tolerance',
        value: this.tolerance,
        min: 0,
        max: 255,
        disabled: this.mode !== 'background',
        onChange: (value: number) => {
          this.tolerance = value
        }
      },
      sampleContinuous: {
        type: 'toggle',
        label: 'Sample Continuous',
        value: this.sampleContinuous,
        disabled: this.mode !== 'background',
        onChange: (value: boolean) => {
          this.sampleContinuous = value
        }
      }
    }
  }
  
  /**
   * Update brush settings based on mode
   */
  private updateBrushSettings(): void {
    switch (this.mode) {
      case 'pencil':
        this.brushSettings.hardness = 100
        break
      case 'block':
        this.brushSettings.hardness = 100
        this.brushSettings.spacing = 0
        break
      case 'background':
        // Background eraser uses edge detection
        break
    }
    this.currentEraserStamp = null
  }
  
  /**
   * Generate eraser stamp based on mode
   */
  private generateEraserStamp(): ImageData {
    const size = Math.ceil(this.brushSettings.size)
    
    if (this.mode === 'block') {
      // Simple square stamp
      const stamp = new ImageData(size, size)
      for (let i = 0; i < stamp.data.length; i += 4) {
        stamp.data[i + 3] = 255 // Full alpha
      }
      return stamp
    }
    
    // For brush and pencil modes, use brush engine
    const hardness = this.mode === 'pencil' ? 100 : this.brushSettings.hardness
    return this.brushEngine.generateBrushTip(size, hardness)
  }
  
  /**
   * Apply paint (eraser) at the given point - required by BasePixelTool
   */
  protected applyPaint(point: Point, pressure: number = 1): void {
    this.applyToolAtPoint(point, pressure)
  }
  
  /**
   * Apply eraser at the given point
   */
  protected applyToolAtPoint(point: Point, pressure: number = 1): void {
    if (!this.pixelBuffer || !this.currentStroke) return
    
    // Generate or update eraser stamp
    if (!this.currentEraserStamp || this.lastEraserSize !== this.brushSettings.size) {
      this.currentEraserStamp = this.generateEraserStamp()
      this.lastEraserSize = this.brushSettings.size
    }
    
    // Calculate actual opacity based on pressure
    const opacity = this.brushSettings.pressureSensitivity.opacity
      ? this.brushSettings.opacity * pressure / 100
      : this.brushSettings.opacity / 100
    
    if (this.mode === 'background') {
      this.applyBackgroundEraser(point, opacity)
    } else {
      this.applyStandardEraser(point, opacity)
    }
  }
  
  /**
   * Apply standard eraser (brush/pencil/block modes)
   */
  private applyStandardEraser(point: Point, opacity: number): void {
    if (!this.currentEraserStamp || !this.currentStroke) return
    
    const stampSize = this.currentEraserStamp.width
    const halfSize = Math.floor(stampSize / 2)
    
    // Get stroke dimensions
    const { width, height } = this.currentStroke
    
    // Apply eraser stamp
    for (let sy = 0; sy < stampSize; sy++) {
      for (let sx = 0; sx < stampSize; sx++) {
        const x = Math.floor(point.x - halfSize + sx)
        const y = Math.floor(point.y - halfSize + sy)
        
        // Check bounds
        if (x < 0 || x >= width || y < 0 || y >= height) continue
        
        const strokeIndex = (y * width + x) * 4
        const stampIndex = (sy * stampSize + sx) * 4
        
        // Get stamp alpha
        const stampAlpha = this.currentEraserStamp.data[stampIndex + 3] / 255
        
        // Apply eraser with flow
        if (stampAlpha > 0) {
          const eraserStrength = stampAlpha * opacity
          const currentAlpha = this.currentStroke.data[strokeIndex + 3] / 255
          
          // Calculate new alpha with flow
          const newAlpha = this.brushSettings.flow < 100
            ? currentAlpha * (1 - eraserStrength * this.brushSettings.flow / 100)
            : currentAlpha * (1 - eraserStrength)
          
          // Set new alpha (erasing)
          this.currentStroke.data[strokeIndex + 3] = Math.floor(newAlpha * 255)
        }
      }
    }
  }
  
  /**
   * Apply background eraser with edge detection
   */
  private applyBackgroundEraser(point: Point, opacity: number): void {
    if (!this.currentEraserStamp || !this.currentStroke || !this.pixelBuffer) return
    
    // Sample color at cursor center
    const layerData = this.pixelBuffer.getPixelData()
    if (!layerData) return
    
    const sampleX = Math.floor(point.x)
    const sampleY = Math.floor(point.y)
    const sampleIndex = (sampleY * layerData.width + sampleX) * 4
    
    const sampleColor = {
      r: layerData.data[sampleIndex],
      g: layerData.data[sampleIndex + 1],
      b: layerData.data[sampleIndex + 2],
      a: layerData.data[sampleIndex + 3]
    }
    
    const stampSize = this.currentEraserStamp.width
    const halfSize = Math.floor(stampSize / 2)
    const { width, height } = this.currentStroke
    
    // Apply background eraser
    for (let sy = 0; sy < stampSize; sy++) {
      for (let sx = 0; sx < stampSize; sx++) {
        const x = Math.floor(point.x - halfSize + sx)
        const y = Math.floor(point.y - halfSize + sy)
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue
        
        const strokeIndex = (y * width + x) * 4
        const stampIndex = (sy * stampSize + sx) * 4
        const layerIndex = (y * layerData.width + x) * 4
        
        // Get stamp alpha
        const stampAlpha = this.currentEraserStamp.data[stampIndex + 3] / 255
        if (stampAlpha === 0) continue
        
        // Get pixel color from layer
        const pixelColor = {
          r: layerData.data[layerIndex],
          g: layerData.data[layerIndex + 1],
          b: layerData.data[layerIndex + 2],
          a: layerData.data[layerIndex + 3]
        }
        
        // Calculate color difference
        const diff = Math.sqrt(
          Math.pow(pixelColor.r - sampleColor.r, 2) +
          Math.pow(pixelColor.g - sampleColor.g, 2) +
          Math.pow(pixelColor.b - sampleColor.b, 2)
        )
        
        // Check if within tolerance
        if (diff <= this.tolerance) {
          const eraserStrength = stampAlpha * opacity
          const currentAlpha = this.currentStroke.data[strokeIndex + 3] / 255
          const newAlpha = currentAlpha * (1 - eraserStrength)
          
          this.currentStroke.data[strokeIndex + 3] = Math.floor(newAlpha * 255)
        }
      }
    }
  }
  
  /**
   * Begin eraser stroke
   */
  protected beginStroke(): void {
    const dimensions = this.pixelBuffer?.getDimensions()
    if (!dimensions) return
    
    // Create stroke buffer
    this.currentStroke = new ImageData(dimensions.width, dimensions.height)
    
    // Copy existing alpha channel (we'll subtract from it)
    const layerData = this.pixelBuffer?.getPixelData()
    if (layerData) {
      for (let i = 0; i < layerData.data.length; i += 4) {
        this.currentStroke.data[i + 3] = layerData.data[i + 3]
      }
    }
    
    // Reset smoothing
    this.brushEngine.resetSmoothing()
  }
  
  /**
   * Update stroke - apply to pixel buffer
   */
  protected updateStroke(): void {
    if (!this.currentStroke || !this.pixelBuffer) return
    
    // Apply eraser stroke to layer
    const layerData = this.pixelBuffer.getPixelData()
    if (!layerData) return
    
    // Apply the erased alpha channel
    for (let i = 0; i < layerData.data.length; i += 4) {
      layerData.data[i + 3] = this.currentStroke.data[i + 3]
    }
    
    // Update the pixel buffer
    this.pixelBuffer.updatePixels(layerData)
  }
  
  /**
   * Get custom cursor for eraser
   */
  getCursor(): string {
    if (this.mode === 'block') {
      return 'crosshair'
    }
    
    // Generate brush cursor
    const size = Math.ceil(this.brushSettings.size)
    const cursor = this.brushEngine.createBrushCursor(this.brushSettings)
    const dataUrl = cursor.toDataURL()
    
    return `url(${dataUrl}) ${size / 2} ${size / 2}, crosshair`
  }
} 