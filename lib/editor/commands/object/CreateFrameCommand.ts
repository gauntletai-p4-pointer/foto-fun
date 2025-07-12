import { Command, type CommandContext } from '../base/Command'
import type { CommandResult } from '../base/CommandResult'
import { ExecutionError } from '../base/CommandResult'
import type { CanvasObject, FrameObject, FrameData } from '@/lib/editor/objects/types'
import { nanoid } from 'nanoid'

export interface CreateFrameOptions {
  // Position and dimensions
  x: number
  y: number
  width: number
  height: number
  
  // Frame-specific properties
  preset?: string
  exportName?: string
  
  // Visual styling
  style?: {
    fill?: string | 'transparent'
    stroke?: {
      color?: string
      width?: number
      style?: 'solid' | 'dashed'
    }
    background?: {
      color?: string
      opacity?: number
    }
  }
  
  // Export configuration
  export?: {
    format?: 'png' | 'jpeg' | 'webp'
    quality?: number
    dpi?: number
  }
  
  // Frame behavior
  clipping?: {
    enabled?: boolean
    showOverflow?: boolean
    exportClipped?: boolean
  }
  
  // Metadata
  isAutoFrame?: boolean
  name?: string
}

/**
 * Command to create a new frame object on the canvas
 * Follows the established command pattern with proper DI and event emission
 */
export class CreateFrameCommand extends Command {
  private readonly options: CreateFrameOptions
  private createdFrameId: string | null = null
  private createdFrame: FrameObject | null = null

  constructor(
    context: CommandContext,
    options: CreateFrameOptions
  ) {
    super(
      `Create frame at (${options.x}, ${options.y}) with dimensions ${options.width}x${options.height}`,
      context,
      {
        source: 'user',
        canMerge: false,
        affectsSelection: true
      }
    )
    this.options = options
  }

  protected async doExecute(): Promise<void> {
    // Generate unique ID for the frame
    this.createdFrameId = nanoid()
    
    // Create frame data with defaults
    const frameData: FrameData = {
      type: 'frame',
      preset: this.options.preset,
      exportName: this.options.exportName,
      style: {
        fill: this.options.style?.fill || 'transparent',
        stroke: {
          color: this.options.style?.stroke?.color || '#999999',
          width: this.options.style?.stroke?.width || 1,
          style: this.options.style?.stroke?.style || 'dashed'
        },
        // Fix background typing by ensuring both color and opacity are provided
        background: this.options.style?.background && 
                   this.options.style.background.color && 
                   this.options.style.background.opacity !== undefined
          ? {
              color: this.options.style.background.color,
              opacity: this.options.style.background.opacity
            }
          : undefined
      },
      export: {
        format: this.options.export?.format || 'png',
        quality: this.options.export?.quality || 1.0,
        dpi: this.options.export?.dpi || 72
      },
      clipping: {
        enabled: this.options.clipping?.enabled ?? false,
        showOverflow: this.options.clipping?.showOverflow ?? true,
        exportClipped: this.options.clipping?.exportClipped ?? true
      }
    }
    
    // Create the frame object
    const frameObject: Partial<CanvasObject> = {
      id: this.createdFrameId,
      type: 'frame',
      name: this.options.name || `Frame ${this.createdFrameId.slice(-6)}`,
      x: this.options.x,
      y: this.options.y,
      width: this.options.width,
      height: this.options.height,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0, // Will be set by canvas manager
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      filters: [],
      adjustments: [],
      data: frameData,
      metadata: {
        isAutoFrame: this.options.isAutoFrame || false
      }
    }
    
    // Add the frame to the canvas
    const actualFrameId = await this.context.canvasManager.addObject(frameObject)
    
    // Update our tracking
    this.createdFrameId = actualFrameId
    this.createdFrame = this.context.canvasManager.getObject(actualFrameId) as FrameObject
    
    if (!this.createdFrame) {
      throw new Error('Failed to create frame object')
    }
    
    // Emit frame creation event
    this.context.eventBus.emit('frame.created', {
      canvasId: this.context.canvasManager.id,
      frame: this.createdFrame,
      preset: this.options.preset,
      isAutoFrame: this.options.isAutoFrame || false
    })
    
    // If this is an auto-frame, emit specific event
    if (this.options.isAutoFrame) {
      this.context.eventBus.emit('frame.auto.created', {
        canvasId: this.context.canvasManager.id,
        frameId: this.createdFrameId,
        frame: this.createdFrame,
        trigger: 'image-import' // This will be parameterized in the future
      })
    }
    
    // Select the newly created frame
    this.context.canvasManager.selectObject(this.createdFrameId)
  }

  async undo(): Promise<CommandResult<void>> {
    if (!this.createdFrameId) {
      return {
        success: false,
        error: new ExecutionError('No frame to undo - command was not executed', { commandId: this.id })
      }
    }
    
    try {
      // Remove the frame from the canvas
      await this.context.canvasManager.removeObject(this.createdFrameId)
      
      // Emit frame deletion event
      if (this.createdFrame) {
        this.context.eventBus.emit('frame.deleted', {
          canvasId: this.context.canvasManager.id,
          frameId: this.createdFrameId,
          frame: this.createdFrame
        })
      }
      
      // Clear tracking
      this.createdFrameId = null
      this.createdFrame = null
      
      return {
        success: true,
        data: undefined,
        events: [],
        metadata: {
          executionTime: 0,
          affectedObjects: []
        }
      }
    } catch (error) {
      return {
        success: false,
        error: new ExecutionError(
          error instanceof Error ? error.message : 'Failed to undo frame creation',
          { commandId: this.id }
        )
      }
    }
  }

  canExecute(): boolean {
    return (
      this.options.width > 0 &&
      this.options.height > 0 &&
      this.context.canvasManager !== null
    )
  }

  canUndo(): boolean {
    return this.createdFrameId !== null
  }

  /**
   * Get the ID of the created frame (for use by other commands)
   */
  getCreatedFrameId(): string | null {
    return this.createdFrameId
  }

  /**
   * Get the created frame object (for use by other commands)
   */
  getCreatedFrame(): FrameObject | null {
    return this.createdFrame
  }
  
  protected getAffectedObjects(): string[] {
    return this.createdFrameId ? [this.createdFrameId] : []
  }
} 