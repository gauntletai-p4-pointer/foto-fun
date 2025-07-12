import { CanvasManager } from '../canvas/CanvasManager'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { ExportFormat, ExportOptions } from '@/types'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { nanoid } from 'nanoid'

export interface ExportPreset {
  id: string
  name: string
  format: ExportFormat
  quality?: number
  width?: number
  height?: number
  scale?: number
}

export interface ExportProgress {
  exportId: string
  progress: number
  status: 'preparing' | 'exporting' | 'completed' | 'failed'
  message?: string
}

export interface ObjectBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Default export presets
 */
export const DEFAULT_EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'high-quality-png',
    name: 'High Quality PNG',
    format: 'png'
  },
  {
    id: 'optimized-jpeg',
    name: 'Optimized JPEG',
    format: 'jpeg',
    quality: 0.85
  },
  {
    id: 'modern-webp',
    name: 'Modern WebP',
    format: 'webp',
    quality: 0.9
  },
  {
    id: 'social-media',
    name: 'Social Media (1080x1080)',
    format: 'jpeg',
    quality: 0.9,
    width: 1080,
    height: 1080
  },
  {
    id: 'web-banner',
    name: 'Web Banner (1920x600)',
    format: 'jpeg',
    quality: 0.85,
    width: 1920,
    height: 600
  }
]

/**
 * Manages object export functionality
 */
export class ExportManager {
  private presets: Map<string, ExportPreset> = new Map()
  
  constructor(
    private canvasManager: CanvasManager,
    private typedEventBus: TypedEventBus
  ) {
    // Load default presets
    DEFAULT_EXPORT_PRESETS.forEach(preset => {
      this.presets.set(preset.id, preset)
    })
    
    // Load custom presets from storage
    this.loadCustomPresets()
  }

  /**
   * Export all objects on canvas
   */
  async exportCanvas(options: ExportOptions): Promise<Blob> {
    const exportId = nanoid()
    
    try {
      // Get all objects
      const objects = this.canvasManager.getAllObjects()
      if (objects.length === 0) {
        throw new Error('No objects to export')
      }
      
      // Calculate bounds of all objects
      const bounds = this.calculateObjectsBounds(objects)
      
      // Emit export started event
      this.typedEventBus.emit('export.started', {
        format: options.format,
        filename: `export-${Date.now()}.${options.format}`,
        options: { ...options }
      })
      
      // Export the calculated area
      const blob = await this.exportBounds(bounds, options)
      
      // Emit export completed event
      this.typedEventBus.emit('export.completed', {
        format: options.format,
        filename: `export-${Date.now()}.${options.format}`,
        filepath: '', // Will be set by actual save operation
        size: blob.size
      })
      
      return blob
    } catch (error) {
      // Emit export failed event
      this.typedEventBus.emit('export.failed', {
        format: options.format,
        filename: `export-${Date.now()}.${options.format}`,
        error: error instanceof Error ? error.message : 'Export failed'
      })
      throw error
    }
  }

  /**
   * Export only selected objects
   */
  async exportSelection(options: ExportOptions): Promise<Blob> {
    const selectedObjects = this.canvasManager.getSelectedObjects()
    
    if (selectedObjects.length === 0) {
      throw new Error('No objects selected')
    }
    
    // Calculate bounds of selected objects
    const bounds = this.calculateObjectsBounds(selectedObjects)
    
    // Export the selection area
    return this.exportBounds(bounds, options)
  }

  /**
   * Export visible viewport
   */
  async exportViewport(options: ExportOptions): Promise<Blob> {
    const viewport = this.canvasManager.getViewportBounds()
    return this.exportBounds(viewport, options)
  }

