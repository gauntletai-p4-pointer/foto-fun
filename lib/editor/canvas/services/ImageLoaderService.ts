import { nanoid } from 'nanoid'
import { EventEmitter } from 'events'

export interface ImageSource {
  type: 'file' | 'url' | 'blob' | 'dataUrl'
  source: File | string | Blob
  metadata?: {
    name?: string
    expectedDimensions?: { width: number; height: number }
    maxSize?: number
  }
}

export interface LoadedImage {
  id: string
  element: HTMLImageElement
  metadata: {
    width: number
    height: number
    format: string
    size: number
    loadTime: number
  }
  status: 'loading' | 'loaded' | 'failed' | 'validated'
  error?: Error
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface LoadOperation {
  id: string
  source: ImageSource
  priority: number
  retryCount: number
  maxRetries: number
  resolve: (image: LoadedImage) => void
  reject: (error: Error) => void
}

export class ImageLoaderService extends EventEmitter {
  private queue: LoadOperation[] = []
  private processing = false
  private loadedImages = new Map<string, LoadedImage>()
  private activeLoads = new Map<string, AbortController>()
  
  private readonly MAX_CONCURRENT_LOADS = 3
  private readonly RETRY_DELAYS = [100, 500, 1000, 2000]
  
  constructor() {
    super()
  }
  
  /**
   * Load an image with queue management and retry logic
   */
  async loadImage(source: ImageSource, priority = 0): Promise<LoadedImage> {
    return new Promise((resolve, reject) => {
      const operation: LoadOperation = {
        id: nanoid(),
        source,
        priority,
        retryCount: 0,
        maxRetries: this.RETRY_DELAYS.length,
        resolve,
        reject
      }
      
      // Add to queue sorted by priority
      this.queue.push(operation)
      this.queue.sort((a, b) => b.priority - a.priority)
      
      // Start processing if not already
      this.processQueue()
    })
  }
  
  /**
   * Load multiple images in batch
   */
  async loadImages(sources: ImageSource[]): Promise<LoadedImage[]> {
    const promises = sources.map((source, index) => 
      this.loadImage(source, sources.length - index) // Higher priority for earlier images
    )
    return Promise.all(promises)
  }
  
  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0 && this.activeLoads.size < this.MAX_CONCURRENT_LOADS) {
      const operation = this.queue.shift()!
      this.processOperation(operation)
    }
    
