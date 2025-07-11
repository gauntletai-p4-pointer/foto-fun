import { Heart } from 'lucide-react'
import { BasePixelTool } from '../base/BasePixelTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import { TOOL_IDS } from '@/constants'

/**
 * Healing Brush Tool
 * Blends texture, lighting, and shading from sampled area while preserving destination tone
 */
export class HealingBrushTool extends BasePixelTool {
  id = TOOL_IDS.HEALING_BRUSH
  name = 'Healing Brush Tool'
  icon = Heart
  cursor = 'none' // Custom cursor
  shortcut = 'J'
  
  // Healing source
  private sourcePoint: Point | null = null
  private sourceData: ImageData | null = null
  private destinationData: ImageData | null = null
  
  // Healing modes
  private healingMode: 'normal' | 'spot' = 'normal' // Spot healing doesn't need source
  private sampleMode: 'current' | 'currentAndBelow' | 'all' = 'currentAndBelow'
  private diffusion = 3 // Edge blending control (1-7)
  
  // Current stamp
  private currentStamp: ImageData | null = null
  private lastStampSize = 0
  
  protected setupTool(): void {
    super.setupTool()
    
    // Set default healing brush settings
    this.brushSettings = {
      size: 40,
      hardness: 0, // Always soft for healing
      opacity: 100,
      flow: 100,
      spacing: 25,
      smoothing: 10,
      pressureSensitivity: {
        size: true,
        opacity: false,
        flow: false
      }
    }
  }
  
