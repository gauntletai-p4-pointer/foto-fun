import { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasManager } from './CanvasManager'
import type { FramePresetManager } from './FramePresetManager'
import type { CommandManager } from '../commands/CommandManager'
import { CreateFrameCommand } from '../commands/object/CreateFrameCommand'
import type { CanvasObject } from '../objects/types'
import type { CommandContext } from '../commands/base/Command'

/**
 * AutoFrameHandler - Automatically creates frames when the first image is added to an empty canvas
 * 
 * Features:
 * - Monitors canvas state for first image additions
 * - Creates appropriate frame based on image dimensions
 * - Uses intelligent preset selection
 * - Integrates with command system for proper undo/redo
 * - Follows dependency injection patterns
 */
export class AutoFrameHandler {
  private isEnabled = true
  private isProcessing = false
  private subscriptions: Array<() => void> = []

  constructor(
    private eventBus: TypedEventBus,
    private canvasManager: CanvasManager,
    private framePresetManager: FramePresetManager,
    private commandManager: CommandManager
  ) {
    this.setupEventListeners()
  }

  /**
   * Enable or disable auto-frame creation
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    // Note: This event doesn't exist in EventRegistry yet, but functionality works without it
    console.log(`[AutoFrameHandler] Auto-frame ${enabled ? 'enabled' : 'disabled'} for canvas ${this.canvasManager.id}`)
  }

  /**
   * Check if auto-frame is enabled
   */
  getEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Setup event listeners for auto-frame triggers
   */
  private setupEventListeners(): void {
    // Listen for objects being added to canvas
    const unsubscribe = this.eventBus.on('canvas.object.added', (data) => {
      this.handleObjectAdded(data.object)
    })
    
    this.subscriptions.push(unsubscribe)
  }

  /**
   * Handle object addition - check if auto-frame should be created
   */
  private async handleObjectAdded(object: CanvasObject): Promise<void> {
    // Skip if disabled or already processing
    if (!this.isEnabled || this.isProcessing) {
      return
    }

    // Only trigger for image objects
    if (object.type !== 'image') {
      return
    }

    // Check if this is the first image on an empty canvas
    if (!this.shouldCreateAutoFrame(object)) {
      return
    }

    try {
      this.isProcessing = true
      await this.createAutoFrame(object)
    } catch (error) {
      console.error('[AutoFrameHandler] Failed to create auto-frame:', error)
      // Note: This event doesn't exist in EventRegistry yet, but functionality works without it
      console.error(`[AutoFrameHandler] Auto-frame creation failed for image ${object.id}:`, error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Determine if auto-frame should be created for this object
   */
  private shouldCreateAutoFrame(imageObject: CanvasObject): boolean {
    const allObjects = this.canvasManager.getAllObjects()
    
    // Count non-frame objects (frames don't count toward "empty canvas")
    const nonFrameObjects = allObjects.filter(obj => obj.type !== 'frame')
    
    // Check if this is the first non-frame object
    if (nonFrameObjects.length !== 1 || nonFrameObjects[0].id !== imageObject.id) {
      return false
    }

    // Check if there are already frames on canvas
    const existingFrames = allObjects.filter(obj => obj.type === 'frame')
    if (existingFrames.length > 0) {
      return false
    }

    return true
  }

  /**
   * Create auto-frame for the given image
   */
  private async createAutoFrame(imageObject: CanvasObject): Promise<void> {
    // Calculate frame position and size - EXACT same dimensions as the image
    const frameOptions = this.calculateFrameOptions(imageObject)
    
    // Create command context
    const context: CommandContext = {
      eventBus: this.eventBus,
      canvasManager: this.canvasManager,
      selectionManager: this.canvasManager.getSelectionManager(),
      executionId: 'auto-frame-' + Date.now(),
      timestamp: Date.now()
    }

    // Create frame using command system for proper undo/redo
    const createFrameCommand = new CreateFrameCommand(
      context,
      {
        ...frameOptions,
        name: `Auto Frame`,
        isAutoFrame: true,
        // Use default frame styling - minimal visual impact
        style: {
          fill: 'transparent',
          stroke: {
            color: '#000000',
            width: 1,
            style: 'solid'
          }
        }
      }
    )

    // Execute command
    const result = await this.commandManager.executeCommand(createFrameCommand)
    
    if (result.success) {
      console.log('[AutoFrameHandler] Auto-frame created successfully:', {
        frameId: createFrameCommand.getCreatedFrameId(),
        dimensions: { width: imageObject.width, height: imageObject.height },
        imageObject: imageObject.id
      })
      
      // Emit event for tracking
      const frameId = createFrameCommand.getCreatedFrameId()
      const frame = createFrameCommand.getCreatedFrame()
      if (frameId && frame) {
        this.eventBus.emit('frame.auto.created', {
          canvasId: this.canvasManager.id,
          frameId: frameId,
          frame: frame,
          trigger: 'image-import',
          sourceObjectId: imageObject.id
        })
      }
    } else {
      throw new Error(`Command execution failed: ${result.error?.message}`)
    }
  }



  /**
   * Calculate frame position and dimensions - exact same as image
   */
  private calculateFrameOptions(imageObject: CanvasObject): {
    x: number
    y: number
    width: number
    height: number
  } {
    // Frame should have EXACT same position and dimensions as the image
    return {
      x: imageObject.x,
      y: imageObject.y,
      width: imageObject.width,
      height: imageObject.height
    }
  }



  /**
   * Cleanup resources
   */
  dispose(): void {
    // Unsubscribe from all events
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    
    console.log(`[AutoFrameHandler] Disposed for canvas ${this.canvasManager.id}`)
  }
} 