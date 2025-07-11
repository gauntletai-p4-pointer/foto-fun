import { RotateCw } from 'lucide-react'
import Konva from 'konva'
import { TOOL_IDS } from '@/constants'
import { ObjectTool } from '../base/ObjectTool'
import type { ToolEvent, Point } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Rotate Tool - Object rotation with visual handles
 * Supports snap angles and batch rotation
 */
export class RotateTool extends ObjectTool {
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
  private overlayLayer: Konva.Layer | null = null
  private originalRotations: Map<string, number> = new Map()
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    
    // Get overlay layer
    this.overlayLayer = stage.children[stage.children.length - 1] as Konva.Layer
    
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
    
    if (this.overlayLayer) {
      this.overlayLayer.add(this.rotationTransformer)
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
    this.originalRotations.clear()
    this.overlayLayer = null
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (key === 'quickRotate' && typeof value === 'number') {
      // Quick rotate buttons (-90, +90, etc.)
      this.applyRotation(value, true)
      this.setOption('quickRotate', null) // Reset button
    } else if (key === 'angle' && typeof value === 'number') {
      // Direct angle input
      const selectedObjects = this.getTargetObjects()
      if (selectedObjects.length > 0) {
        const currentAvgRotation = selectedObjects.reduce((sum, obj) => sum + obj.rotation, 0) / selectedObjects.length
        const delta = value - currentAvgRotation
        if (Math.abs(delta) > 0.01) {
          this.applyRotation(delta, true)
        }
      }
    }
  }
  
  onMouseDown(event: ToolEvent): void {
    if (this.isRotating) return
    
    const canvas = this.getCanvas()
    const clickedObject = canvas.getObjectAtPoint(event.point)
    
    if (clickedObject && !clickedObject.locked) {
      // Select the object
      canvas.selectObject(clickedObject.id)
      this.updateSelection()
    }
  }
  
  /**
   * Update selection and transformer
   */
  private updateSelection(): void {
    const canvas = this.getCanvas()
    const selectedObjects = this.getTargetObjects()
    
    if (!this.rotationTransformer) return
    
    if (selectedObjects.length > 0) {
      // Get Konva nodes for selected objects
      const nodes: Konva.Node[] = []
      const stage = canvas.konvaStage
      
      selectedObjects.forEach(obj => {
        const node = stage.findOne(`#${obj.id}`)
        if (node) {
          nodes.push(node)
        }
      })
      
      if (nodes.length > 0) {
        // Attach transformer to selected nodes
        this.rotationTransformer.nodes(nodes)
        
        // Calculate rotation center (center of all objects)
        const bounds = this.getSelectionBounds(selectedObjects)
        this.rotationCenter = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        }
        
        // Update current rotation display
        this.currentRotation = selectedObjects[0]?.rotation || 0
        this.setOption('angle', Math.round(this.currentRotation))
      } else {
        this.rotationTransformer.nodes([])
      }
    } else {
      this.rotationTransformer.nodes([])
    }
    
