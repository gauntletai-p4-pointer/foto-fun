/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseTool } from '../base/BaseTool'
import type { Canvas } from 'fabric'
import { FilterPipeline } from '../../filters/FilterPipeline'
import { ApplyFilterCommand } from '../../commands/filters/ApplyFilterCommand'
import { useCanvasStore } from '@/store/canvasStore'
import type { LayerAwareSelectionManager } from '../../selection/LayerAwareSelectionManager'

/**
 * Abstract base class for all filter tools
 * Provides selection detection and filter pipeline routing
 */
export abstract class BaseFilterTool extends BaseTool {
  protected filterPipeline?: FilterPipeline
  protected selectionManager?: LayerAwareSelectionManager
  
  /**
   * Get the filter name for this tool
   */
  protected abstract getFilterName(): string
  
  /**
   * Get the default filter parameters
   */
  protected abstract getDefaultParams(): any
  
  /**
   * Setup the filter tool
   */
  protected setupTool(canvas: Canvas): void {
    // Get selection manager from canvas store
    const canvasStore = useCanvasStore.getState()
    this.selectionManager = canvasStore.selectionManager as LayerAwareSelectionManager
    
    if (!this.selectionManager) {
      console.error('Selection manager not found')
      return
    }
    
    // Create filter pipeline
    this.filterPipeline = new FilterPipeline(canvas, this.selectionManager)
    
    // Call tool-specific setup
    this.setupFilterTool(canvas)
  }
  
  /**
   * Tool-specific setup - override in subclasses
   */
  protected abstract setupFilterTool(canvas: Canvas): void
  
  /**
   * Apply filter with given parameters
   */
  protected async applyFilter(filterParams?: any): Promise<void> {
    if (!this.canvas || !this.filterPipeline || !this.selectionManager) {
      console.error('Filter tool not properly initialized')
      return
    }
    
    const params = filterParams || this.getDefaultParams()
    const filterName = this.getFilterName()
    
    // Check if we have a selection
    const hasSelection = this.hasActiveSelection()
    const selectionInfo = hasSelection ? ' to selection' : ''
    
    // Create and execute filter command
    const command = new ApplyFilterCommand(
      this.canvas,
      this.filterPipeline,
      this.selectionManager,
      filterName,
      params,
      undefined, // Let command find target images
      `Apply ${filterName}${selectionInfo}`
    )
    
    try {
      // Execute with history tracking
      await this.executeCommand(command)
    } catch (error) {
      console.error(`Failed to apply ${filterName} filter:`, error)
    }
  }
  
  /**
   * Check if there's an active selection
   */
  protected hasActiveSelection(): boolean {
    if (!this.selectionManager) return false
    
    // Check global selection
    if (this.selectionManager.hasSelection()) {
      return true
    }
    
    // Check object-specific selection if in object mode
    const selectionMode = this.selectionManager.getSelectionMode()
    if (selectionMode === 'object') {
      const activeObjectId = this.selectionManager.getActiveObjectId()
      if (activeObjectId) {
        return this.selectionManager.getObjectSelection(activeObjectId) !== null
      }
    }
    
    return false
  }
  
  /**
   * Get selection state info for UI display
   */
  protected getSelectionInfo(): { hasSelection: boolean; mode: string; target?: string } {
    if (!this.selectionManager) {
      return { hasSelection: false, mode: 'global' }
    }
    
    const mode = this.selectionManager.getSelectionMode()
    const hasSelection = this.hasActiveSelection()
    
    if (mode === 'object') {
      const activeObjectId = this.selectionManager.getActiveObjectId()
      return {
        hasSelection,
        mode,
        target: activeObjectId || undefined
      }
    }
    
    return { hasSelection, mode }
  }
  
  /**
   * Show visual indicator for selection state
   */
  protected showSelectionIndicator(): void {
    const info = this.getSelectionInfo()
    
    if (info.hasSelection) {
      // Could show a badge or indicator in the UI
      console.log(`Filter will be applied to ${info.mode} selection${info.target ? ` (${info.target})` : ''}`)
    }
  }
  
  /**
   * Cleanup
   */
  protected cleanupTool(): void {
    // Clear filter pipeline cache on tool switch
    if (this.filterPipeline) {
      this.filterPipeline.clearCache()
    }
    
    // Call tool-specific cleanup
    this.cleanupFilterTool()
  }
  
  /**
   * Tool-specific cleanup - override in subclasses
   */
  protected cleanupFilterTool(): void {
    // Override in subclasses if needed
  }
} 