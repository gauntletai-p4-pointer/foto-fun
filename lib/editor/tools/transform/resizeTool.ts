import { Maximize2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { CanvasObject, Transform } from '@/lib/editor/canvas/types'
import { ObjectsTransformedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Resize Tool - Smart resizing with quality options
 * Konva implementation with proper scaling and positioning
 */
export class ResizeTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.RESIZE
  name = 'Resize'
  icon = Maximize2
  cursor = 'default'
  shortcut = 'S'
  
  // Track resize state
  private isResizing = false
  private lastScaleX = 1
  private lastScaleY = 1
  private originalCanvasSize = { width: 0, height: 0 }
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Capture original canvas dimensions
    this.originalCanvasSize = {
      width: canvas.state.width,
      height: canvas.state.height
    }
    
    // Initialize tool options
    this.setOption('mode', 'percentage')
    this.setOption('percentage', 100)
    this.setOption('width', canvas.state.width)
    this.setOption('height', canvas.state.height)
    this.setOption('maintainAspectRatio', true)
  }
  
  protected cleanupTool(): void {
    // Reset state but keep transformations
    this.isResizing = false
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (this.isResizing) return
    
    const mode = this.getOption('mode') as string
    const maintainAspectRatio = this.getOption('maintainAspectRatio') as boolean
    
    if (mode === 'percentage' && key === 'percentage') {
      const percentage = value as number
      this.applyResize('percentage', percentage, percentage, maintainAspectRatio)
    } else if (mode === 'absolute' && (key === 'width' || key === 'height')) {
      const width = this.getOption('width') as number
      const height = this.getOption('height') as number
      const widthPercentage = (width / this.originalCanvasSize.width) * 100
      const heightPercentage = (height / this.originalCanvasSize.height) * 100
      this.applyResize('absolute', widthPercentage, heightPercentage, maintainAspectRatio)
    }
  }
  
  /**
   * Apply resize transformation
   */
  async applyResize(
    mode: 'percentage' | 'absolute',
    widthValue: number,
    heightValue: number,
    maintainAspectRatio: boolean
  ): Promise<void> {
    if (this.isResizing) return
    
    this.isResizing = true
    
    try {
      const targets = this.getTargetObjects()
      
      if (targets.length === 0) {
        console.warn('[ResizeTool] No objects to resize')
        return
      }
      
      // Calculate scale factors
      let scaleX = widthValue / 100
      let scaleY = heightValue / 100
      
      if (maintainAspectRatio) {
        // Use the smaller scale to maintain aspect ratio
        const scale = Math.min(scaleX, scaleY)
        scaleX = scale
        scaleY = scale
      }
      
      const transformedObjects: Array<{
        objectId: string
        before: Transform
        after: Transform
      }> = []
      
      // Apply resize to each target
      for (const target of targets) {
        const before = { ...target.transform }
        
        // Calculate new scale relative to last scale
        const relativeScaleX = scaleX / this.lastScaleX
        const relativeScaleY = scaleY / this.lastScaleY
        
        const newScaleX = (target.transform.scaleX || 1) * relativeScaleX
        const newScaleY = (target.transform.scaleY || 1) * relativeScaleY
        
        // Calculate new position to keep centered
        const canvas = this.getCanvas()
        const centerX = canvas.state.width / 2
        const centerY = canvas.state.height / 2
        
        // Get object dimensions from node
        const nodeWidth = target.node.width() || 0
        const nodeHeight = target.node.height() || 0
        
        // Get object center
        const objCenterX = target.transform.x + (nodeWidth * (target.transform.scaleX || 1)) / 2
        const objCenterY = target.transform.y + (nodeHeight * (target.transform.scaleY || 1)) / 2
        
        // Calculate new position
        const newCenterX = centerX + (objCenterX - centerX) * relativeScaleX
        const newCenterY = centerY + (objCenterY - centerY) * relativeScaleY
        
        const newX = newCenterX - (nodeWidth * newScaleX) / 2
        const newY = newCenterY - (nodeHeight * newScaleY) / 2
        
        // Update transform
        target.transform = {
          ...target.transform,
          x: newX,
          y: newY,
          scaleX: newScaleX,
          scaleY: newScaleY
        }
        
        // Update Konva node
        target.node.setAttrs({
          x: newX,
          y: newY,
          scaleX: newScaleX,
          scaleY: newScaleY
        })
        
        const after = { ...target.transform }
        transformedObjects.push({ objectId: target.id, before, after })
      }
      
      // Redraw all affected layers
      const affectedLayers = new Set<string>()
      for (const target of targets) {
        const layer = this.findLayerForObject(target)
        if (layer) {
          affectedLayers.add(layer.id)
        }
      }
      
      const canvas = this.getCanvas()
      for (const layerId of affectedLayers) {
        const layer = canvas.state.layers.find(l => l.id === layerId)
        if (layer) {
          layer.konvaLayer.batchDraw()
        }
      }
      
      // Emit event if in ExecutionContext
      if (this.executionContext && transformedObjects.length > 0) {
        await this.executionContext.emit(new ObjectsTransformedEvent(
          'canvas',
          transformedObjects.map(t => ({
            objectId: t.objectId,
            previousTransform: { ...t.before } as unknown as Record<string, unknown>,
            newTransform: { ...t.after } as unknown as Record<string, unknown>
          })),
          this.executionContext.getMetadata()
        ))
      }
      
      // Update state
      this.lastScaleX = scaleX
      this.lastScaleY = scaleY
      
    } finally {
      this.isResizing = false
    }
  }
  
  /**
   * Get target objects based on selection
   */
  private getTargetObjects(): CanvasObject[] {
    const canvas = this.getCanvas()
    const selection = canvas.state.selection
    
    if (selection?.type === 'objects') {
      // Resize selected objects
      return selection.objectIds
        .map(id => this.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null && !obj.locked)
    } else {
      // Resize all objects on active layer
      const activeLayer = canvas.state.layers.find(l => l.id === canvas.state.activeLayerId)
      if (activeLayer) {
        return activeLayer.objects.filter(obj => !obj.locked && obj.visible)
      }
      return []
    }
  }
  
  /**
   * Find an object by ID
   */
  private findObject(objectId: string): CanvasObject | null {
    const canvas = this.getCanvas()
    for (const layer of canvas.state.layers) {
      const obj = layer.objects.find(o => o.id === objectId)
      if (obj) return obj
    }
    return null
  }
  
  /**
   * Find the layer containing an object
   */
  private findLayerForObject(obj: CanvasObject) {
    const canvas = this.getCanvas()
    return canvas.state.layers.find(layer => 
      layer.objects.some(o => o.id === obj.id)
    )
  }
  
  /**
   * Apply resize for AI operations
   */
  async applyWithContext(
    scalePercentage: number, 
    maintainAspectRatio: boolean = true,
    targetObjects?: CanvasObject[]
  ): Promise<void> {
    if (targetObjects) {
      // Store current targets and apply to specific objects
      const canvas = this.getCanvas()
      const originalSelection = canvas.state.selection
      
      // Temporarily set selection to target objects
      canvas.state.selection = {
        type: 'objects',
        objectIds: targetObjects.map(obj => obj.id)
      }
      
      await this.applyResize('percentage', scalePercentage, scalePercentage, maintainAspectRatio)
      
      // Restore original selection
      canvas.state.selection = originalSelection
    } else {
      await this.applyResize('percentage', scalePercentage, scalePercentage, maintainAspectRatio)
    }
  }
}

// Export singleton instance
export const resizeTool = new ResizeTool() 