    if (this.overlayLayer) {
      this.overlayLayer.batchDraw()
    }
  }
  
  /**
   * Handle rotation start
   */
  private handleRotationStart(): void {
    this.isRotating = true
    
    // Store original rotations
    this.originalRotations.clear()
    const selectedObjects = this.getTargetObjects()
    for (const obj of selectedObjects) {
      this.originalRotations.set(obj.id, obj.rotation)
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
    
    const canvas = this.getCanvas()
    const selectedObjects = this.getTargetObjects()
    
    // Update current rotation for UI
    if (selectedObjects.length > 0) {
      const stage = canvas.konvaStage
      const node = stage.findOne(`#${selectedObjects[0].id}`)
      if (node) {
        const rotation = node.rotation()
        this.currentRotation = rotation
        this.setOption('angle', Math.round(rotation))
        
        // Update object rotation in real-time
        canvas.updateObject(selectedObjects[0].id, {
          rotation: rotation
        })
      }
    }
  }
  
  /**
   * Handle rotation end
   */
  private async handleRotationEnd(): Promise<void> {
    if (!this.isRotating) return
    
    this.isRotating = false
    
    const canvas = this.getCanvas()
    const selectedObjects = this.getTargetObjects()
    
    // Update all selected objects with their final rotations
    for (const obj of selectedObjects) {
      const node = canvas.konvaStage.findOne(`#${obj.id}`)
      if (node) {
        await canvas.updateObject(obj.id, {
          rotation: node.rotation()
        })
      }
    }
    
    // Clear stored rotations
    this.originalRotations.clear()
  }
  
  /**
   * Apply rotation programmatically
   */
  async applyRotation(degrees: number, relative: boolean = false): Promise<void> {
    const canvas = this.getCanvas()
    const selectedObjects = this.getTargetObjects()
    
    if (selectedObjects.length === 0) {
      console.warn('[RotateTool] No objects to rotate')
      return
    }
    
    for (const obj of selectedObjects) {
      let newRotation: number
      
      if (relative) {
        newRotation = (obj.rotation || 0) + degrees
      } else {
        newRotation = degrees
      }
      
      // Normalize rotation to 0-360
      newRotation = ((newRotation % 360) + 360) % 360
      
      // Update object
      await canvas.updateObject(obj.id, {
        rotation: newRotation
      })
    }
    
    // Update transformer if attached
    if (this.rotationTransformer && this.rotationTransformer.nodes().length > 0) {
      this.rotationTransformer.forceUpdate()
    }
    
    // Update UI
    this.currentRotation = selectedObjects[0]?.rotation || 0
    this.setOption('angle', Math.round(this.currentRotation))
    
    // Redraw
    canvas.konvaStage.batchDraw()
  }
  
  /**
   * Get bounds of selected objects
   */
  private getSelectionBounds(objects: CanvasObject[]): { x: number; y: number; width: number; height: number } {
    if (objects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    for (const obj of objects) {
      // Calculate rotated bounds
      const corners = this.getRotatedCorners(obj)
      
      for (const corner of corners) {
        minX = Math.min(minX, corner.x)
        minY = Math.min(minY, corner.y)
        maxX = Math.max(maxX, corner.x)
        maxY = Math.max(maxY, corner.y)
      }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }
  
  /**
   * Get rotated corners of an object
   */
  private getRotatedCorners(obj: CanvasObject): Point[] {
    const cx = obj.x + (obj.width * obj.scaleX) / 2
    const cy = obj.y + (obj.height * obj.scaleY) / 2
    const angle = (obj.rotation || 0) * Math.PI / 180
    
    const corners = [
      { x: obj.x, y: obj.y },
      { x: obj.x + obj.width * obj.scaleX, y: obj.y },
      { x: obj.x + obj.width * obj.scaleX, y: obj.y + obj.height * obj.scaleY },
      { x: obj.x, y: obj.y + obj.height * obj.scaleY }
    ]
    
    // Rotate each corner around center
    return corners.map(corner => {
      const dx = corner.x - cx
      const dy = corner.y - cy
      return {
        x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
      }
    })
  }
  
  /**
   * Apply rotation for AI operations
   */
  async applyWithContext(degrees: number, relative: boolean = true, targetObjectIds?: string[]): Promise<void> {
    const canvas = this.getCanvas()
    
    if (targetObjectIds) {
      // Store current selection
      const originalSelection = Array.from(canvas.state.selectedObjectIds)
      
      // Temporarily set selection to target objects
      canvas.selectMultiple(targetObjectIds)
      this.updateSelection()
      
      await this.applyRotation(degrees, relative)
      
      // Restore original selection
      if (originalSelection.length > 0) {
        canvas.selectMultiple(originalSelection)
      } else {
        canvas.deselectAll()
      }
      this.updateSelection()
    } else {
      await this.applyRotation(degrees, relative)
    }
  }
}

// Export singleton instance
export const rotateTool = new RotateTool() 