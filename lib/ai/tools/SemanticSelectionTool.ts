import { Search } from 'lucide-react'
import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import type { ToolDependencies, ToolOptions } from '@/lib/editor/tools/base/BaseTool'

interface SemanticSelectionOptions extends ToolOptions {
  query: { type: 'string'; default: string }
  threshold: { type: 'number'; default: number; min: 0; max: 1 }
  mode: { type: 'enum'; default: string; enum: string[] }
}

/**
 * Semantic Selection Tool - Natural language object selection
 * Uses AI to understand queries like "select all faces" or "select the red car"
 */
export class SemanticSelectionTool extends ObjectTool {
  // Tool identification
  id = 'ai-semantic-selection'
  name = 'AI Semantic Selection'
  icon = Search
  cursor = 'crosshair'
  
  // Service
  private replicateService: ReplicateService | null = null
  private isProcessing = false
  
  constructor(dependencies: ToolDependencies) {
    super(dependencies)
  }

  protected getOptionDefinitions(): SemanticSelectionOptions {
    return {
      query: { type: 'string', default: '' },
      threshold: { type: 'number', default: 0.3, min: 0, max: 1 },
      mode: { type: 'enum', default: 'new', enum: ['new', 'add', 'subtract', 'intersect'] }
    }
  }

  protected async setupTool(): Promise<void> {
    // Initialize Replicate service (automatically handles server/client routing)
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[SemanticSelectionTool] Failed to initialize Replicate service:', error)
    }
  }

  protected async cleanupTool(): Promise<void> {
    this.replicateService = null
    this.isProcessing = false
  }

  protected handleMouseDown(event: ToolEvent): void {
    const query = this.getOption('query')
    if (!query) {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        message: 'Please enter a search query first',
        type: 'warning'
      })
      return
    }
    
    this.performSemanticSelection(query)
  }

  protected handleMouseMove(_event: ToolEvent): void {
    // No mouse move handling for semantic selection
  }

  protected handleMouseUp(_event: ToolEvent): void {
    // No mouse up handling for semantic selection
  }

  private async performSemanticSelection(query: string): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    const threshold = this.getOption('threshold')
    const mode = this.getOption('mode')
    
    try {
      this.dependencies.eventBus.emit('ai.processing.started', {
        operationId: `${this.id}-${Date.now()}`,
        type: 'semantic-selection',
        metadata: {
          toolId: this.id,
          description: `Selecting objects: ${query}`,
          targetObjectIds: []
        }
      })
      
      // Get all visible objects
      const visibleObjects = this.getVisibleObjects()
      
      // For now, implement a simple text-based matching
      // In a real implementation, this would use AI vision models
      const matchingObjects = visibleObjects.filter((obj: CanvasObject) => {
        const searchText = query.toLowerCase()
        const objName = obj.name?.toLowerCase() || ''
        const objType = obj.type.toLowerCase()
        
        return objName.includes(searchText) || objType.includes(searchText)
      })
      
      // Apply selection based on mode
      const canvas = this.dependencies.canvasManager
      const currentSelection = new Set(canvas.state.selectedObjectIds)
      
      switch (mode) {
        case 'new':
          canvas.clearSelection()
          matchingObjects.forEach((obj: CanvasObject) => canvas.selectObject(obj.id))
          break
        case 'add':
          matchingObjects.forEach((obj: CanvasObject) => canvas.selectObject(obj.id))
          break
        case 'subtract':
          matchingObjects.forEach((obj: CanvasObject) => canvas.deselectObject(obj.id))
          break
        case 'intersect':
          const intersection = matchingObjects.filter((obj: CanvasObject) => currentSelection.has(obj.id))
          canvas.clearSelection()
          intersection.forEach((obj: CanvasObject) => canvas.selectObject(obj.id))
          break
      }
      
      this.dependencies.eventBus.emit('ai.processing.completed', {
        operationId: `${this.id}-${Date.now()}`,
        result: {
          toolId: this.id,
          success: true,
          affectedObjectIds: matchingObjects.map((obj: CanvasObject) => obj.id)
        },
        metadata: {
          toolId: this.id
        }
      })
      
    } catch (error) {
      console.error('[SemanticSelectionTool] Selection failed:', error)
      this.dependencies.eventBus.emit('ai.processing.failed', {
        operationId: `${this.id}-${Date.now()}`,
        error: error instanceof Error ? error.message : 'Selection failed',
        metadata: {
          toolId: this.id
        }
      })
    } finally {
      this.isProcessing = false
    }
  }
} 