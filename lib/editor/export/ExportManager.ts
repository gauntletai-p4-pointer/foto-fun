import { CanvasManager } from '../canvas/CanvasManager'
import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { ExportFormat, ExportOptions } from '@/types'
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
 * Manages document export functionality
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
   * Export the entire document
   */
  async exportDocument(options: ExportOptions): Promise<Blob> {
    const exportId = nanoid()
    
    try {
      // Emit export started event
      this.typedEventBus.emit('export.started', {
        exportId,
        format: options.format,
        options: { ...options }
      })
      
      // Export the image
      const blob = await this.canvasManager.exportImage(options.format)
      
      // Apply additional processing if needed
      const processedBlob = await this.processExport(blob, options)
      
      // Emit export completed event
      this.typedEventBus.emit('export.completed', {
        exportId,
        blob: processedBlob,
        size: processedBlob.size
      })
      
      return processedBlob
    } catch (error) {
      // Emit export failed event
      this.typedEventBus.emit('export.failed', {
        exportId,
        error: error instanceof Error ? error.message : 'Export failed'
      })
      throw error
    }
  }

  /**
   * Export only the current selection
   */
  async exportSelection(format: ExportFormat = 'png'): Promise<Blob> {
    const selection = this.canvasManager.getSelectionManager()?.getSelection()
    
    if (!selection) {
      throw new Error('No selection to export')
    }
    
    // Get selection bounds from the selection data
    const selectionData = this.canvasManager.getSelectionData()
    if (!selectionData || !selectionData.bounds) {
      throw new Error('Unable to determine selection bounds')
    }
    
    const bounds = selectionData.bounds
    
    // Create a temporary canvas for the selection
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = bounds.width
    tempCanvas.height = bounds.height
    const ctx = tempCanvas.getContext('2d')!
    
    // Get image data for the selection area
    const imageData = this.canvasManager.getImageData({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    })
    
    // Apply selection mask if it's a pixel selection
    if (selection.type === 'pixel' && selection.mask) {
      const maskData = selection.mask
      const data = imageData.data
      
      // Apply mask to alpha channel
      for (let i = 0; i < maskData.data.length; i += 4) {
        const alpha = maskData.data[i + 3]
        data[i + 3] = (data[i + 3] * alpha) / 255
      }
    }
    
    // Put the masked image data
    ctx.putImageData(imageData, 0, 0)
    
    // Convert to blob
    return new Promise((resolve, reject) => {
      tempCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        },
        `image/${format}`,
        format === 'jpeg' ? 0.9 : undefined
      )
    })
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
    // Create a temporary canvas for the region
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const ctx = tempCanvas.getContext('2d')!
    
    // Get image data for the region
    const imageData = this.canvasManager.getImageData({ x, y, width, height })
    ctx.putImageData(imageData, 0, 0)
    
    // Convert to blob
    return new Promise((resolve, reject) => {
      tempCanvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        },
        `image/${format}`,
        format === 'jpeg' ? 0.9 : undefined
      )
    })
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
    
    const blob = await this.exportDocument(options)
    
    // Trigger download
    this.downloadBlob(blob, `export.${preset.format}`)
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
} 