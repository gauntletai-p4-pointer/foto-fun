import { z } from 'zod'
import { BaseToolAdapter } from '../base'
import type { CanvasContext } from '@/lib/ai/tools/canvas-bridge'
import { createCanvasContextManager } from '@/lib/ai/agents/utils/canvas'
import type { Tool } from '@/types'
import type { CanvasObject } from '@/lib/editor/canvas/types'

// Input schema for canvas selection management
const selectionManagerParameters = z.object({
  action: z.enum(['prepare-for-operation', 'select-objects', 'clear-selection', 'get-info']),
  targetType: z.enum(['image', 'text', 'all']).optional(),
  objectIds: z.array(z.string()).optional()
})

type SelectionManagerInput = z.infer<typeof selectionManagerParameters>

interface SelectionManagerOutput {
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
export class CanvasSelectionManagerAdapter extends BaseToolAdapter<SelectionManagerInput, SelectionManagerOutput> {
  // Create a placeholder tool since this is a utility
  get tool(): Tool {
    return {
      id: 'canvas-selection-manager',
      name: 'Canvas Selection Manager',
      icon: () => null,
      cursor: 'default',
      isImplemented: true
    }
  }
  
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

  metadata = {
    category: 'canvas-editing' as const,
    executionType: 'fast' as const,
    worksOn: 'existing-image' as const
  }

  inputSchema = selectionManagerParameters
  
  async execute(params: SelectionManagerInput, context: CanvasContext): Promise<SelectionManagerOutput> {
    console.log('[CanvasSelectionManager] Execute called with params:', params)
    
    const canvas = context.canvas
    if (!canvas) {
      throw new Error('Canvas is required but not provided in context')
    }
    
    const contextManager = createCanvasContextManager(canvas)
    
    switch (params.action) {
      case 'prepare-for-operation': {
        if (!params.targetType) {
          throw new Error('targetType is required for prepare-for-operation action')
        }
        
        await contextManager.prepareForOperation(params.targetType)
        const selection = canvas.state.selection
        const selectedCount = selection?.type === 'objects' ? selection.objectIds.length : 0
        
        return {
          success: true,
          action: params.action,
          message: `Prepared selection for ${params.targetType} operations. Selected ${selectedCount} object(s).`,
          selectedCount
        }
      }
      
      case 'select-objects': {
        if (!params.objectIds || params.objectIds.length === 0) {
          throw new Error('objectIds are required for select-objects action')
        }
        
        const objectsToSelect: CanvasObject[] = []
        params.objectIds?.forEach(id => {
          const obj = canvas.findObject(id)
          if (obj) objectsToSelect.push(obj)
        })
        
        await contextManager.selectObjects(objectsToSelect)
        
        return {
          success: true,
          action: params.action,
          message: `Selected ${objectsToSelect.length} object(s) by ID.`,
          selectedCount: objectsToSelect.length
        }
      }
      
      case 'clear-selection': {
        await contextManager.clearSelection()
        
        return {
          success: true,
          action: params.action,
          message: 'Cleared all selections.',
          selectedCount: 0
        }
      }
      
      case 'get-info': {
        const allObjects: CanvasObject[] = []
        canvas.state.layers.forEach(layer => {
          allObjects.push(...layer.objects)
        })
        
        const selection = canvas.state.selection
        const activeIds = selection?.type === 'objects' ? Array.from(selection.objectIds) : []
        
        const objectInfo = allObjects.map(obj => {
          return {
            id: obj.id,
            type: obj.type,
            selected: activeIds.includes(obj.id)
          }
        })
        
        return {
          success: true,
          action: params.action,
          message: `Canvas has ${allObjects.length} objects, ${activeIds.length} selected.`,
          selectedCount: activeIds.length,
          objectInfo
        }
      }
      
      default:
        throw new Error(`Unknown action: ${params.action}`)
    }
  }
} 