  /**
   * Get tool-specific options
   */
  getToolOptions(): Record<string, any> {
    return {
      mode: {
        type: 'select',
        label: 'Mode',
        value: this.healingMode,
        options: [
          { value: 'normal', label: 'Normal (Requires Source)' },
          { value: 'spot', label: 'Spot Healing' }
        ],
        onChange: (value: string) => {
          this.healingMode = value as typeof this.healingMode
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
          this.currentStamp = null
        }
      },
      diffusion: {
        type: 'slider',
        label: 'Diffusion',
        value: this.diffusion,
        min: 1,
        max: 7,
        onChange: (value: number) => {
          this.diffusion = value
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
        disabled: this.healingMode === 'spot',
        onChange: (value: string) => {
          this.sampleMode = value as typeof this.sampleMode
        }
      }
    }
  }
  
  /**
   * Handle Alt+Click to set source point (for normal mode)
   */
  onMouseDown(event: ToolEvent): void {
    if (this.healingMode === 'normal' && event.altKey) {
      // Set source point
      this.setSourcePoint(event.point)
      return
    }
    
    if (this.healingMode === 'normal' && !this.sourcePoint) {
      // Need source point first
      console.warn('Healing Brush: Alt-click to set source point first')
      return
    }
    
    // Start healing
    super.onMouseDown(event)
  }
  
  /**
   * Set the source point for healing
   */
  private setSourcePoint(point: Point): void {
    this.sourcePoint = point
    
    // Sample source texture
    this.sampleSourceTexture()
    
    console.log('Healing source set at:', point)
  }
  
  /**
   * Sample source texture for healing
   */
  private sampleSourceTexture(): void {
    if (!this.pixelBuffer || !this.sourcePoint) return
    
    const size = Math.ceil(this.brushSettings.size * 2)
    const halfSize = Math.floor(size / 2)
    
    // Get source area
    const sourceData = this.pixelBuffer.getPixelData()
    if (!sourceData) return
    
    // Extract texture around source point
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
   * Apply paint (healing) at the given point
   */
  protected applyPaint(point: Point, pressure: number = 1): void {
    if (!this.pixelBuffer || !this.currentStroke) return
    
    // Generate or update healing stamp
    if (!this.currentStamp || this.lastStampSize !== this.brushSettings.size) {
      this.currentStamp = this.generateHealingStamp()
      this.lastStampSize = this.brushSettings.size
    }
    
    if (this.healingMode === 'spot') {
      this.applySpotHealing(point, pressure)
    } else if (this.sourcePoint && this.sourceData) {
      this.applyNormalHealing(point, pressure)
    }
  }
  
  /**
   * Generate healing stamp (always soft)
   */
  private generateHealingStamp(): ImageData {
    const size = Math.ceil(this.brushSettings.size)
    
    // Always use soft brush for healing
    return this.brushEngine.generateBrushTip(size, 0)
  }
  
  /**
   * Apply normal healing (with source)
   */
  private applyNormalHealing(point: Point, pressure: number): void {
    if (!this.currentStamp || !this.currentStroke || !this.sourceData || !this.sourcePoint) return
    
    // Sample destination area
    this.sampleDestinationArea(point)
    if (!this.destinationData) return
    
    const stampSize = this.currentStamp.width
    const halfSize = Math.floor(stampSize / 2)
    
    // Calculate actual opacity based on pressure
    const opacity = this.brushSettings.pressureSensitivity.opacity
      ? this.brushSettings.opacity * pressure / 100
      : this.brushSettings.opacity / 100
    
    const { width, height } = this.currentStroke
    
    // Apply healing
    for (let sy = 0; sy < stampSize; sy++) {
      for (let sx = 0; sx < stampSize; sx++) {
        const destX = Math.floor(point.x - halfSize + sx)
        const destY = Math.floor(point.y - halfSize + sy)
        
        if (destX < 0 || destX >= width || destY < 0 || destY >= height) continue
        
        const strokeIndex = (destY * width + destX) * 4
        const stampIndex = (sy * stampSize + sx) * 4
        const localIndex = (sy * stampSize + sx) * 4
        
        // Get stamp alpha
        const stampAlpha = this.currentStamp.data[stampIndex + 3] / 255
        if (stampAlpha === 0) continue
        
        // Get source texture
        const srcR = this.sourceData.data[localIndex]
        const srcG = this.sourceData.data[localIndex + 1]
        const srcB = this.sourceData.data[localIndex + 2]
        
        // Get destination tone
        const dstR = this.destinationData.data[localIndex]
        const dstG = this.destinationData.data[localIndex + 1]
        const dstB = this.destinationData.data[localIndex + 2]
        
        // Calculate luminance difference
        const srcLum = 0.299 * srcR + 0.587 * srcG + 0.114 * srcB
        const dstLum = 0.299 * dstR + 0.587 * dstG + 0.114 * dstB
        const lumDiff = dstLum - srcLum
        
        // Apply texture with destination tone
        const healedR = Math.max(0, Math.min(255, srcR + lumDiff))
        const healedG = Math.max(0, Math.min(255, srcG + lumDiff))
        const healedB = Math.max(0, Math.min(255, srcB + lumDiff))
        
        // Apply diffusion (edge blending)
        const edgeDistance = Math.sqrt(
          Math.pow(sx - halfSize, 2) + Math.pow(sy - halfSize, 2)
        ) / halfSize
        
        const diffusionFactor = 1 - Math.pow(edgeDistance, this.diffusion / 3)
        const finalAlpha = stampAlpha * opacity * diffusionFactor
        
        // Blend with existing stroke
        const currentR = this.currentStroke.data[strokeIndex]
        const currentG = this.currentStroke.data[strokeIndex + 1]
        const currentB = this.currentStroke.data[strokeIndex + 2]
        const currentA = this.currentStroke.data[strokeIndex + 3] / 255
        
        // Apply healing
        this.currentStroke.data[strokeIndex] = Math.floor(currentR + (healedR - currentR) * finalAlpha)
        this.currentStroke.data[strokeIndex + 1] = Math.floor(currentG + (healedG - currentG) * finalAlpha)
        this.currentStroke.data[strokeIndex + 2] = Math.floor(currentB + (healedB - currentB) * finalAlpha)
        this.currentStroke.data[strokeIndex + 3] = Math.floor(Math.max(currentA, finalAlpha) * 255)
      }
    }
  }
  
  /**
   * Apply spot healing (content-aware)
   */
  private applySpotHealing(point: Point, pressure: number): void {
    if (!this.currentStamp || !this.currentStroke || !this.pixelBuffer) return
    
    const stampSize = this.currentStamp.width
    const halfSize = Math.floor(stampSize / 2)
    
    // Sample surrounding area for content-aware healing
    const sampleRadius = stampSize * 1.5
    const samples = this.sampleSurroundingArea(point, sampleRadius, stampSize)
    
    if (samples.length === 0) return
    
    // Calculate actual opacity
    const opacity = this.brushSettings.pressureSensitivity.opacity
      ? this.brushSettings.opacity * pressure / 100
      : this.brushSettings.opacity / 100
    
    const { width, height } = this.currentStroke
    
    // Apply spot healing
    for (let sy = 0; sy < stampSize; sy++) {
      for (let sx = 0; sx < stampSize; sx++) {
        const destX = Math.floor(point.x - halfSize + sx)
        const destY = Math.floor(point.y - halfSize + sy)
        
        if (destX < 0 || destX >= width || destY < 0 || destY >= height) continue
        
        const strokeIndex = (destY * width + destX) * 4
        const stampIndex = (sy * stampSize + sx) * 4
        
        // Get stamp alpha
        const stampAlpha = this.currentStamp.data[stampIndex + 3] / 255
        if (stampAlpha === 0) continue
        
        // Find best matching sample
        const bestSample = this.findBestMatchingSample(sx, sy, samples)
        
        if (bestSample) {
          const sampleIndex = (sy * stampSize + sx) * 4
          
          // Apply diffusion
          const edgeDistance = Math.sqrt(
            Math.pow(sx - halfSize, 2) + Math.pow(sy - halfSize, 2)
          ) / halfSize
          
          const diffusionFactor = 1 - Math.pow(edgeDistance, this.diffusion / 3)
          const finalAlpha = stampAlpha * opacity * diffusionFactor
          
          // Blend with existing stroke
          const currentR = this.currentStroke.data[strokeIndex]
          const currentG = this.currentStroke.data[strokeIndex + 1]
          const currentB = this.currentStroke.data[strokeIndex + 2]
          const currentA = this.currentStroke.data[strokeIndex + 3] / 255
          
          this.currentStroke.data[strokeIndex] = Math.floor(
            currentR + (bestSample.data[sampleIndex] - currentR) * finalAlpha
          )
          this.currentStroke.data[strokeIndex + 1] = Math.floor(
            currentG + (bestSample.data[sampleIndex + 1] - currentG) * finalAlpha
          )
          this.currentStroke.data[strokeIndex + 2] = Math.floor(
            currentB + (bestSample.data[sampleIndex + 2] - currentB) * finalAlpha
          )
          this.currentStroke.data[strokeIndex + 3] = Math.floor(Math.max(currentA, finalAlpha) * 255)
        }
      }
    }
  }
  
  /**
   * Sample destination area for tone matching
   */
  private sampleDestinationArea(point: Point): void {
    if (!this.pixelBuffer) return
    
    const size = Math.ceil(this.brushSettings.size)
    const halfSize = Math.floor(size / 2)
    
    const layerData = this.pixelBuffer.getPixelData()
    if (!layerData) return
    
    this.destinationData = new ImageData(size, size)
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcX = Math.floor(point.x - halfSize + x)
        const srcY = Math.floor(point.y - halfSize + y)
        
        if (srcX >= 0 && srcX < layerData.width && srcY >= 0 && srcY < layerData.height) {
          const srcIndex = (srcY * layerData.width + srcX) * 4
          const dstIndex = (y * size + x) * 4
          
          this.destinationData.data[dstIndex] = layerData.data[srcIndex]
          this.destinationData.data[dstIndex + 1] = layerData.data[srcIndex + 1]
          this.destinationData.data[dstIndex + 2] = layerData.data[srcIndex + 2]
          this.destinationData.data[dstIndex + 3] = layerData.data[srcIndex + 3]
        }
      }
    }
  }
  
