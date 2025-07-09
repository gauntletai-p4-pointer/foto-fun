import type { FabricObject } from 'fabric'
import type { BoundingBox } from '@/types'

interface CacheEntry {
  imageData: ImageData
  bounds: BoundingBox
  timestamp: number
}

/**
 * ObjectPixelCache - Efficiently cache rendered pixel data for individual objects
 * 
 * This class manages a cache of rendered object pixels to avoid expensive
 * re-rendering operations. It includes LRU eviction and memory management.
 */
export class ObjectPixelCache {
  private cache: Map<string, CacheEntry>
  private maxCacheSize: number
  private currentCacheSize: number
  private maxAge: number // Max age in milliseconds
  
  constructor(maxCacheSizeMB: number = 100, maxAgeMs: number = 60000) {
    this.cache = new Map()
    this.maxCacheSize = maxCacheSizeMB * 1024 * 1024 // Convert to bytes
    this.currentCacheSize = 0
    this.maxAge = maxAgeMs
  }
  
  /**
   * Get cached pixels for an object, or render and cache if not found
   */
  getObjectPixels(object: FabricObject): ImageData | null {
    const objectId = object.get('id') as string
    if (!objectId) return null
    
    // Check cache
    const cached = this.cache.get(objectId)
    if (cached) {
      // Check if cache is still valid
      if (Date.now() - cached.timestamp < this.maxAge) {
        // Move to end (LRU)
        this.cache.delete(objectId)
        this.cache.set(objectId, cached)
        return cached.imageData
      } else {
        // Cache expired, remove it
        this.invalidateObject(objectId)
      }
    }
    
    // Render object to pixels
    const rendered = this.renderObjectToPixels(object)
    if (rendered) {
      this.addToCache(objectId, rendered.imageData, rendered.bounds)
      return rendered.imageData
    }
    
    return null
  }
  
  /**
   * Invalidate cached data for a specific object
   */
  invalidateObject(objectId: string): void {
    const cached = this.cache.get(objectId)
    if (cached) {
      const size = this.calculateImageDataSize(cached.imageData)
      this.currentCacheSize -= size
      this.cache.delete(objectId)
    }
  }
  
  /**
   * Render an object to pixel data
   */
  renderObjectToPixels(object: FabricObject): { imageData: ImageData; bounds: BoundingBox } | null {
    const bounds = object.getBoundingRect()
    const boundingBox: BoundingBox = {
      x: Math.floor(bounds.left),
      y: Math.floor(bounds.top),
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height)
    }
    
    // Don't render if object has no size
    if (boundingBox.width <= 0 || boundingBox.height <= 0) {
      return null
    }
    
    // Create temporary canvas
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = boundingBox.width
    tempCanvas.height = boundingBox.height
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
    
    if (!tempCtx) return null
    
    // Render object
    tempCtx.save()
    tempCtx.translate(-boundingBox.x, -boundingBox.y)
    object.render(tempCtx)
    tempCtx.restore()
    
    // Get pixel data
    const imageData = tempCtx.getImageData(0, 0, boundingBox.width, boundingBox.height)
    
    return { imageData, bounds: boundingBox }
  }
  
  /**
   * Add rendered data to cache with LRU eviction
   */
  private addToCache(objectId: string, imageData: ImageData, bounds: BoundingBox): void {
    const size = this.calculateImageDataSize(imageData)
    
    // Evict old entries if needed
    while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
      // Remove oldest entry (first in map)
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.invalidateObject(firstKey)
      }
    }
    
    // Add new entry
    const entry: CacheEntry = {
      imageData,
      bounds,
      timestamp: Date.now()
    }
    
    this.cache.set(objectId, entry)
    this.currentCacheSize += size
  }
  
  /**
   * Calculate the memory size of ImageData
   */
  private calculateImageDataSize(imageData: ImageData): number {
    // ImageData uses 4 bytes per pixel (RGBA)
    return imageData.width * imageData.height * 4
  }
  
  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear()
    this.currentCacheSize = 0
  }
  
  /**
   * Get current cache statistics
   */
  getStats(): { entries: number; sizeBytes: number; sizeMB: number } {
    return {
      entries: this.cache.size,
      sizeBytes: this.currentCacheSize,
      sizeMB: this.currentCacheSize / (1024 * 1024)
    }
  }
  
  /**
   * Clean up expired entries
   */
  cleanupExpired(): void {
    const now = Date.now()
    const toRemove: string[] = []
    
    for (const [objectId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        toRemove.push(objectId)
      }
    }
    
    for (const objectId of toRemove) {
      this.invalidateObject(objectId)
    }
  }
} 