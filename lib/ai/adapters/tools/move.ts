import { z } from 'zod'
import { CanvasToolAdapter } from '../base'
import { moveTool } from '@/lib/editor/tools/transform/moveTool'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'
import type { CanvasObject } from '@/lib/editor/canvas/types'

// Input schema for move operations
const moveParameters = z.object({
  x: z.number().optional().describe('Target X position in pixels. If not provided, maintains current X.'),
  y: z.number().optional().describe('Target Y position in pixels. If not provided, maintains current Y.'),
  deltaX: z.number().optional().describe('Move by this amount horizontally (positive = right, negative = left)'),
  deltaY: z.number().optional().describe('Move by this amount vertically (positive = down, negative = up)'),
  alignment: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional()
    .describe('Align object to canvas edge or corner'),
  distributeHorizontally: z.boolean().optional().describe('Distribute selected objects evenly horizontally'),
  distributeVertically: z.boolean().optional().describe('Distribute selected objects evenly vertically')
})

type MoveInput = z.infer<typeof moveParameters>

interface MoveOutput {
  success: boolean
  movedObjects: number
  positions: Array<{
    id: string
    oldPosition: { x: number; y: number }
    newPosition: { x: number; y: number }
  }>
  message?: string
}

/**
 * AI adapter for the Move Tool
 * Enables AI to intelligently position and align objects
 */
export class MoveToolAdapter extends CanvasToolAdapter<MoveInput, MoveOutput> {
  tool = moveTool
  aiName = 'moveObjects'
  description = `Move, position, and align objects on the canvas.

CAPABILITIES:
- Move to exact position: specify x and/or y coordinates
- Move by delta: use deltaX/deltaY to move relative to current position
- Align to edges: use alignment parameter (e.g., "top-right", "center")
- Distribute objects: space multiple objects evenly

INTELLIGENT POSITIONING:
- "Move to top right" → alignment: "top-right"
- "Move down 50 pixels" → deltaY: 50
- "Center the logo" → alignment: "center"
- "Move to (100, 200)" → x: 100, y: 200
- "Space evenly horizontally" → distributeHorizontally: true

The tool works on selected objects or all objects if none selected.`

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = moveParameters
  
  protected getActionVerb(): string {
    return 'move'
  }
  
  async execute(params: MoveInput, context: CanvasContext, executionContext?: ExecutionContext): Promise<MoveOutput> {
    return this.executeWithCommonPatterns(
      params,
      context,
      async (images) => {
        const canvas = context.canvas
        const positions: MoveOutput['positions'] = []
        
        // Get objects to move
        const objectsToMove = images.length > 0 ? images : canvas.state.layers.flatMap(l => l.objects)
        
        if (objectsToMove.length === 0) {
          throw new Error('No objects to move')
        }
        
        // Handle distribution
        if (params.distributeHorizontally || params.distributeVertically) {
          await this.distributeObjects(objectsToMove, params, canvas, positions)
        } 
        // Handle alignment
        else if (params.alignment) {
          await this.alignObjects(objectsToMove, params.alignment, canvas, positions)
        }
        // Handle position/delta movement
        else {
          await this.moveObjects(objectsToMove, params, canvas, positions)
        }
        
        const message = this.generateMessage(params, positions.length)
        
        return {
          movedObjects: positions.length,
          positions,
          message
        }
      },
      executionContext
    )
  }
  
  private async moveObjects(
    objects: CanvasObject[], 
    params: MoveInput, 
    canvas: any,
    positions: MoveOutput['positions']
  ): Promise<void> {
    for (const obj of objects) {
      const oldPos = { x: obj.transform.x, y: obj.transform.y }
      let newX = obj.transform.x
      let newY = obj.transform.y
      
      // Apply absolute position
      if (params.x !== undefined) newX = params.x
      if (params.y !== undefined) newY = params.y
      
      // Apply delta movement
      if (params.deltaX !== undefined) newX += params.deltaX
      if (params.deltaY !== undefined) newY += params.deltaY
      
      // Update object
      await canvas.updateObject(obj.id, {
        transform: { ...obj.transform, x: newX, y: newY }
      })
      
      positions.push({
        id: obj.id,
        oldPosition: oldPos,
        newPosition: { x: newX, y: newY }
      })
    }
  }
  
