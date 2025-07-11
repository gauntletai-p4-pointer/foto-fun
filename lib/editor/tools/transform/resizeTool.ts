import { Maximize2 } from 'lucide-react'
import { TOOL_IDS } from '@/constants'
import { ObjectTool } from '../base/ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { Transform } from '@/lib/editor/canvas/types'
import { ObjectsTransformedEvent } from '@/lib/events/canvas/ToolEvents'
import Konva from 'konva'

/**
 * Resize Tool - Smart resizing with quality options for objects
 * Works with object-based architecture
 */
export class ResizeTool extends ObjectTool {
  // Tool identification
  id = TOOL_IDS.RESIZE
  name = 'Resize'
  icon = Maximize2
  cursor = 'default'
  shortcut = 'S'
  
  // Track resize state
  private isResizing = false
  private transformer: Konva.Transformer | null = null
  
  protected setupTool(): void {
    const canvas = this.getCanvas()
    
    // Initialize tool options
    this.setOption('mode', 'percentage') // 'percentage' or 'absolute'
    this.setOption('percentage', 100)
    this.setOption('width', 100)
    this.setOption('height', 100)
    this.setOption('maintainAspectRatio', true)
    this.setOption('anchorPoint', 'center') // 'center', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight'
    
    // Create transformer for visual feedback
    const stage = canvas.konvaStage
    const overlayLayer = stage.children[2] as Konva.Layer
    
    this.transformer = new Konva.Transformer({
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      boundBoxFunc: (oldBox, newBox) => {
        // Maintain aspect ratio if enabled
        if (this.getOption('maintainAspectRatio')) {
          const aspectRatio = oldBox.width / oldBox.height
          const newAspectRatio = newBox.width / newBox.height
          
          if (newAspectRatio > aspectRatio) {
            newBox.height = newBox.width / aspectRatio
          } else {
            newBox.width = newBox.height * aspectRatio
          }
        }
        return newBox
      }
    })
    
    overlayLayer.add(this.transformer)
    
    // Update transformer when selection changes
    this.updateTransformer()
  }
  
  protected cleanupTool(): void {
    // Clean up transformer
    if (this.transformer) {
      this.transformer.destroy()
      this.transformer = null
    }
    
    // Reset state
    this.isResizing = false
  }
  
  /**
   * Update transformer based on selected objects
   */
  private updateTransformer(): void {
    if (!this.transformer) return
    
    const targets = this.getTargetObjects()
    const canvas = this.getCanvas()
    const stage = canvas.konvaStage
    const mainLayer = stage.children[1] as Konva.Layer
    
    if (targets.length === 0) {
      this.transformer.nodes([])
    } else {
      // Find Konva nodes for selected objects
      const nodes: Konva.Node[] = []
      for (const target of targets) {
        const node = mainLayer.findOne(`#${target.id}`)
        if (node) {
          nodes.push(node)
        }
      }
      this.transformer.nodes(nodes)
    }
    
    const overlayLayer = stage.children[2] as Konva.Layer
    overlayLayer.batchDraw()
  }
  
  protected onOptionChange(key: string, value: unknown): void {
    if (this.isResizing) return
    
    const mode = this.getOption('mode') as string
    const maintainAspectRatio = this.getOption('maintainAspectRatio') as boolean
    
    if (mode === 'percentage' && key === 'percentage') {
      const percentage = value as number
      this.applyResize(percentage / 100, percentage / 100, maintainAspectRatio)
    } else if (mode === 'absolute' && (key === 'width' || key === 'height')) {
      const width = this.getOption('width') as number
      const height = this.getOption('height') as number
      
      // Get first selected object to calculate scale
      const targets = this.getTargetObjects()
      if (targets.length > 0) {
        const target = targets[0]
        const scaleX = width / target.width
        const scaleY = height / target.height
        this.applyResize(scaleX, scaleY, maintainAspectRatio)
      }
    }
  }
  
