import { RotateCw } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { BaseTool } from '../base/BaseTool'
import type { ToolEvent, Point, CanvasObject, Transform } from '@/lib/editor/canvas/types'
import { ObjectsTransformedEvent } from '@/lib/events/canvas/ToolEvents'

/**
 * Rotate Tool - Rotation with pixel interpolation
 * Konva implementation with visual rotation handles
 */
export class RotateTool extends BaseTool {
  // Tool identification
  id = TOOL_IDS.ROTATE
  name = 'Rotate'
  icon = RotateCw
  cursor = 'default'
  shortcut = 'R'
  
  // Rotation state
  private isRotating = false
  private rotationCenter: Point | null = null
  private startAngle = 0
  private currentRotation = 0
  private rotationTransformer: Konva.Transformer | null = null
  private selectedObjects: CanvasObject[] = []
  private originalTransforms: Map<string, Transform> = new Map()
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Create transformer for rotation handles
    this.rotationTransformer = new Konva.Transformer({
      enabledAnchors: [], // No resize anchors, only rotation
      rotateEnabled: true,
      borderStroke: '#0066ff',
      borderStrokeWidth: 2,
      rotateAnchorOffset: 30,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315], // Snap to 45-degree increments
      rotationSnapTolerance: 5
    })
    
    // Use the existing overlay layer
    const stage = canvas.konvaStage
    // The CanvasManager has an overlayLayer at index 2 (after background and selection layers)
    const overlayLayer = stage.children[2] as Konva.Layer
    
    if (overlayLayer) {
      overlayLayer.add(this.rotationTransformer)
    }
    
    // Set up transformer events
    this.rotationTransformer.on('transformstart', () => {
      this.handleRotationStart()
    })
    
    this.rotationTransformer.on('transform', () => {
      this.handleRotationUpdate()
    })
    
    this.rotationTransformer.on('transformend', () => {
      this.handleRotationEnd()
    })
    
    // Initialize with current selection
    this.updateSelection()
    
    // Set default rotation value
    this.setOption('angle', 0)
    this.setOption('quickRotate', null)
  }
  
  protected cleanupTool(): void {
    // Remove transformer
    if (this.rotationTransformer) {
      this.rotationTransformer.destroy()
      this.rotationTransformer = null
    }
    
    // Reset state
    this.isRotating = false
    this.rotationCenter = null
    this.selectedObjects = []
    this.originalTransforms.clear()
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'quickRotate' && typeof value === 'number') {
      // Quick rotate buttons (-90, +90, etc.)
      this.applyRotation(value, true)
      this.setOption('quickRotate', null) // Reset button
    } else if (key === 'angle' && typeof value === 'number') {
      // Direct angle input
      const delta = value - this.currentRotation
      if (Math.abs(delta) > 0.01) {
        this.applyRotation(delta, true)
      }
    }
  }
  
  onMouseDown(event: ToolEvent): void {
    if (this.isRotating) return
    
    const canvas = this.getCanvas()
    const target = canvas.getObjectAtPoint(event.point)
    
    if (target && !target.locked) {
      // Select the object
      canvas.setSelection({
        type: 'objects',
        objectIds: [target.id]
      })
      
      this.updateSelection()
    }
  }
  
  /**
   * Update selection and transformer
   */
  private updateSelection(): void {
    const canvas = this.getCanvas()
    const selection = canvas.state.selection
    
    if (!this.rotationTransformer) return
    
    if (selection?.type === 'objects' && selection.objectIds.length > 0) {
      // Get selected objects
      this.selectedObjects = selection.objectIds
        .map(id => this.findObject(id))
        .filter((obj): obj is CanvasObject => obj !== null && !obj.locked)
      
      if (this.selectedObjects.length > 0) {
        // Attach transformer to selected nodes
        const nodes = this.selectedObjects.map(obj => obj.node)
        this.rotationTransformer.nodes(nodes)
        
        // Calculate rotation center (center of all objects)
        const bounds = this.getSelectionBounds()
        this.rotationCenter = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        }
        
        const layer = this.rotationTransformer.getLayer()
        if (layer) layer.batchDraw()
      } else {
        this.rotationTransformer.nodes([])
      }
    } else {
      this.rotationTransformer.nodes([])
      this.selectedObjects = []
    }
  }
  
  /**
   * Handle rotation start
   */
  private handleRotationStart(): void {
    this.isRotating = true
    
    // Store original transforms
    this.originalTransforms.clear()
    for (const obj of this.selectedObjects) {
      this.originalTransforms.set(obj.id, { ...obj.transform })
    }
    
    // Calculate start angle
    const canvas = this.getCanvas()
    const pointer = canvas.konvaStage.getPointerPosition()
    if (pointer && this.rotationCenter) {
      this.startAngle = Math.atan2(
        pointer.y - this.rotationCenter.y,
        pointer.x - this.rotationCenter.x
      ) * 180 / Math.PI
    }
  }
  
  /**
   * Handle rotation update
   */
  private handleRotationUpdate(): void {
    if (!this.isRotating || !this.rotationCenter) return
    
    // Update current rotation for UI
    if (this.selectedObjects.length > 0) {
      const node = this.selectedObjects[0].node
      const rotation = node.rotation()
      this.currentRotation = rotation
      this.setOption('angle', Math.round(rotation))
    }
  }
  
  /**
   * Handle rotation end
   */
  private async handleRotationEnd(): Promise<void> {
    if (!this.isRotating) return
    
    this.isRotating = false
    
    // Collect transformation data
    const transformedObjects: Array<{
      objectId: string
      before: Transform
      after: Transform
    }> = []
    
    for (const obj of this.selectedObjects) {
      const before = this.originalTransforms.get(obj.id)
      if (before) {
        // Update object transform from Konva node
        obj.transform.rotation = obj.node.rotation()
        
        transformedObjects.push({
          objectId: obj.id,
          before,
          after: { ...obj.transform }
        })
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
    
    // Clear stored transforms
    this.originalTransforms.clear()
  }
  
  /**
   * Apply rotation programmatically
   */
  async applyRotation(degrees: number, relative: boolean = false): Promise<void> {
    if (this.selectedObjects.length === 0) {
      this.updateSelection()
      if (this.selectedObjects.length === 0) {
        console.warn('[RotateTool] No objects to rotate')
        return
      }
    }
    
    // Store original transforms
    const transformedObjects: Array<{
      objectId: string
      before: Transform
      after: Transform
    }> = []
    
    for (const obj of this.selectedObjects) {
      const before = { ...obj.transform }
      
      // Apply rotation
      if (relative) {
        obj.transform.rotation = (obj.transform.rotation || 0) + degrees
      } else {
        obj.transform.rotation = degrees
      }
      
      // Normalize rotation to 0-360
      obj.transform.rotation = ((obj.transform.rotation % 360) + 360) % 360
      
      // Update Konva node
      obj.node.rotation(obj.transform.rotation)
      
      const after = { ...obj.transform }
      transformedObjects.push({ objectId: obj.id, before, after })
    }
    
    // Update transformer if attached
    if (this.rotationTransformer && this.rotationTransformer.nodes().length > 0) {
      this.rotationTransformer.forceUpdate()
    }
    
    // Redraw affected layers
    const canvas = this.getCanvas()
    const affectedLayers = new Set<string>()
    for (const obj of this.selectedObjects) {
      const layer = this.findLayerForObject(obj)
      if (layer) {
        affectedLayers.add(layer.id)
      }
    }
    
    for (const layerId of affectedLayers) {
      const layer = canvas.state.layers.find(l => l.id === layerId)
      if (layer) {
        layer.konvaLayer.batchDraw()
      }
    }
    
    // Update UI
    this.currentRotation = this.selectedObjects[0]?.transform.rotation || 0
    this.setOption('angle', Math.round(this.currentRotation))
    
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
  }
  
  /**
   * Get bounds of selected objects
   */
  private getSelectionBounds(): { x: number; y: number; width: number; height: number } {
    if (this.selectedObjects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const obj of this.selectedObjects) {
      const rect = obj.node.getClientRect()
      minX = Math.min(minX, rect.x)
      minY = Math.min(minY, rect.y)
      maxX = Math.max(maxX, rect.x + rect.width)
      maxY = Math.max(maxY, rect.y + rect.height)
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
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
   * Apply rotation for AI operations
   */
  async applyWithContext(degrees: number, relative: boolean = true, targetObjects?: CanvasObject[]): Promise<void> {
    if (targetObjects) {
      // Store current selection
      const canvas = this.getCanvas()
      const originalSelection = canvas.state.selection
      
      // Temporarily set selection to target objects
      canvas.state.selection = {
        type: 'objects',
        objectIds: targetObjects.map(obj => obj.id)
      }
      
      this.updateSelection()
      await this.applyRotation(degrees, relative)
      
      // Restore original selection
      canvas.state.selection = originalSelection
      this.updateSelection()
    } else {
      await this.applyRotation(degrees, relative)
    }
  }
}

// Export singleton instance
export const rotateTool = new RotateTool() 