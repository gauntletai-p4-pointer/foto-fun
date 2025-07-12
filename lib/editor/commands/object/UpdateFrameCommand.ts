import { Command, type CommandContext } from '../base/Command'
import type { CommandResult } from '../base/CommandResult'
import { ExecutionError } from '../base/CommandResult'
import type { CanvasObject, FrameObject, FrameData } from '@/lib/editor/objects/types'

export interface UpdateFrameOptions {
  frameId: string
  
  // Position and dimensions
  x?: number
  y?: number
  width?: number
  height?: number
  
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
  
  // General object properties
  name?: string
  visible?: boolean
  locked?: boolean
  opacity?: number
}

/**
 * Command to update an existing frame object on the canvas
 * Follows the established command pattern with proper DI and event emission
 */
export class UpdateFrameCommand extends Command {
  private readonly options: UpdateFrameOptions
  private previousState: Partial<CanvasObject> | null = null
  private previousFrameData: Partial<FrameData> | null = null

  constructor(
    context: CommandContext,
    options: UpdateFrameOptions
  ) {
    super(
      `Update frame ${options.frameId}`,
      context,
      {
        source: 'user',
        canMerge: true, // Frame updates can be merged
        affectsSelection: false
      }
    )
    this.options = options
  }

  protected async doExecute(): Promise<void> {
    // Get the current frame
    const currentFrame = this.context.canvasManager.getObject(this.options.frameId) as FrameObject
    
    if (!currentFrame) {
      throw new Error(`Frame with ID ${this.options.frameId} not found`)
    }
    
    if (currentFrame.type !== 'frame') {
      throw new Error(`Object ${this.options.frameId} is not a frame`)
    }
    
    // Store previous state for undo
    this.previousState = {
      x: currentFrame.x,
      y: currentFrame.y,
      width: currentFrame.width,
      height: currentFrame.height,
      name: currentFrame.name,
      visible: currentFrame.visible,
      locked: currentFrame.locked,
      opacity: currentFrame.opacity
    }
    
    this.previousFrameData = {
      preset: currentFrame.data.preset,
      exportName: currentFrame.data.exportName,
      style: { ...currentFrame.data.style },
      export: { ...currentFrame.data.export },
      clipping: { ...currentFrame.data.clipping }
    }
    
    // Prepare updates
    const updates: Partial<CanvasObject> = {}
    const updatedProperties: string[] = []
    
    // Update position and dimensions
    if (this.options.x !== undefined) {
      updates.x = this.options.x
      updatedProperties.push('x')
    }
    if (this.options.y !== undefined) {
      updates.y = this.options.y
      updatedProperties.push('y')
    }
    if (this.options.width !== undefined) {
      updates.width = this.options.width
      updatedProperties.push('width')
    }
    if (this.options.height !== undefined) {
      updates.height = this.options.height
      updatedProperties.push('height')
    }
    
    // Update general properties
    if (this.options.name !== undefined) {
      updates.name = this.options.name
      updatedProperties.push('name')
    }
    if (this.options.visible !== undefined) {
      updates.visible = this.options.visible
      updatedProperties.push('visible')
    }
    if (this.options.locked !== undefined) {
      updates.locked = this.options.locked
      updatedProperties.push('locked')
    }
    if (this.options.opacity !== undefined) {
      updates.opacity = this.options.opacity
      updatedProperties.push('opacity')
    }
    
    // Update frame-specific data
    const frameData: FrameData = { ...currentFrame.data }
    let frameDataChanged = false
    
    if (this.options.preset !== undefined) {
      frameData.preset = this.options.preset
      updatedProperties.push('preset')
      frameDataChanged = true
    }
    
    if (this.options.exportName !== undefined) {
      frameData.exportName = this.options.exportName
      updatedProperties.push('exportName')
      frameDataChanged = true
    }
    
    // Update style
    if (this.options.style) {
      if (this.options.style.fill !== undefined) {
        frameData.style.fill = this.options.style.fill
        updatedProperties.push('style.fill')
        frameDataChanged = true
      }
      
      if (this.options.style.stroke) {
        if (this.options.style.stroke.color !== undefined) {
          frameData.style.stroke.color = this.options.style.stroke.color
          updatedProperties.push('style.stroke.color')
          frameDataChanged = true
        }
        if (this.options.style.stroke.width !== undefined) {
          frameData.style.stroke.width = this.options.style.stroke.width
          updatedProperties.push('style.stroke.width')
          frameDataChanged = true
        }
        if (this.options.style.stroke.style !== undefined) {
          frameData.style.stroke.style = this.options.style.stroke.style
          updatedProperties.push('style.stroke.style')
          frameDataChanged = true
        }
      }
      
      if (this.options.style.background !== undefined) {
        if (this.options.style.background && 
            this.options.style.background.color && 
            this.options.style.background.opacity !== undefined) {
          frameData.style.background = {
            color: this.options.style.background.color,
            opacity: this.options.style.background.opacity
          }
          updatedProperties.push('style.background')
          frameDataChanged = true
        } else {
          frameData.style.background = undefined
          updatedProperties.push('style.background')
          frameDataChanged = true
        }
      }
    }
    
    // Update export settings
    if (this.options.export) {
      if (this.options.export.format !== undefined) {
        frameData.export.format = this.options.export.format
        updatedProperties.push('export.format')
        frameDataChanged = true
      }
      if (this.options.export.quality !== undefined) {
        frameData.export.quality = this.options.export.quality
        updatedProperties.push('export.quality')
        frameDataChanged = true
      }
      if (this.options.export.dpi !== undefined) {
        frameData.export.dpi = this.options.export.dpi
        updatedProperties.push('export.dpi')
        frameDataChanged = true
      }
    }
    
    // Update clipping settings
    if (this.options.clipping) {
      if (this.options.clipping.enabled !== undefined) {
        frameData.clipping.enabled = this.options.clipping.enabled
        updatedProperties.push('clipping.enabled')
        frameDataChanged = true
      }
      if (this.options.clipping.showOverflow !== undefined) {
        frameData.clipping.showOverflow = this.options.clipping.showOverflow
        updatedProperties.push('clipping.showOverflow')
        frameDataChanged = true
      }
      if (this.options.clipping.exportClipped !== undefined) {
        frameData.clipping.exportClipped = this.options.clipping.exportClipped
        updatedProperties.push('clipping.exportClipped')
        frameDataChanged = true
      }
    }
    
    // Add frame data to updates if changed
    if (frameDataChanged) {
      updates.data = frameData
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await this.context.canvasManager.updateObject(this.options.frameId, updates)
      
      // Emit frame update event
      this.context.eventBus.emit('frame.updated', {
        canvasId: this.context.canvasManager.id,
        frameId: this.options.frameId,
        previousState: this.previousState,
        newState: updates,
        updatedProperties
      })
      
      // Emit specific events for important changes
      if (this.options.style) {
        this.context.eventBus.emit('frame.style.changed', {
          canvasId: this.context.canvasManager.id,
          frameId: this.options.frameId,
          styleProperty: 'fill', // This could be more specific
          previousValue: this.previousFrameData?.style,
          newValue: frameData.style
        })
      }
      
      if (this.options.clipping) {
        this.context.eventBus.emit('frame.clipping.changed', {
          canvasId: this.context.canvasManager.id,
          frameId: this.options.frameId,
          clippingEnabled: frameData.clipping.enabled,
          showOverflow: frameData.clipping.showOverflow,
          exportClipped: frameData.clipping.exportClipped
        })
      }
    }
  }

