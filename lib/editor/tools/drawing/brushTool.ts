import { Brush } from 'lucide-react'
import { BasePixelTool } from '../base/BasePixelTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import { TOOL_IDS } from '@/constants'

/**
 * Enhanced Brush Tool with true pixel-based painting
 * Supports pressure sensitivity, smoothing, and various blend modes
 */
export class BrushTool extends BasePixelTool {
  id = TOOL_IDS.BRUSH
  name = 'Brush Tool'
  icon = Brush
  cursor = 'none' // We'll use custom cursor
  shortcut = 'B'
  
  // Current brush color
  private brushColor = { r: 0, g: 0, b: 0 }
  private blendMode: GlobalCompositeOperation = 'source-over'
  
  // Brush stamp cache
  private currentBrushStamp: ImageData | null = null
  private lastBrushSize = 0
  
  protected setupTool(): void {
    super.setupTool()
    
    // Load color from options or use default
    const color = (this.getOption('color') as string) || '#000000'
    this.setBrushColor(color)
    
    // Load blend mode
    this.blendMode = (this.getOption('blendMode') as GlobalCompositeOperation) || 'source-over'
    
    // Reset brush engine smoothing
    this.brushEngine.resetSmoothing()
    
    // Update cursor
    this.updateCursor()
  }
  
  protected cleanupTool(): void {
    super.cleanupTool()
    this.currentBrushStamp = null
  }
  
  /**
   * Begin a new brush stroke
   */
  protected beginStroke(_event: ToolEvent): void {
    // Initialize stroke data
    const dimensions = this.pixelBuffer?.getDimensions()
    if (!dimensions) return
    
    this.currentStroke = new ImageData(dimensions.width, dimensions.height)
    
    // Reset smoothing for new stroke
    this.brushEngine.resetSmoothing()
  }
  
  /**
   * Apply paint at a specific point
   */
  protected applyPaint(point: Point, pressure: number): void {
    if (!this.pixelBuffer || !this.currentStroke) return
    
    // Calculate dynamic brush parameters
    const size = this.calculateBrushSize(pressure)
    const opacity = this.calculateOpacity(pressure)
    const flow = this.calculateFlow(pressure)
    
    // Generate or get cached brush stamp
    if (!this.currentBrushStamp || this.lastBrushSize !== size) {
      this.currentBrushStamp = this.brushEngine.generateBrushTip(
        size,
        this.brushSettings.hardness
      )
      this.lastBrushSize = size
    }
    
    // Apply brush stamp to pixel buffer
    this.pixelBuffer.applyBrushStamp(
      this.currentBrushStamp,
      point.x,
      point.y,
      this.brushColor,
      opacity * flow,
      this.blendMode
    )
  }
  
  /**
   * Set brush color from hex string
   */
  private setBrushColor(hexColor: string): void {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '')
    this.brushColor = {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16)
    }
  }
  
  /**
   * Update custom cursor
   */
  private updateCursor(): void {
    const cursorCanvas = this.brushEngine.createBrushCursor(this.brushSettings)
    const cursorUrl = cursorCanvas.toDataURL()
    
    // Update cursor style
    const canvas = this.getCanvas()
    if (canvas.konvaStage.container()) {
      const container = canvas.konvaStage.container()
      container.style.cursor = `url(${cursorUrl}) ${cursorCanvas.width / 2} ${cursorCanvas.height / 2}, crosshair`
    }
  }
  
  /**
   * Handle option changes
   */
  protected onOptionChange(key: string, value: unknown): void {
    super.onOptionChange(key, value)
    
    switch (key) {
      case 'color':
        this.setBrushColor(value as string)
        break
      case 'blendMode':
        this.blendMode = value as GlobalCompositeOperation
        break
      case 'size':
      case 'hardness':
        // Invalidate brush stamp cache
        this.currentBrushStamp = null
        this.updateCursor()
        break
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'size',
      type: 'slider' as const,
      label: 'Size',
      min: 1,
      max: 500,
      default: 20,
      step: 1
    },
    {
      id: 'hardness',
      type: 'slider' as const,
      label: 'Hardness',
      min: 0,
      max: 100,
      default: 100,
      step: 1
    },
    {
      id: 'opacity',
      type: 'slider' as const,
      label: 'Opacity',
      min: 0,
      max: 100,
      default: 100,
      step: 1
    },
    {
      id: 'flow',
      type: 'slider' as const,
      label: 'Flow',
      min: 0,
      max: 100,
      default: 100,
      step: 1
    },
    {
      id: 'spacing',
      type: 'slider' as const,
      label: 'Spacing',
      min: 1,
      max: 200,
      default: 25,
      step: 1
    },
    {
      id: 'smoothing',
      type: 'slider' as const,
      label: 'Smoothing',
      min: 0,
      max: 100,
      default: 0,
      step: 1
    },
    {
      id: 'color',
      type: 'color' as const,
      label: 'Color',
      default: '#000000'
    },
    {
      id: 'blendMode',
      type: 'select' as const,
      label: 'Blend Mode',
      options: [
        { value: 'source-over', label: 'Normal' },
        { value: 'multiply', label: 'Multiply' },
        { value: 'screen', label: 'Screen' },
        { value: 'overlay', label: 'Overlay' },
        { value: 'darken', label: 'Darken' },
        { value: 'lighten', label: 'Lighten' },
        { value: 'color-dodge', label: 'Color Dodge' },
        { value: 'color-burn', label: 'Color Burn' },
        { value: 'hard-light', label: 'Hard Light' },
        { value: 'soft-light', label: 'Soft Light' },
        { value: 'difference', label: 'Difference' },
        { value: 'exclusion', label: 'Exclusion' }
      ],
      default: 'source-over'
    },
    {
      id: 'pressureSensitivity',
      type: 'group' as const,
      label: 'Pressure Sensitivity',
      children: [
        {
          id: 'size',
          type: 'checkbox' as const,
          label: 'Size',
          default: true
        },
        {
          id: 'opacity',
          type: 'checkbox' as const,
          label: 'Opacity',
          default: false
        },
        {
          id: 'flow',
          type: 'checkbox' as const,
          label: 'Flow',
          default: false
        }
      ]
    }
  ]
}

// Export singleton instance
export const brushTool = new BrushTool() 