import { z } from 'zod'
import { UnifiedToolAdapter } from '../base/UnifiedToolAdapter'
import type { ObjectCanvasContext } from '../base/UnifiedToolAdapter'

// Input schema for move operations
const moveInputSchema = z.object({
  x: z.number().optional().describe('Target X position in pixels. If not provided, maintains current X.'),
  y: z.number().optional().describe('Target Y position in pixels. If not provided, maintains current Y.'),
  deltaX: z.number().optional().describe('Move by this amount horizontally (positive = right, negative = left)'),
  deltaY: z.number().optional().describe('Move by this amount vertically (positive = down, negative = up)'),
  alignment: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional()
    .describe('Align object to canvas edge or corner'),
  distributeHorizontally: z.boolean().optional().describe('Distribute selected objects evenly horizontally'),
  distributeVertically: z.boolean().optional().describe('Distribute selected objects evenly vertically')
})

type MoveInput = z.infer<typeof moveInputSchema>

interface MoveOutput {
  success: boolean
  movedObjects: number
  positions: Array<{
    id: string
    oldPosition: { x: number; y: number }
    newPosition: { x: number; y: number }
  }>
  message: string
}

/**
 * AI adapter for the Move Tool
 * Enables AI to intelligently position and align objects
 */
export class MoveToolAdapter extends UnifiedToolAdapter<MoveInput, MoveOutput> {
  toolId = 'move'
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

  inputSchema = moveInputSchema
  
  async execute(params: MoveInput, context: ObjectCanvasContext): Promise<MoveOutput> {
    const targets = this.getTargets(context)
    
    if (targets.length === 0) {
      return {
        success: false,
        movedObjects: 0,
        positions: [],
        message: 'No objects to move'
      }
    }
    
    const positions: MoveOutput['positions'] = []
    
    // Handle distribution
    if (params.distributeHorizontally || params.distributeVertically) {
      await this.distributeObjects(targets, params, context, positions)
    } 
    // Handle alignment
    else if (params.alignment) {
      await this.alignObjects(targets, params.alignment, context, positions)
    }
    // Handle position/delta movement
    else {
      await this.moveObjects(targets, params, context, positions)
    }
    
    const message = this.generateMessage(params, positions.length)
    
    return {
      success: true,
      movedObjects: positions.length,
      positions,
      message
    }
  }
  
  private async moveObjects(
    objects: Array<{ id: string; x: number; y: number }>, 
    params: MoveInput, 
    context: ObjectCanvasContext,
    positions: MoveOutput['positions']
  ): Promise<void> {
    for (const obj of objects) {
      const oldPos = { x: obj.x, y: obj.y }
      let newX = obj.x
      let newY = obj.y
      
      // Apply absolute position
      if (params.x !== undefined) newX = params.x
      if (params.y !== undefined) newY = params.y
      
      // Apply delta movement
      if (params.deltaX !== undefined) newX += params.deltaX
      if (params.deltaY !== undefined) newY += params.deltaY
      
      // Update object
      await context.canvas.updateObject(obj.id, {
        x: newX,
        y: newY
      })
      
      positions.push({
        id: obj.id,
        oldPosition: oldPos,
        newPosition: { x: newX, y: newY }
      })
    }
  }
  
  private async alignObjects(
    objects: Array<{ id: string; x: number; y: number; width: number; height: number }>,
    alignment: string,
    context: ObjectCanvasContext,
    positions: MoveOutput['positions']
  ): Promise<void> {
    const canvasWidth = context.canvas.state.canvasWidth
    const canvasHeight = context.canvas.state.canvasHeight
    
    for (const obj of objects) {
      const oldPos = { x: obj.x, y: obj.y }
      let newX = obj.x
      let newY = obj.y
      
      // Calculate new position based on alignment
      switch (alignment) {
        case 'left': newX = 0; break
        case 'center': newX = (canvasWidth - obj.width) / 2; break
        case 'right': newX = canvasWidth - obj.width; break
        case 'top': newY = 0; break
        case 'middle': newY = (canvasHeight - obj.height) / 2; break
        case 'bottom': newY = canvasHeight - obj.height; break
        case 'top-left': newX = 0; newY = 0; break
        case 'top-right': newX = canvasWidth - obj.width; newY = 0; break
        case 'bottom-left': newX = 0; newY = canvasHeight - obj.height; break
        case 'bottom-right': newX = canvasWidth - obj.width; newY = canvasHeight - obj.height; break
      }
      
      // Update object
      await context.canvas.updateObject(obj.id, {
        x: newX,
        y: newY
      })
      
      positions.push({
        id: obj.id,
        oldPosition: oldPos,
        newPosition: { x: newX, y: newY }
      })
    }
  }
  
  private async distributeObjects(
    objects: Array<{ id: string; x: number; y: number }>,
    params: MoveInput,
    context: ObjectCanvasContext,
    positions: MoveOutput['positions']
  ): Promise<void> {
    if (objects.length < 2) return
    
    // Sort objects by position
    const sortedObjects = [...objects].sort((a, b) => 
      params.distributeHorizontally ? a.x - b.x : a.y - b.y
    )
    
    // Calculate spacing
    const first = sortedObjects[0]
    const last = sortedObjects[sortedObjects.length - 1]
    
    if (params.distributeHorizontally) {
      const totalWidth = last.x - first.x
      const spacing = totalWidth / (objects.length - 1)
      
      for (let i = 1; i < sortedObjects.length - 1; i++) {
        const obj = sortedObjects[i]
        const oldPos = { x: obj.x, y: obj.y }
        const newX = first.x + spacing * i
        
        await context.canvas.updateObject(obj.id, {
          x: newX
        })
        
        positions.push({
          id: obj.id,
          oldPosition: oldPos,
          newPosition: { x: newX, y: obj.y }
        })
      }
    }
    
    if (params.distributeVertically) {
      const totalHeight = last.y - first.y
      const spacing = totalHeight / (objects.length - 1)
      
      for (let i = 1; i < sortedObjects.length - 1; i++) {
        const obj = sortedObjects[i]
        const oldPos = { x: obj.x, y: obj.y }
        const newY = first.y + spacing * i
        
        await context.canvas.updateObject(obj.id, {
          y: newY
        })
        
        positions.push({
          id: obj.id,
          oldPosition: oldPos,
          newPosition: { x: obj.x, y: newY }
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
} 