    this.processing = false
  }
  
  /**
   * Process a single load operation
   */
  private async processOperation(operation: LoadOperation): Promise<void> {
    const abortController = new AbortController()
    this.activeLoads.set(operation.id, abortController)
    
    try {
      this.emit('loadStart', { id: operation.id, source: operation.source })
      
      const element = await this.createImageElement(operation.source, abortController.signal)
      const loadedImage = await this.validateAndPrepareImage(element, operation.source)
      
      this.loadedImages.set(loadedImage.id, loadedImage)
      this.activeLoads.delete(operation.id)
      
      this.emit('loadComplete', loadedImage)
      operation.resolve(loadedImage)
      
    } catch (error) {
      this.activeLoads.delete(operation.id)
      
      if (operation.retryCount < operation.maxRetries) {
        // Retry with exponential backoff
        const delay = this.RETRY_DELAYS[operation.retryCount]
        operation.retryCount++
        
        this.emit('loadRetry', { 
          id: operation.id, 
          attempt: operation.retryCount,
          delay 
        })
        
        setTimeout(() => {
          this.queue.unshift(operation) // Add back to front of queue
          this.processQueue()
        }, delay)
      } else {
        // Final failure
        const finalError = new Error(
          `Failed to load image after ${operation.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        
        this.emit('loadFailed', { id: operation.id, error: finalError })
        operation.reject(finalError)
      }
    }
    
    // Continue processing queue
    this.processQueue()
  }
  
  /**
   * Create image element from source
   */
  private async createImageElement(
    source: ImageSource, 
    signal: AbortSignal
  ): Promise<HTMLImageElement> {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    return new Promise((resolve, reject) => {
      // Handle abort
      signal.addEventListener('abort', () => {
        reject(new Error('Image load aborted'))
      })
      
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      
      // Set source based on type
      switch (source.type) {
        case 'url':
          img.src = source.source as string
          break
          
        case 'dataUrl':
          img.src = source.source as string
          break
          
        case 'blob':
          img.src = URL.createObjectURL(source.source as Blob)
          break
          
        case 'file':
          const reader = new FileReader()
          reader.onload = (e) => {
            img.src = e.target?.result as string
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(source.source as File)
          break
      }
    })
  }
  
  /**
   * Validate and prepare loaded image
   */
  private async validateAndPrepareImage(
    element: HTMLImageElement,
    source: ImageSource
  ): Promise<LoadedImage> {
    // Wait for decode to ensure image is ready
    await element.decode()
    
    // Extract metadata
    const format = this.detectImageFormat(source)
    const size = await this.getImageSize(source)
    
    const loadedImage: LoadedImage = {
      id: nanoid(),
      element,
      metadata: {
        width: element.naturalWidth,
        height: element.naturalHeight,
        format,
        size,
        loadTime: Date.now()
      },
      status: 'loaded'
    }
    
    // Validate
    const validation = this.validateImage(loadedImage)
    if (!validation.valid) {
      loadedImage.status = 'failed'
      loadedImage.error = new Error(validation.errors.join(', '))
      throw loadedImage.error
    }
    
    loadedImage.status = 'validated'
    return loadedImage
  }
  
  /**
   * Validate loaded image
   */
  validateImage(image: LoadedImage): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check dimensions
    if (image.metadata.width === 0 || image.metadata.height === 0) {
      errors.push('Image has invalid dimensions')
    }
    
    // Check size
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (image.metadata.size > maxSize) {
      errors.push(`Image size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`)
    }
    
    // Check aspect ratio for extreme cases
    const aspectRatio = image.metadata.width / image.metadata.height
    if (aspectRatio > 20 || aspectRatio < 0.05) {
      warnings.push('Image has extreme aspect ratio')
    }
    
    // Check resolution
    const pixels = image.metadata.width * image.metadata.height
    if (pixels > 100_000_000) { // 100 megapixels
      warnings.push('Image resolution is very high, may impact performance')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Detect image format from source
   */
  private detectImageFormat(source: ImageSource): string {
    if (source.type === 'file') {
      const file = source.source as File
      return file.type || 'unknown'
    }
    
    if (source.type === 'dataUrl') {
      const dataUrl = source.source as string
      const match = dataUrl.match(/^data:image\/(\w+);/)
      return match ? `image/${match[1]}` : 'unknown'
    }
    
    return 'unknown'
  }
  
  /**
   * Get image size in bytes
   */
  private async getImageSize(source: ImageSource): Promise<number> {
    if (source.type === 'file') {
      return (source.source as File).size
    }
    
    if (source.type === 'blob') {
      return (source.source as Blob).size
    }
    
    if (source.type === 'dataUrl') {
      // Estimate size from base64
      const base64 = (source.source as string).split(',')[1] || ''
      return Math.floor(base64.length * 0.75)
    }
    
    // For URLs, we can't easily determine size
    return 0
  }
  
  /**
   * Cancel a specific load operation
   */
  cancelLoad(id: string): void {
    const controller = this.activeLoads.get(id)
    if (controller) {
      controller.abort()
      this.activeLoads.delete(id)
    }
    
    // Remove from queue
    this.queue = this.queue.filter(op => op.id !== id)
  }
  
  /**
   * Cancel all pending loads
   */
  cancelAll(): void {
    // Abort all active loads
    for (const [_id, controller] of this.activeLoads) {
      controller.abort()
    }
    this.activeLoads.clear()
    
    // Clear queue
    this.queue = []
  }
  
  /**
   * Get loaded image by ID
   */
  getLoadedImage(id: string): LoadedImage | undefined {
    return this.loadedImages.get(id)
  }
  
  /**
   * Clear cached images
   */
  clearCache(): void {
    this.loadedImages.clear()
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeLoads: this.activeLoads.size,
      cachedImages: this.loadedImages.size,
      processing: this.processing
    }
  }
} 