  private async alignObjects(
    objects: CanvasObject[],
    alignment: string,
    canvas: any,
    positions: MoveOutput['positions']
  ): Promise<void> {
    const canvasWidth = canvas.state.width
    const canvasHeight = canvas.state.height
    
    for (const obj of objects) {
      const oldPos = { x: obj.transform.x, y: obj.transform.y }
      const objWidth = (obj.node?.width?.() || 0) * (obj.transform.scaleX || 1)
      const objHeight = (obj.node?.height?.() || 0) * (obj.transform.scaleY || 1)
      
      let newX = obj.transform.x
      let newY = obj.transform.y
      
      // Calculate new position based on alignment
      switch (alignment) {
        case 'left': newX = 0; break
        case 'center': newX = (canvasWidth - objWidth) / 2; break
        case 'right': newX = canvasWidth - objWidth; break
        case 'top': newY = 0; break
        case 'middle': newY = (canvasHeight - objHeight) / 2; break
        case 'bottom': newY = canvasHeight - objHeight; break
        case 'top-left': newX = 0; newY = 0; break
        case 'top-right': newX = canvasWidth - objWidth; newY = 0; break
        case 'bottom-left': newX = 0; newY = canvasHeight - objHeight; break
        case 'bottom-right': newX = canvasWidth - objWidth; newY = canvasHeight - objHeight; break
      }
      
      // Update object
      await canvas.updateObject(obj.id, {
        transform: { ...obj.transform, x: newX, y: newY }
      })
      
      positions.push({
        id: obj.id,
        oldPosition: oldPos,
        newPosition: { x: newX, y: newY }
      })
    }
  }
  
  private async distributeObjects(
    objects: CanvasObject[],
    params: MoveInput,
    canvas: any,
    positions: MoveOutput['positions']
  ): Promise<void> {
    if (objects.length < 2) return
    
    // Sort objects by position
    const sortedObjects = [...objects].sort((a, b) => 
      params.distributeHorizontally ? a.transform.x - b.transform.x : a.transform.y - b.transform.y
    )
    
    // Calculate spacing
    const first = sortedObjects[0]
    const last = sortedObjects[sortedObjects.length - 1]
    
    if (params.distributeHorizontally) {
      const totalWidth = last.transform.x - first.transform.x
      const spacing = totalWidth / (objects.length - 1)
      
      for (let i = 1; i < sortedObjects.length - 1; i++) {
        const obj = sortedObjects[i]
        const oldPos = { x: obj.transform.x, y: obj.transform.y }
        const newX = first.transform.x + spacing * i
        
        await canvas.updateObject(obj.id, {
          transform: { ...obj.transform, x: newX }
        })
        
        positions.push({
          id: obj.id,
          oldPosition: oldPos,
          newPosition: { x: newX, y: obj.transform.y }
        })
      }
    }
    
    if (params.distributeVertically) {
      const totalHeight = last.transform.y - first.transform.y
      const spacing = totalHeight / (objects.length - 1)
      
      for (let i = 1; i < sortedObjects.length - 1; i++) {
        const obj = sortedObjects[i]
        const oldPos = { x: obj.transform.x, y: obj.transform.y }
        const newY = first.transform.y + spacing * i
        
        await canvas.updateObject(obj.id, {
          transform: { ...obj.transform, y: newY }
        })
        
        positions.push({
          id: obj.id,
          oldPosition: oldPos,
          newPosition: { x: obj.transform.x, y: newY }
        })
      }
    }
  }
  
  private generateMessage(params: MoveInput, count: number): string {
    if (params.distributeHorizontally || params.distributeVertically) {
      const direction = params.distributeHorizontally ? 'horizontally' : 'vertically'
      return `Distributed ${count} objects evenly ${direction}`
    }
    
    if (params.alignment) {
      return `Aligned ${count} object${count > 1 ? 's' : ''} to ${params.alignment}`
    }
    
    if (params.deltaX !== undefined || params.deltaY !== undefined) {
      const parts = []
      if (params.deltaX) parts.push(`${params.deltaX}px ${params.deltaX > 0 ? 'right' : 'left'}`)
      if (params.deltaY) parts.push(`${params.deltaY}px ${params.deltaY > 0 ? 'down' : 'up'}`)
      return `Moved ${count} object${count > 1 ? 's' : ''} ${parts.join(' and ')}`
    }
    
    return `Moved ${count} object${count > 1 ? 's' : ''} to new position`
  }
  
  canExecute(canvas: { state: { layers: Array<{ objects: Array<unknown> }> } }): boolean {
    return canvas.state.layers.some(layer => layer.objects.length > 0)
  }
} 