  /**
   * Apply resize transformation
   */
  async applyResize(
    scaleX: number,
    scaleY: number,
    maintainAspectRatio: boolean
  ): Promise<void> {
    if (this.isResizing) return
    
    this.isResizing = true
    
    try {
      const targets = this.getTargetObjects()
      const canvas = this.getCanvas()
      
      if (targets.length === 0) {
        console.warn('[ResizeTool] No objects to resize')
        return
      }
      
      // Maintain aspect ratio if needed
      if (maintainAspectRatio) {
        const scale = Math.min(scaleX, scaleY)
        scaleX = scale
        scaleY = scale
      }
      
      const transformedObjects: Array<{
        objectId: string
        before: Partial<CanvasObject>
        after: Partial<CanvasObject>
      }> = []
      
      const anchorPoint = this.getOption('anchorPoint') as string
      
      // Apply resize to each target
      for (const target of targets) {
        const before = {
          x: target.x,
          y: target.y,
          width: target.width,
          height: target.height,
          scaleX: target.scaleX,
          scaleY: target.scaleY
        }
        
        // Calculate new dimensions
        const newWidth = target.width * scaleX
        const newHeight = target.height * scaleY
        
        // Calculate new position based on anchor point
        let newX = target.x
        let newY = target.y
        
        switch (anchorPoint) {
          case 'center':
            newX = target.x + (target.width - newWidth) / 2
            newY = target.y + (target.height - newHeight) / 2
            break
          case 'topRight':
            newX = target.x + (target.width - newWidth)
            // newY stays the same
            break
          case 'bottomLeft':
            // newX stays the same
            newY = target.y + (target.height - newHeight)
            break
          case 'bottomRight':
            newX = target.x + (target.width - newWidth)
            newY = target.y + (target.height - newHeight)
            break
          // 'topLeft' is default - position doesn't change
        }
        
        // Update object
        const updates = {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          scaleX: target.scaleX * scaleX,
          scaleY: target.scaleY * scaleY
        }
        
        await canvas.updateObject(target.id, updates)
        
        const after = { ...updates }
        transformedObjects.push({ objectId: target.id, before, after })
      }
      
      // Update transformer
      this.updateTransformer()
      
      // Emit event if in ExecutionContext
      if (this.executionContext && transformedObjects.length > 0) {
        await this.executionContext.emit(new ObjectsTransformedEvent(
          'canvas',
          transformedObjects.map(t => ({
            objectId: t.objectId,
            previousTransform: t.before as Record<string, unknown>,
            newTransform: t.after as Record<string, unknown>
          })),
          this.executionContext.getMetadata()
        ))
      }
      
    } finally {
      this.isResizing = false
    }
  }
  
  onMouseDown(): void {
    // Update transformer when clicking
    this.updateTransformer()
  }
  
  onActivate(canvas: import('@/lib/editor/canvas/types').CanvasManager): void {
    super.onActivate(canvas)
    // Update transformer when tool is activated
    this.updateTransformer()
    
    // Listen for selection changes
    canvas.on?.('selection:changed', () => this.updateTransformer())
  }
  
  onDeactivate(canvas: import('@/lib/editor/canvas/types').CanvasManager): void {
    super.onDeactivate(canvas)
    // Remove event listeners
    canvas.off?.('selection:changed', () => this.updateTransformer())
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
      // Store current selection and apply to specific objects
      const canvas = this.getCanvas()
      const originalSelection = Array.from(canvas.state.selectedObjectIds)
      
      // Temporarily set selection to target objects
      canvas.selectMultiple(targetObjects.map(obj => obj.id))
      
      await this.applyResize(scalePercentage / 100, scalePercentage / 100, maintainAspectRatio)
      
      // Restore original selection
      if (originalSelection.length === 0) {
        canvas.deselectAll()
      } else {
        canvas.selectMultiple(originalSelection)
      }
    } else {
      await this.applyResize(scalePercentage / 100, scalePercentage / 100, maintainAspectRatio)
    }
  }
}

// Export singleton instance
export const resizeTool = new ResizeTool() 