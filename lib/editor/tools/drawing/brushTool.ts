import Konva from 'konva'
import { FaPaintBrush } from 'react-icons/fa'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent } from '@/lib/editor/canvas/types'

/**
 * Pixel-aware brush tool for painting on canvas
 * Supports pressure sensitivity, opacity, and various brush modes
 */
export class BrushTool extends BaseTool {
  id = 'brush'
  name = 'Brush Tool'
  icon = FaPaintBrush
  cursor = 'crosshair'
  shortcut = 'B'
  
  // Drawing state
  private isDrawing = false
  private lastPoint: { x: number; y: number } | null = null
  private currentStroke: Konva.Line | null = null
  private drawingLayer: Konva.Layer | null = null
  
  // Brush settings
  private brushSize = 10
  private brushOpacity = 1
  private brushColor = '#000000'
  private brushHardness = 0.8
  private pressureSensitivity = 0.5
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create a dedicated drawing layer for real-time performance
    this.drawingLayer = new Konva.Layer()
    canvas.stage.add(this.drawingLayer)
    
    // Set initial brush options
    this.brushSize = this.getOption('size') || 10
    this.brushOpacity = this.getOption('opacity') || 1
    this.brushColor = this.getOption('color') || '#000000'
    this.brushHardness = this.getOption('hardness') || 0.8
    this.pressureSensitivity = this.getOption('pressureSensitivity') || 0.5
  }
  
  protected cleanupTool(): void {
    // Clean up drawing layer
    if (this.drawingLayer) {
      this.drawingLayer.destroy()
      this.drawingLayer = null
    }
    
    // Reset state
    this.isDrawing = false
    this.lastPoint = null
    this.currentStroke = null
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.drawingLayer) return
    
    this.isDrawing = true
    this.lastPoint = { x: event.point.x, y: event.point.y }
    
    // Create a new stroke
    this.currentStroke = new Konva.Line({
      points: [event.point.x, event.point.y],
      stroke: this.brushColor,
      strokeWidth: this.calculateBrushSize(event.pressure),
      lineCap: 'round',
      lineJoin: 'round',
      opacity: this.brushOpacity,
      globalCompositeOperation: 'source-over',
      tension: 0.5,
      // Custom attributes for our brush
      perfectDrawEnabled: false, // Performance optimization
      shadowForStrokeEnabled: false // Performance optimization
    })
    
    this.drawingLayer.add(this.currentStroke)
    this.drawingLayer.batchDraw()
  }
  
  onMouseMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.drawingLayer) return
    
    const newPoint = { x: event.point.x, y: event.point.y }
    
    // Add points to the current stroke
    const points = this.currentStroke.points()
    points.push(newPoint.x, newPoint.y)
    this.currentStroke.points(points)
    
    // Adjust stroke width based on pressure if available
    if (event.pressure !== undefined && this.pressureSensitivity > 0) {
      this.currentStroke.strokeWidth(this.calculateBrushSize(event.pressure))
    }
    
    // Batch draw for performance
    this.drawingLayer.batchDraw()
    
    this.lastPoint = newPoint
  }
  
  onMouseUp(event: ToolEvent): void {
    if (!this.isDrawing || !this.currentStroke || !this.drawingLayer) return
    
    this.isDrawing = false
    
    // Finalize the stroke
    this.finalizeStroke()
    
    // Reset state
    this.lastPoint = null
    this.currentStroke = null
  }
  
  /**
   * Calculate brush size based on pressure
   */
  private calculateBrushSize(pressure?: number): number {
    if (pressure === undefined || this.pressureSensitivity === 0) {
      return this.brushSize
    }
    
    // Apply pressure sensitivity
    const pressureMultiplier = 0.5 + (pressure * 0.5 * this.pressureSensitivity)
    return this.brushSize * pressureMultiplier
  }
  
  /**
   * Finalize the current stroke and merge it with the active layer
   */
  private async finalizeStroke(): Promise<void> {
    if (!this.currentStroke || !this.drawingLayer) return
    
    const canvas = this.getCanvas()
    const activeLayer = canvas.getActiveLayer()
    
    if (!activeLayer) return
    
    // Convert the stroke to pixels and merge with the active layer
    // This is where we'd implement the actual pixel manipulation
    // For now, we'll move the stroke to the active layer
    this.currentStroke.remove()
    activeLayer.konvaLayer.add(this.currentStroke)
    activeLayer.konvaLayer.batchDraw()
    
    // Emit event for history
    await canvas.addObject({
      type: 'path',
      node: this.currentStroke
    }, activeLayer.id)
  }
  
  protected onOptionChange(key: string, value: any): void {
    switch (key) {
      case 'size':
        this.brushSize = value
        break
      case 'opacity':
        this.brushOpacity = value
        break
      case 'color':
        this.brushColor = value
        break
      case 'hardness':
        this.brushHardness = value
        break
      case 'pressureSensitivity':
        this.pressureSensitivity = value
        break
    }
  }
  
  // Tool options configuration
  static options = [
    {
      id: 'size',
      type: 'slider',
      label: 'Size',
      min: 1,
      max: 200,
      default: 10,
      step: 1
    },
    {
      id: 'opacity',
      type: 'slider',
      label: 'Opacity',
      min: 0,
      max: 1,
      default: 1,
      step: 0.01
    },
    {
      id: 'color',
      type: 'color',
      label: 'Color',
      default: '#000000'
    },
    {
      id: 'hardness',
      type: 'slider',
      label: 'Hardness',
      min: 0,
      max: 1,
      default: 0.8,
      step: 0.01
    },
    {
      id: 'pressureSensitivity',
      type: 'slider',
      label: 'Pressure Sensitivity',
      min: 0,
      max: 1,
      default: 0.5,
      step: 0.01
    }
  ]
}

// Export singleton instance
export const brushTool = new BrushTool() 