import { ObjectTool } from './ObjectTool'
import type { Filter } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * Base class for WebGL-accelerated filter tools
 * Provides real-time preview and high-performance filtering
 */
export abstract class ObjectWebGLFilterTool extends ObjectTool {
  protected abstract getFilterType(): string
  protected abstract getDefaultParams(): Record<string, any>
  
  // Debounce timer for real-time preview
  private previewDebounce: NodeJS.Timeout | null = null
  
  protected setupTool(): void {
    // Initialize with default parameters
    const defaultParams = this.getDefaultParams()
    Object.entries(defaultParams).forEach(([key, value]) => {
      this.setOption(key, value)
    })
  }
  
  protected cleanupTool(): void {
    // Clear any pending preview
    if (this.previewDebounce) {
      clearTimeout(this.previewDebounce)
      this.previewDebounce = null
    }
  }
  
  /**
   * Apply the WebGL filter to target objects
   */
  protected async applyFilter(params: Record<string, any>): Promise<void> {
    const targets = this.getTargetObjects()
    
    for (const target of targets) {
      if (target.type !== 'image') continue
      
      const filter: Filter = {
        type: this.getFilterType() as Filter['type'],
        params
      }
      
      // @ts-expect-error - applyFilterToObject exists on our CanvasManager implementation
      await this.getCanvas().applyFilterToObject(target.id, filter)
    }
  }
  
  /**
   * Get all options as filter parameters
   */
  protected getAllOptions(): Record<string, any> {
    return { ...this.options }
  }
  
  /**
   * Handle option changes with real-time preview
   */
  protected onOptionChange(key: string, value: unknown): void {
    // Clear existing debounce
    if (this.previewDebounce) {
      clearTimeout(this.previewDebounce)
    }
    
    // Debounce for 60fps real-time preview
    this.previewDebounce = setTimeout(() => {
      const params = this.getAllOptions()
      this.applyFilter(params)
    }, 16) // ~60fps
  }
  
  /**
   * Apply filter immediately (for UI buttons)
   */
  async applyImmediate(): Promise<void> {
    const params = this.getAllOptions()
    await this.applyFilter(params)
  }
  
  /**
   * Reset filter to defaults
   */
  reset(): void {
    const defaultParams = this.getDefaultParams()
    Object.entries(defaultParams).forEach(([key, value]) => {
      this.setOption(key, value)
    })
  }
} 