  /**
   * Export a specific region
   */
  async exportRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    format: ExportFormat = 'png'
  ): Promise<Blob> {
    const bounds: ObjectBounds = { x, y, width, height }
    return this.exportBounds(bounds, { format })
  }

  /**
   * Quick export using a preset
   */
  async quickExport(presetId: string): Promise<void> {
    const preset = this.presets.get(presetId)
    if (!preset) {
      throw new Error(`Export preset ${presetId} not found`)
    }
    
    const options: ExportOptions = {
      format: preset.format,
      quality: preset.quality,
      width: preset.width,
      height: preset.height
    }
    
    const blob = await this.exportCanvas(options)
    
    // Trigger download
    this.downloadBlob(blob, `export.${preset.format}`)
  }

  /**
   * Calculate bounds of multiple objects
   */
  private calculateObjectsBounds(objects: CanvasObject[]): ObjectBounds {
    if (objects.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const obj of objects) {
      // Calculate object bounds including rotation
      const bounds = this.getObjectBounds(obj)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * Get bounds of a single object including transformations
   */
  private getObjectBounds(obj: CanvasObject): ObjectBounds {
    // Simple bounds for now - can be enhanced to handle rotation
    return {
      x: obj.x,
      y: obj.y,
      width: obj.width * obj.scaleX,
      height: obj.height * obj.scaleY
    }
  }

  /**
   * Export a specific bounds area
   */
  private async exportBounds(bounds: ObjectBounds, options: ExportOptions): Promise<Blob> {
    const stage = this.canvasManager.stage
    if (!stage) {
      throw new Error('Canvas stage not initialized')
    }
    
    // Create export config for the bounds area
    const exportConfig = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      pixelRatio: 1
    }
    
    // Export as data URL first
    const dataUrl = stage.toDataURL(exportConfig)
    
    // Convert to blob
    const blob = await this.dataUrlToBlob(dataUrl, options.format || 'png')
    
    // Apply additional processing if needed
    return this.processExport(blob, options)
  }

  /**
   * Process export with additional options
   */
  private async processExport(blob: Blob, options: ExportOptions): Promise<Blob> {
    // If no resize needed, return original
    if (!options.width && !options.height) {
      return blob
    }
    
    // Create image from blob
    const img = new Image()
    const url = URL.createObjectURL(blob)
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url)
        
        // Calculate dimensions
        const scale = options.width && options.height
          ? 1 // Use exact dimensions
          : options.width
            ? options.width / img.width
            : options.height
              ? options.height! / img.height
              : 1
        
        const width = options.width || Math.round(img.width * scale)
        const height = options.height || Math.round(img.height * scale)
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert back to blob
        canvas.toBlob(
          (newBlob) => {
            if (newBlob) {
              resolve(newBlob)
            } else {
              reject(new Error('Failed to resize image'))
            }
          },
          blob.type,
          options.quality
        )
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image for processing'))
      }
      
      img.src = url
    })
  }

  /**
   * Download a blob as a file
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Save a custom preset
   */
  savePreset(preset: ExportPreset): void {
    this.presets.set(preset.id, preset)
    this.saveCustomPresets()
  }

  /**
   * Delete a preset
   */
  deletePreset(presetId: string): void {
    // Don't delete default presets
    if (DEFAULT_EXPORT_PRESETS.some(p => p.id === presetId)) {
      throw new Error('Cannot delete default presets')
    }
    
    this.presets.delete(presetId)
    this.saveCustomPresets()
  }

  /**
   * Get all presets
   */
  getPresets(): ExportPreset[] {
    return Array.from(this.presets.values())
  }

  /**
   * Load custom presets from localStorage
   */
  private loadCustomPresets(): void {
    try {
      const saved = localStorage.getItem('export-presets')
      if (saved) {
        const presets = JSON.parse(saved) as ExportPreset[]
        presets.forEach(preset => {
          // Don't override default presets
          if (!DEFAULT_EXPORT_PRESETS.some(p => p.id === preset.id)) {
            this.presets.set(preset.id, preset)
          }
        })
      }
    } catch (error) {
      console.error('Failed to load export presets:', error)
    }
  }

  /**
   * Save custom presets to localStorage
   */
  private saveCustomPresets(): void {
    try {
      const customPresets = Array.from(this.presets.values()).filter(
        preset => !DEFAULT_EXPORT_PRESETS.some(p => p.id === preset.id)
      )
      localStorage.setItem('export-presets', JSON.stringify(customPresets))
    } catch (error) {
      console.error('Failed to save export presets:', error)
    }
  }

  /**
   * Convert data URL to blob
   */
  private async dataUrlToBlob(dataUrl: string, format: ExportFormat): Promise<Blob> {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    // Ensure correct mime type
    const mimeType = `image/${format}`
    if (blob.type !== mimeType) {
      // Re-create blob with correct mime type
      return new Blob([blob], { type: mimeType })
    }
    
    return blob
  }
} 