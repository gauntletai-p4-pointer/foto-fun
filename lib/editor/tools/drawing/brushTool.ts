import { Brush } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import type { Canvas, FabricObject, Path } from 'fabric'
import { PencilBrush } from 'fabric'
import { DrawingTool } from '../base/DrawingTool'
import type { ToolOption } from '@/store/toolOptionsStore'
import type { CustomFabricObjectProps } from '@/types'
import { LayerAwareMixin } from '../utils/layerAware'
import { useHistoryStore } from '@/store/historyStore'
import { AddObjectCommand } from '@/lib/editor/commands/canvas'
import { useLayerStore } from '@/store/layerStore'

/**
 * Brush Tool - Freehand drawing tool
 * Extends DrawingTool for consistent drawing behavior
 */
class BrushTool extends DrawingTool {
  // Tool identification
  id = TOOL_IDS.BRUSH
  name = 'Brush Tool'
  icon = Brush
  cursor = 'crosshair'
  shortcut = 'B'
  
  // Tool properties
  protected strokeColor = '#000000'
  protected strokeWidth = 10
  protected opacity = 100
  
  // Brush-specific properties
  private smoothing = true
  private brush: PencilBrush | null = null
  
  /**
   * Tool setup - enable drawing mode
   */
  protected setupTool(canvas: Canvas): void {
    // Check if we can draw on the active layer
    if (!LayerAwareMixin.canDrawOnActiveLayer()) {
      console.warn('Cannot draw on locked or hidden layer')
      return
    }
    
    // Enable Fabric.js drawing mode
    canvas.isDrawingMode = true
    canvas.selection = false
    
    // Create and configure brush
    this.brush = new PencilBrush(canvas)
    this.updateBrushSettings()
    canvas.freeDrawingBrush = this.brush
    
    // Subscribe to option changes
    this.subscribeToToolOptions((options) => {
      this.updateToolProperties(options)
      this.updateBrushSettings()
    })
    
    // Listen for path creation to record commands
    this.addCanvasEvent('path:created', (e: unknown) => {
      const event = e as { path: Path }
      this.handlePathCreated(event.path)
    })
    
    canvas.renderAll()
  }
  
  /**
   * Tool cleanup - disable drawing mode
   */
  protected cleanup(canvas: Canvas): void {
    // Disable drawing mode
    canvas.isDrawingMode = false
    canvas.selection = true
    
    // Clear brush
    canvas.freeDrawingBrush = undefined
    this.brush = null
    
    canvas.renderAll()
  }
  
  /**
   * Update brush settings
   */
  private updateBrushSettings(): void {
    if (!this.brush || !this.canvas) return
    
    this.brush.width = this.strokeWidth
    this.brush.color = this.hexToRgba(this.strokeColor, this.opacity / 100)
    this.brush.decimate = this.smoothing ? 1 : 0
  }
  
  /**
   * Handle path creation - record command and add to layer
   */
  private handlePathCreated(path: Path): void {
    if (!this.canvas) return
    
    this.track('pathCreated', () => {
      try {
        // The path is already on the canvas from Fabric's drawing mode
        // Just add it to the layer system and create command
        
        // This will add layer information to the existing path
        const layerStore = useLayerStore.getState()
        layerStore.addObjectToActiveLayer(path as FabricObject)
        
        // Create and execute command for history
        const pathWithProps = path as Path & CustomFabricObjectProps
        const layerId = pathWithProps.layerId
        const command = new AddObjectCommand(this.canvas!, path as FabricObject, layerId)
        useHistoryStore.getState().executeCommand(command)
        
        console.log('Brush stroke created:', {
          pathData: path.path,
          color: this.strokeColor,
          width: this.strokeWidth,
          opacity: this.opacity,
          layerId: layerId
        })
      } catch (error) {
        console.error('Error creating brush stroke:', error)
      }
    })
  }
  
  /**
   * Update tool properties from options
   */
  protected updateToolProperties(options: ToolOption[]): void {
    options.forEach(option => {
      switch (option.id) {
        case 'color':
          this.strokeColor = option.value as string
          break
        case 'size':
          this.strokeWidth = option.value as number
          break
        case 'opacity':
          this.opacity = option.value as number
          break
        case 'smoothing':
          this.smoothing = option.value as boolean
          break
      }
    })
  }
  
  // Override DrawingTool methods since we use Fabric's drawing mode
  protected beginStroke(): void {
    // Not used - Fabric handles drawing
  }
  
  protected updateStroke(): void {
    // Not used - Fabric handles drawing
  }
  
  protected finalizeStroke(): void {
    // Not used - Fabric handles drawing
  }
  
  /**
   * Helper to convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
}

// Export singleton instance
export const brushTool = new BrushTool() 