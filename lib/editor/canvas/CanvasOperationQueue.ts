import { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'

interface QueuedOperation {
  id: string
  type: string
  operation: () => Promise<void>
  priority: number
  timestamp: number
}

/**
 * Queue for canvas operations to ensure proper execution order
 * Updated for Konva architecture
 */
export class CanvasOperationQueue {
  private queue: QueuedOperation[] = []
  private isProcessing = false
  private canvasStore: TypedCanvasStore
  
  constructor() {
    this.canvasStore = ServiceContainer.getInstance().get<TypedCanvasStore>('CanvasStore')
    
    // Subscribe to canvas state changes
    this.canvasStore.subscribe((state) => {
      // Process queue when canvas is ready
      if (!state.isLoading && this.queue.length > 0 && !this.isProcessing) {
        this.processQueue()
      }
    })
  }
  
  /**
   * Add operation to queue
   */
  enqueue(operation: () => Promise<void>, type: string, priority = 0): string {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.queue.push({
      id,
      type,
      operation,
      priority,
      timestamp: Date.now()
    })
    
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority)
    
    // Try to process if not already processing
    if (!this.isProcessing) {
      this.processQueue()
    }
    
    return id
  }
  
  /**
   * Process the operation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return
    
    this.isProcessing = true
    
    try {
      while (this.queue.length > 0) {
        const operation = this.queue.shift()!
        
        try {
          await operation.operation()
        } catch (error) {
          console.error(`Operation ${operation.id} (${operation.type}) failed:`, error)
        }
      }
    } finally {
      this.isProcessing = false
    }
  }
  
  /**
   * Clear all pending operations
   */
  clear(): void {
    this.queue = []
  }
  
  /**
   * Get queue status
   */
  getStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.isProcessing
    }
  }
} 