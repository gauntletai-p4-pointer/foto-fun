import type { CanvasManager } from './CanvasManager'
import type { TypedCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'

/**
 * Manages queued canvas operations for performance optimization
 * Uses dependency injection for store access
 */
export class CanvasOperationQueue {
  private queue: { operation: () => Promise<unknown>; resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = []
  private isProcessing = false
  private canvasManager: CanvasManager
  private canvasStore: TypedCanvasStore
  
  constructor(canvasManager: CanvasManager, canvasStore: TypedCanvasStore) {
    this.canvasManager = canvasManager
    this.canvasStore = canvasStore
  }
  
  /**
   * Add an operation to the queue
   */
  enqueue(operation: () => Promise<unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject })
      this.processQueue()
    })
  }
  
  /**
   * Process the next operation in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }
    
    this.isProcessing = true
    
    while (this.queue.length > 0) {
      const { operation, resolve, reject } = this.queue.shift()!
      
      try {
        const result = await operation()
        resolve(result)
      } catch (error) {
        reject(error)
      }
    }
    
    this.isProcessing = false
  }
  
  /**
   * Clear all queued operations
   */
  clear(): void {
    this.queue = []
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.isProcessing
    }
  }
} 