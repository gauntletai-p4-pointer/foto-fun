import { z } from 'zod'
import { UnifiedToolAdapter, type ObjectCanvasContext } from '../base/UnifiedToolAdapter'
import type { CanvasObject } from '@/lib/editor/objects/types'

// Input schema for canvas selection management
const inputSchema = z.object({
  action: z.enum(['prepare-for-operation', 'select-objects', 'clear-selection', 'get-info']),
  targetType: z.enum(['image', 'text', 'all']).optional(),
  objectIds: z.array(z.string()).optional()
})

type Input = z.infer<typeof inputSchema>

interface Output {
  success: boolean
  action: string
  message: string
  selectedCount: number
  objectInfo?: Array<{
    id: string
    type: string
    selected: boolean
  }>
}

/**
 * Canvas Selection Manager Adapter
 * Manages object selection between workflow steps to ensure operations target the correct objects
 */
export class CanvasSelectionManagerAdapter extends UnifiedToolAdapter<Input, Output> {
  toolId = 'canvas-selection-manager'
  aiName = 'canvasSelectionManager'
  description = `Manage canvas object selection between workflow steps. CRITICAL for multi-step workflows.

Use this tool to:
1. Prepare selection before operations (e.g., select only images before rotating)
2. Clear selection after operations
3. Get information about current objects and selection

Actions:
- prepare-for-operation: Intelligently select objects based on the next operation type
  - targetType: 'image' - Select all images (for rotate, flip, brightness, etc.)
  - targetType: 'text' - Select all text objects
  - targetType: 'all' - Select all objects
- select-objects: Select specific objects by their IDs
- clear-selection: Clear all selections
- get-info: Get information about all objects and current selection

IMPORTANT: Use this BETWEEN steps in workflows, especially:
- After adding text, before image operations
- When switching between different object types
- To ensure operations only affect intended objects`

  inputSchema = inputSchema
  
  async execute(params: Input, context: ObjectCanvasContext): Promise<Output> {
    console.log('[CanvasSelectionManager] Execute called with params:', params)
    
    switch (params.action) {
      case 'prepare-for-operation': {
        if (!params.targetType) {
          throw new Error('targetType is required for prepare-for-operation action')
        }
        
        const allObjects = context.canvas.getAllObjects()
        let objectsToSelect: CanvasObject[] = []
        
        switch (params.targetType) {
          case 'image':
            objectsToSelect = allObjects.filter(obj => obj.type === 'image')
            break
          case 'text':
            objectsToSelect = allObjects.filter(obj => obj.type === 'text')
            break
          case 'all':
            objectsToSelect = allObjects
            break
        }
        
        // Clear current selection and select target objects
        context.canvas.deselectAll()
        for (const obj of objectsToSelect) {
          context.canvas.selectObject(obj.id)
        }
        
        return {
          success: true,
          action: params.action,
          message: `Prepared selection for ${params.targetType} operations. Selected ${objectsToSelect.length} object(s).`,
          selectedCount: objectsToSelect.length
        }
      }
      
      case 'select-objects': {
        if (!params.objectIds || params.objectIds.length === 0) {
          throw new Error('objectIds are required for select-objects action')
        }
        
        const allObjects = context.canvas.getAllObjects()
        const validObjectIds = params.objectIds.filter(id => 
          allObjects.some(obj => obj.id === id)
        )
        
        // Clear current selection and select specified objects
        context.canvas.deselectAll()
        for (const id of validObjectIds) {
          context.canvas.selectObject(id)
        }
        
        return {
          success: true,
          action: params.action,
          message: `Selected ${validObjectIds.length} object(s) by ID.`,
          selectedCount: validObjectIds.length
        }
      }
      
      case 'clear-selection': {
        context.canvas.deselectAll()
        
        return {
          success: true,
          action: params.action,
          message: 'Cleared all selections.',
          selectedCount: 0
        }
      }
      
      case 'get-info': {
        const allObjects = context.canvas.getAllObjects()
        const selectedObjects = context.canvas.getSelectedObjects()
        const selectedIds = new Set(selectedObjects.map((obj: CanvasObject) => obj.id))
        
        const objectInfo = allObjects.map(obj => ({
          id: obj.id,
          type: obj.type,
          selected: selectedIds.has(obj.id)
        }))
        
        return {
          success: true,
          action: params.action,
          message: `Canvas has ${allObjects.length} objects, ${selectedObjects.length} selected.`,
          selectedCount: selectedObjects.length,
          objectInfo
        }
      }
      
      default:
        throw new Error(`Unknown action: ${params.action}`)
    }
  }
} 