  async undo(): Promise<CommandResult<void>> {
    if (!this.previousState || !this.previousFrameData) {
      return {
        success: false,
        error: new ExecutionError('No previous state to restore - command was not executed', { commandId: this.id })
      }
    }
    
    try {
      // Restore the frame data
      const restoreData: Partial<CanvasObject> = {
        ...this.previousState,
        data: {
          type: 'frame',
          ...this.previousFrameData
        } as FrameData
      }
      
      await this.context.canvasManager.updateObject(this.options.frameId, restoreData)
      
      // Emit frame update event for undo
      this.context.eventBus.emit('frame.updated', {
        canvasId: this.context.canvasManager.id,
        frameId: this.options.frameId,
        previousState: {}, // Current state before undo
        newState: restoreData,
        updatedProperties: ['undo']
      })
      
      return {
        success: true,
        data: undefined,
        events: [],
        metadata: {
          executionTime: 0,
          affectedObjects: [this.options.frameId]
        }
      }
    } catch (error) {
      return {
        success: false,
        error: new ExecutionError(
          error instanceof Error ? error.message : 'Failed to undo frame update',
          { commandId: this.id }
        )
      }
    }
  }

  canExecute(): boolean {
    return (
      this.options.frameId !== '' &&
      this.context.canvasManager !== null
    )
  }

  canUndo(): boolean {
    return this.previousState !== null && this.previousFrameData !== null
  }

  canMergeWith(other: Command): boolean {
    if (!(other instanceof UpdateFrameCommand)) {
      return false
    }
    
    // Can merge if updating the same frame
    return this.options.frameId === other.options.frameId
  }

  mergeWith(other: Command): void {
    if (!(other instanceof UpdateFrameCommand)) {
      return
    }

    // Merge the updates
    Object.assign(this.options, other.options)
  }
  
  protected getAffectedObjects(): string[] {
    return [this.options.frameId]
  }
} 