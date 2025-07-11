import type { Point } from '@/lib/editor/canvas/types'
import type { BrushShape, BrushSettings } from '../types/brush-types'

/**
 * BrushEngine handles brush dynamics, smoothing, and brush tip generation
 */
export class BrushEngine {
  private smoothingBuffer: Point[] = []
  private readonly MAX_SMOOTHING_POINTS = 20
  
  /**
   * Generate a brush tip stamp based on settings
   */
  generateBrushTip(size: number, hardness: number, shape?: BrushShape): ImageData {
    const diameter = Math.ceil(size)
    const radius = diameter / 2
    
    // Create offscreen canvas for brush tip
    const canvas = document.createElement('canvas')
    canvas.width = diameter
    canvas.height = diameter
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    
    // Default to round brush
    const brushShape = shape || {
      type: 'round',
      angle: 0,
      roundness: 100,
      flipX: false,
      flipY: false
    }
    
    if (brushShape.type === 'round') {
      this.drawRoundBrush(ctx, radius, hardness, brushShape)
    } else if (brushShape.type === 'square') {
      this.drawSquareBrush(ctx, diameter, hardness)
    } else if (brushShape.customShape) {
      this.drawCustomBrush(ctx, brushShape.customShape, diameter)
    }
    
    return ctx.getImageData(0, 0, diameter, diameter)
  }
  
  /**
   * Draw a round brush tip with hardness
   */
  private drawRoundBrush(
    ctx: CanvasRenderingContext2D, 
    radius: number, 
    hardness: number,
    shape: BrushShape
  ): void {
    const center = radius
    
    // Apply transformations
    ctx.save()
    ctx.translate(center, center)
    ctx.rotate((shape.angle * Math.PI) / 180)
    ctx.scale(1, shape.roundness / 100)
    if (shape.flipX) ctx.scale(-1, 1)
    if (shape.flipY) ctx.scale(1, -1)
    ctx.translate(-center, -center)
    
    // Create gradient for soft edges
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius)
    
    if (hardness >= 100) {
      // Hard brush
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)')
    } else {
      // Soft brush with falloff
      const hardnessRadius = (radius * hardness) / 100
      const falloffStart = hardnessRadius / radius
      
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(falloffStart, 'rgba(0, 0, 0, 1)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    }
    
    // Draw the brush
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(center, center, radius, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }
  
  /**
   * Draw a square brush tip
   */
  private drawSquareBrush(
    ctx: CanvasRenderingContext2D,
    size: number,
    hardness: number
  ): void {
    if (hardness >= 100) {
      // Hard square
      ctx.fillStyle = 'rgba(0, 0, 0, 1)'
      ctx.fillRect(0, 0, size, size)
    } else {
      // Soft square with gradient edges
      const edgeSize = (size * (100 - hardness)) / 100 / 2
      
      // Draw with multiple gradients for soft edges
      for (let i = 0; i < edgeSize; i++) {
        const alpha = 1 - (i / edgeSize)
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`
        ctx.lineWidth = 2
        ctx.strokeRect(i, i, size - i * 2, size - i * 2)
      }
      
      // Fill center
      ctx.fillStyle = 'rgba(0, 0, 0, 1)'
      ctx.fillRect(edgeSize, edgeSize, size - edgeSize * 2, size - edgeSize * 2)
    }
  }
  
  /**
   * Draw a custom brush from image data
   */
  private drawCustomBrush(
    ctx: CanvasRenderingContext2D,
    customShape: ImageData,
    targetSize: number
  ): void {
    // Create temp canvas to hold custom shape
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = customShape.width
    tempCanvas.height = customShape.height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(customShape, 0, 0)
    
    // Scale to target size
    ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize)
  }
  
  /**
   * Apply smoothing to a point based on previous points
   */
  smoothPoint(current: Point, previous: Point, smoothingFactor: number): Point {
    if (smoothingFactor <= 0) return current
    
    // Add to smoothing buffer
    this.smoothingBuffer.push(current)
    if (this.smoothingBuffer.length > this.MAX_SMOOTHING_POINTS) {
      this.smoothingBuffer.shift()
    }
    
    // Calculate weighted average
    let totalWeight = 0
    let smoothedX = 0
    let smoothedY = 0
    
    const points = [...this.smoothingBuffer]
    points.forEach((point, index) => {
      const weight = (index + 1) / points.length
      smoothedX += point.x * weight
      smoothedY += point.y * weight
      totalWeight += weight
    })
    
    smoothedX /= totalWeight
    smoothedY /= totalWeight
    
    // Interpolate based on smoothing factor
    return {
      x: previous.x + (smoothedX - previous.x) * smoothingFactor,
      y: previous.y + (smoothedY - previous.y) * smoothingFactor
    }
  }
  
  /**
   * Reset smoothing buffer (call when starting new stroke)
   */
  resetSmoothing(): void {
    this.smoothingBuffer = []
  }
  
  /**
   * Calculate brush opacity with flow accumulation
   */
  calculateOpacityWithFlow(
    baseOpacity: number,
    flow: number,
    existingAlpha: number
  ): number {
    // Flow determines how much opacity can accumulate
    const maxOpacity = baseOpacity
    const increment = maxOpacity * flow
    
    // Calculate new opacity with flow
    const newOpacity = existingAlpha + increment
    
    // Clamp to maximum
    return Math.min(newOpacity, maxOpacity)
  }
  
  /**
   * Apply size jitter to brush
   */
  applySizeJitter(baseSize: number, jitterPercent: number): number {
    if (jitterPercent <= 0) return baseSize
    
    const jitterAmount = (baseSize * jitterPercent) / 100
    const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount
    
    return Math.max(1, baseSize + randomJitter)
  }
  
  /**
   * Create brush cursor preview
   */
  createBrushCursor(settings: BrushSettings): HTMLCanvasElement {
    const size = Math.ceil(settings.size)
    const canvas = document.createElement('canvas')
    canvas.width = size + 2 // Add padding for stroke
    canvas.height = size + 2
    
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.lineWidth = 1
    
    // Draw circle outline
    ctx.beginPath()
    ctx.arc(size / 2 + 1, size / 2 + 1, size / 2, 0, Math.PI * 2)
    ctx.stroke()
    
    // Add crosshair for precise positioning
    const center = size / 2 + 1
    ctx.beginPath()
    ctx.moveTo(center - 3, center)
    ctx.lineTo(center + 3, center)
    ctx.moveTo(center, center - 3)
    ctx.lineTo(center, center + 3)
    ctx.stroke()
    
    return canvas
  }
} 