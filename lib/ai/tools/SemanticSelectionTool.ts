import { Search } from 'lucide-react'
import { ObjectTool } from '@/lib/editor/tools/base/ObjectTool'
import type { CanvasObject } from '@/lib/editor/objects/types'
import type { ToolEvent } from '@/lib/editor/canvas/types'
import { ReplicateService } from '@/lib/ai/services/replicate'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'

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
  private eventBus = new TypedEventBus()
  
  protected setupTool(): void {
    // Initialize Replicate service (automatically handles server/client routing)
    try {
      this.replicateService = new ReplicateService()
    } catch (error) {
      console.error('[SemanticSelectionTool] Failed to initialize Replicate service:', error)
    }
    
    // Set default options
    this.setOption('query', '') // Natural language query
    this.setOption('threshold', 0.3) // Detection confidence threshold
    this.setOption('mode', 'new') // Selection mode: new, add, subtract, intersect
  }
  
  protected cleanupTool(): void {
    this.replicateService = null
    this.isProcessing = false
  }
  
  /**
   * Execute semantic selection
   */
  async executeSelection(query?: string): Promise<void> {
    if (!this.replicateService || this.isProcessing) return
    
    const searchQuery = query || (this.getOption('query') as string)
    if (!searchQuery) {
      console.error('[SemanticSelectionTool] No search query provided')
      return
    }
    
    this.isProcessing = true
    const canvas = this.getCanvas()
    const taskId = `${this.id}-${Date.now()}`
    
    this.eventBus.emit('ai.processing.started', {
      taskId,
      toolId: this.id,
      description: `Semantic selection: ${searchQuery}`,
      targetObjectIds: []
    })
    
    try {
      // Get all visible objects
      const objects = canvas.getAllObjects().filter(obj => obj.visible && !obj.locked)
      const imageObjects = objects.filter(obj => obj.type === 'image')
      
      if (imageObjects.length === 0) {
        console.warn('[SemanticSelectionTool] No image objects to search')
        return
      }
      
      const threshold = this.getOption('threshold') as number
      const mode = this.getOption('mode') as string
      const matchedObjectIds: string[] = []
      
      // Process each image object
      for (const obj of imageObjects) {
        // Show processing state
        await canvas.updateObject(obj.id, {
          metadata: {
            ...obj.metadata,
            isProcessing: true,
            processingType: 'semantic-search'
          }
        })
        
        try {
          // Get image data
          const imageData = await this.getObjectImageDataForReplicate(obj)
          if (!imageData) continue
          
          // Use GroundingDINO or similar for open vocabulary detection
          const detections = await this.detectObjects(imageData, searchQuery, threshold)
          
          // If any detections found, add object to selection
          if (detections && detections.length > 0) {
            matchedObjectIds.push(obj.id)
            
            // Store detection info in metadata
            await canvas.updateObject(obj.id, {
              metadata: {
                ...obj.metadata,
                isProcessing: false,
                lastSemanticSearch: {
                  query: searchQuery,
                  detections: detections,
                  timestamp: new Date().toISOString()
                }
              }
            })
          } else {
            // Clear processing state
            await canvas.updateObject(obj.id, {
              metadata: {
                ...obj.metadata,
                isProcessing: false
              }
            })
          }
        } catch (error) {
          console.error(`[SemanticSelectionTool] Error processing object ${obj.id}:`, error)
          await canvas.updateObject(obj.id, {
            metadata: {
              ...obj.metadata,
              isProcessing: false
            }
          })
        }
      }
      
      // Apply selection based on mode
      this.applySelection(matchedObjectIds, mode)
      
      // Emit tool-specific completion event
      this.eventBus.emit('ai.semantic.selection', {
        taskId,
        toolId: this.id,
        query: searchQuery,
        matchedCount: matchedObjectIds.length,
        objectIds: matchedObjectIds,
        confidence: 0.85 // Mock confidence score for now - TODO: implement real confidence scoring
      })
      
      // Emit general completion event
      this.eventBus.emit('ai.processing.completed', {
        taskId,
        toolId: this.id,
        success: true,
        affectedObjectIds: matchedObjectIds
      })
      
      console.log(`[SemanticSelectionTool] Found ${matchedObjectIds.length} objects matching "${searchQuery}"`)
      
    } catch (error) {
      console.error('[SemanticSelectionTool] Selection failed:', error)
      this.eventBus.emit('ai.processing.failed', {
        taskId,
        toolId: this.id,
        error: error instanceof Error ? error.message : 'Semantic selection failed'
      })
      throw error
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Detect objects in image using AI
   */
  private async detectObjects(
    imageData: import('@/lib/ai/services/replicate').ImageData,
    query: string,
    threshold: number
  ): Promise<Array<{ objectId: string; confidence: number }>> {
    // In a real implementation, this would use GroundingDINO or similar
    // For now, we'll use a mock detection based on the query
    
    // Mock implementation - in production, use actual AI model
    console.log('[SemanticSelectionTool] Mock detection for:', query)
    
    // Simulate detection based on common queries
    const mockDetections = []
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('face') || lowerQuery.includes('person') || lowerQuery.includes('people')) {
      mockDetections.push({
        bbox: [0.2, 0.1, 0.6, 0.7], // Normalized coordinates
        confidence: 0.9,
        label: 'person'
      })
    }
    
    if (lowerQuery.includes('car') || lowerQuery.includes('vehicle')) {
      mockDetections.push({
        bbox: [0.3, 0.4, 0.7, 0.6],
        confidence: 0.85,
        label: 'car'
      })
    }
    
    if (lowerQuery.includes('sky')) {
      mockDetections.push({
        bbox: [0, 0, 1, 0.4],
        confidence: 0.95,
        label: 'sky'
      })
    }
    
    // Filter by confidence threshold and convert to expected format
    return mockDetections
      .filter(d => d.confidence >= threshold)
      .map(d => ({
        objectId: `mock-${d.label}-${Math.random().toString(36).substr(2, 9)}`,
        confidence: d.confidence
      }))
    
    /* Real implementation would be:
    const output = await this.replicateService.run(
      "idea-research/grounding-dino",
      {
        input: {
          image: imageData,
          prompt: query,
          box_threshold: threshold
        }
      }
    )
    return output.detections
    */
  }
  
  /**
   * Apply selection based on mode
   */
  private applySelection(objectIds: string[], mode: string): void {
    const canvas = this.getCanvas()
    const currentSelection = Array.from(canvas.state.selectedObjectIds)
    let finalSelection: string[] = []
    
    switch (mode) {
      case 'new':
        finalSelection = objectIds
        break
      case 'add':
        finalSelection = [...new Set([...currentSelection, ...objectIds])]
        break
      case 'subtract':
        finalSelection = currentSelection.filter(id => !objectIds.includes(id))
        break
      case 'intersect':
        finalSelection = currentSelection.filter(id => objectIds.includes(id))
        break
    }
    
    // Update selection
    if (finalSelection.length === 0) {
      canvas.deselectAll()
    } else if (finalSelection.length === 1) {
      canvas.selectObject(finalSelection[0])
    } else {
      canvas.selectMultiple(finalSelection)
    }
  }
  
  /**
   * Get image data for Replicate
   */
  private async getObjectImageDataForReplicate(object: CanvasObject): Promise<import('@/lib/ai/services/replicate').ImageData | null> {
    if (object.type !== 'image') return null
    
    const imageData = object.data as unknown as import('@/lib/editor/objects/types').ImageData
    if (!imageData || !imageData.element) return null
    
    return {
      element: imageData.element,
      naturalWidth: imageData.naturalWidth,
      naturalHeight: imageData.naturalHeight
    }
  }
  
  async onMouseDown(_event: ToolEvent): Promise<void> {
    // Could show a search dialog on click
    const _canvas = this.getCanvas()
    
    // For now, use the query from options
    const query = this.getOption('query') as string
    if (query) {
      await this.executeSelection(query)
    }
  }
  
  /**
   * Apply semantic selection for AI operations
   */
  async applyWithContext(
    query: string,
    options?: {
      threshold?: number
      mode?: 'new' | 'add' | 'subtract' | 'intersect'
    }
  ): Promise<void> {
    if (!this.replicateService) {
      throw new Error('Replicate service not initialized')
    }
    
    // Set options
    this.setOption('query', query)
    if (options?.threshold !== undefined) {
      this.setOption('threshold', options.threshold)
    }
    if (options?.mode !== undefined) {
      this.setOption('mode', options.mode)
    }
    
    // Execute selection
    await this.executeSelection(query)
  }
}

// Export singleton instance
export const semanticSelectionTool = new SemanticSelectionTool() 