  /**
   * Sample surrounding area for spot healing
   */
  private sampleSurroundingArea(
    center: Point,
    radius: number,
    sampleSize: number
  ): ImageData[] {
    if (!this.pixelBuffer) return []
    
    const samples: ImageData[] = []
    const layerData = this.pixelBuffer.getPixelData()
    if (!layerData) return []
    
    // Sample from 8 directions
    const angles = [0, 45, 90, 135, 180, 225, 270, 315]
    
    for (const angle of angles) {
      const rad = (angle * Math.PI) / 180
      const sampleX = center.x + Math.cos(rad) * radius
      const sampleY = center.y + Math.sin(rad) * radius
      
      const sample = new ImageData(sampleSize, sampleSize)
      const halfSize = Math.floor(sampleSize / 2)
      
      for (let y = 0; y < sampleSize; y++) {
        for (let x = 0; x < sampleSize; x++) {
          const srcX = Math.floor(sampleX - halfSize + x)
          const srcY = Math.floor(sampleY - halfSize + y)
          
          if (srcX >= 0 && srcX < layerData.width && srcY >= 0 && srcY < layerData.height) {
            const srcIndex = (srcY * layerData.width + srcX) * 4
            const dstIndex = (y * sampleSize + x) * 4
            
            sample.data[dstIndex] = layerData.data[srcIndex]
            sample.data[dstIndex + 1] = layerData.data[srcIndex + 1]
            sample.data[dstIndex + 2] = layerData.data[srcIndex + 2]
            sample.data[dstIndex + 3] = layerData.data[srcIndex + 3]
          }
        }
      }
      
      samples.push(sample)
    }
    
    return samples
  }
  
  /**
   * Find best matching sample for a pixel position
   */
  private findBestMatchingSample(
    x: number,
    y: number,
    samples: ImageData[]
  ): ImageData | null {
    if (samples.length === 0) return null
    
    // For now, use a simple approach - return the first valid sample
    // In a real implementation, this would use texture synthesis
    return samples[0]
  }
  
  /**
   * Begin healing stroke
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
  }
  
  /**
   * Update stroke - apply to pixel buffer
   */
  protected updateStroke(): void {
    if (!this.currentStroke || !this.pixelBuffer) return
    
    // Update the pixel buffer with healed data
    this.pixelBuffer.updatePixels(this.currentStroke)
  }
  
  /**
   * Get custom cursor for healing brush
   */
  getCursor(): string {
    // Generate brush cursor
    const size = Math.ceil(this.brushSettings.size)
    const cursor = this.brushEngine.createBrushCursor(this.brushSettings)
    const dataUrl = cursor.toDataURL()
    
    return `url(${dataUrl}) ${size / 2} ${size / 2}, crosshair`
  }
} 