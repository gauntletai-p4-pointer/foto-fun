import Konva from 'konva'
import type { Layer, CanvasState } from './types'

/**
 * Professional compositor for layer rendering
 * Handles the complex task of combining layers into the final image
 */
export class Compositor {
  private stage: Konva.Stage
  private compositeLayer: Konva.Layer
  private backgroundLayer: Konva.Layer
  private contentGroup: Konva.Group
  private overlayGroup: Konva.Group
  
  constructor(stage: Konva.Stage) {
    this.stage = stage
    
    // Create a single composite layer that holds everything
    this.compositeLayer = new Konva.Layer()
    
    // Create groups within the composite layer for different purposes
    this.backgroundLayer = new Konva.Layer()
    this.contentGroup = new Konva.Group()
    this.overlayGroup = new Konva.Group()
    
    // Add to stage in correct order
    this.stage.add(this.backgroundLayer)
    this.stage.add(this.compositeLayer)
    
    // Add groups to composite layer
    this.compositeLayer.add(this.contentGroup)
    this.compositeLayer.add(this.overlayGroup)
  }
  
  /**
   * Update the background (checkerboard or solid color)
   */
  updateBackground(width: number, height: number, backgroundColor: string): void {
    // Clear existing background
    this.backgroundLayer.destroyChildren()
    
    if (backgroundColor === 'transparent') {
      // Create checkerboard pattern
      const checkerSize = 10
      const rows = Math.ceil(height / checkerSize)
      const cols = Math.ceil(width / checkerSize)
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const isLight = (row + col) % 2 === 0
          const rect = new Konva.Rect({
            x: col * checkerSize,
            y: row * checkerSize,
            width: checkerSize,
            height: checkerSize,
            fill: isLight ? '#ffffff' : '#f0f0f0',
            listening: false
          })
          this.backgroundLayer.add(rect)
        }
      }
    } else {
      // Solid color background
      const bgRect = new Konva.Rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: backgroundColor,
        listening: false
      })
      this.backgroundLayer.add(bgRect)
    }
    
    this.backgroundLayer.batchDraw()
  }
  
  /**
   * Composite layers in the correct order
   */
  compositeLayers(layers: Layer[], state: CanvasState): void {
    // Clear content group
    this.contentGroup.destroyChildren()
    
    // Add each layer's content to the content group
    layers.forEach((layer) => {
      if (!layer.visible) return
      
      // Create a group for this layer
      const layerGroup = new Konva.Group({
        opacity: layer.opacity,
        visible: layer.visible
      })
      
      // Clone all objects from the layer into our group
      layer.konvaLayer.children.forEach(child => {
        const clone = child.clone()
        layerGroup.add(clone)
      })
      
      // Apply blend mode
      this.applyBlendMode(layerGroup, layer.blendMode)
      
      // Add to content group
      this.contentGroup.add(layerGroup)
    })
    
    // Apply canvas clipping
    this.contentGroup.clip({
      x: 0,
      y: 0,
      ...state.viewport
    })
    
    // Redraw
    this.compositeLayer.batchDraw()
  }
  
  /**
   * Add overlay elements (selection, guides, etc)
   */
  updateOverlay(overlayElements: Konva.Node[]): void {
    this.overlayGroup.destroyChildren()
    overlayElements.forEach(element => {
      this.overlayGroup.add(element.clone())
    })
    this.compositeLayer.batchDraw()
  }
  
  /**
   * Apply blend mode to a group
   */
  private applyBlendMode(group: Konva.Group, blendMode: string): void {
    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion',
      'hue': 'source-over',
      'saturation': 'source-over',
      'color': 'source-over',
      'luminosity': 'source-over'
    }
    
    group.globalCompositeOperation(blendModeMap[blendMode] || 'source-over')
  }
  
  /**
   * Force a full redraw
   */
  redraw(): void {
    this.stage.batchDraw()
  }
  
  /**
   * Get the composite layer for external use
   */
  getCompositeLayer(): Konva.Layer {
    return this.compositeLayer
  }
  
  /**
   * Destroy the compositor
   */
  destroy(): void {
    this.backgroundLayer.destroy()
    this.compositeLayer.destroy()
  }
} 