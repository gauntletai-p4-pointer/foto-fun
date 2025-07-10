import type { Canvas } from 'fabric'
import type { ComponentType } from 'react'
import type { Tool, ToolEvent } from '@/types'
import { useCanvasStore } from '@/store/canvasStore'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import type { ToolOption } from '@/store/toolOptionsStore'
import { usePerformanceStore } from '@/store/performanceStore'
import type { ICommand } from '@/lib/editor/commands/base'
import { useHistoryStore } from '@/store/historyStore'
import { useLayerStore } from '@/store/layerStore'
import type { StoreApi } from 'zustand'
import type { CustomFabricObjectProps } from '@/types'
import type { FabricObject, Image as FabricImage } from 'fabric'
import { ModifyCommand } from '@/lib/editor/commands/canvas'
import { isSystemObject } from '@/lib/editor/utils/systemObjects'

// Type for event cleanup functions
type CleanupFunction = () => void

// Type for canvas event names
type CanvasEventName = 
  | 'mouse:down' | 'mouse:move' | 'mouse:up' 
  | 'mouse:over' | 'mouse:out' | 'mouse:wheel'
  | 'mouse:dblclick' | 'mouse:down:before' | 'mouse:move:before' | 'mouse:up:before'
  | 'selection:created' | 'selection:updated' | 'selection:cleared'
  | 'object:added' | 'object:removed' | 'object:modified'
  | 'object:moving' | 'object:scaling' | 'object:rotating'
  | 'object:skewing' | 'object:resizing' | 'object:selected' | 'object:deselected'
  | 'path:created' | 'text:changed' | 'text:editing:entered' | 'text:editing:exited'
  | 'before:transform' | 'before:selection:cleared'

// Generic event handler type
type CanvasEventHandler = (options: unknown) => void

/**
 * Base class for all tools in FotoFun
 * Provides consistent lifecycle management, event handling, and state management
 */
export abstract class BaseTool implements Tool {
  // Required Tool interface properties
  abstract id: string
  abstract name: string
  abstract icon: ComponentType
  abstract cursor: string
  abstract shortcut?: string
  
  // Tool implementation status
  isImplemented = true
  
  // Canvas reference
  protected canvas: Canvas | null = null
  
  // Event cleanup functions
  private eventCleanups: CleanupFunction[] = []
  
  // Store unsubscribe functions
  private unsubscribers: CleanupFunction[] = []
  
  // Store references
  protected canvasStore = useCanvasStore.getState()
  protected toolOptionsStore = useToolOptionsStore.getState()
  protected performanceMonitor = usePerformanceStore.getState()
  protected historyStore = useHistoryStore.getState()
  protected layerStore = useLayerStore.getState()
  
  /**
   * Called when tool is activated
   * Sets up the tool and handles errors gracefully
   */
  onActivate(canvas: Canvas): void {
    this.canvas = canvas
    
    try {
      // Set cursor
      canvas.defaultCursor = this.cursor
      
      // Call tool-specific setup
      this.setupTool(canvas)
    } catch (error) {
      console.error(`Tool ${this.id} activation failed:`, error)
      this.emergencyCleanup()
      throw error
    }
  }
  
  /**
   * Called when tool is deactivated
   * Ensures all resources are cleaned up
   */
  onDeactivate(canvas: Canvas): void {
    try {
      // Call tool-specific cleanup
      this.cleanup(canvas)
    } catch (error) {
      console.error(`Tool ${this.id} cleanup error:`, error)
    } finally {
      // Always clean up events and subscriptions
      this.cleanupAllEvents()
      this.unsubscribeAll()
      
      // Restore object selectability (in case tool disabled it)
      this.restoreObjectSelectability(canvas)
      
      // Reset cursor
      canvas.defaultCursor = 'default'
      
      // Clear canvas reference
      this.canvas = null
    }
  }
  
  /**
   * Tool-specific setup logic
   * Override this in derived classes
   */
  protected abstract setupTool(canvas: Canvas): void
  
  /**
   * Tool-specific cleanup logic
   * Override this in derived classes
   */
  protected abstract cleanup(canvas: Canvas): void
  
  // Event Management
  
  /**
   * Add a canvas event listener with automatic cleanup
   * Note: Using 'as never' to work around Fabric.js strict typing
   */
  protected addCanvasEvent(
    event: CanvasEventName,
    handler: CanvasEventHandler
  ): void {
    if (!this.canvas) return
    
    // Cast to never to bypass Fabric's strict event typing
    this.canvas.on(event as never, handler as never)
    this.eventCleanups.push(() => {
      if (this.canvas) {
        this.canvas.off(event as never, handler as never)
      }
    })
  }
  
  /**
   * Add a DOM event listener with automatic cleanup
   */
  protected addEventListener<K extends keyof WindowEventMap>(
    target: EventTarget,
    event: K,
    handler: (e: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(event, handler as EventListener, options)
    this.eventCleanups.push(() => {
      target.removeEventListener(event, handler as EventListener, options)
    })
  }
  
  /**
   * Clean up all event listeners
   */
  private cleanupAllEvents(): void {
    this.eventCleanups.forEach(cleanup => {
      try {
        cleanup()
      } catch (error) {
        console.error('Event cleanup error:', error)
      }
    })
    this.eventCleanups = []
  }
  
  // Store Subscription Management
  
  /**
   * Subscribe to a store with automatic cleanup
   */
  protected subscribeToStore<T>(
    store: StoreApi<T>,
    listener: (state: T, prevState: T) => void
  ): void {
    const unsubscribe = store.subscribe(listener)
    this.unsubscribers.push(unsubscribe)
  }
  
  /**
   * Subscribe to tool options changes
   */
  protected subscribeToToolOptions(
    callback: (options: ToolOption[]) => void
  ): void {
    const unsubscribe = useToolOptionsStore.subscribe((state) => {
      const options = state.getToolOptions(this.id)
      if (options) {
        callback(options)
      }
    })
    this.unsubscribers.push(unsubscribe)
  }
  
  /**
   * Unsubscribe from all stores
   */
  private unsubscribeAll(): void {
    this.unsubscribers.forEach(unsub => {
      try {
        unsub()
      } catch (error) {
        console.error('Unsubscribe error:', error)
      }
    })
    this.unsubscribers = []
  }
  
  // Command Execution
  
  /**
   * Execute a command and record it in history
   */
  protected async executeCommand(command: ICommand): Promise<void> {
    await this.historyStore.executeCommand(command)
  }
  
  // Performance Tracking
  
  /**
   * Track performance of an operation
   */
  protected track<T>(name: string, operation: () => T): T {
    return this.performanceMonitor.track(`${this.id}.${name}`, operation)
  }
  
  /**
   * Track async performance
   */
  protected async trackAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    return this.performanceMonitor.trackAsync(`${this.id}.${name}`, operation)
  }
  
  // Utility Methods
  
  /**
   * Emergency cleanup if activation fails
   */
  private emergencyCleanup(): void {
    try {
      this.cleanupAllEvents()
      this.unsubscribeAll()
      if (this.canvas) {
        this.canvas.defaultCursor = 'default'
      }
      this.canvas = null
    } catch (error) {
      console.error('Emergency cleanup failed:', error)
    }
  }
  
  /**
   * Get objects to operate on based on selection state
   * @param type Optional type filter (e.g., 'image', 'text')
   * @returns Array of objects to operate on
   */
  protected getTargetObjects(type?: string): FabricObject[] {
    if (!this.canvas) return []
    
    // Check for active selection first
    const activeObjects = this.canvas.getActiveObjects()
    const hasSelection = activeObjects.length > 0
    
    // Determine which objects to target
    let objects = hasSelection ? activeObjects : this.canvas.getObjects()
    
    // Filter by type if specified
    if (type) {
      objects = objects.filter(obj => obj.type === type)
    }
    
    // Log for debugging
    console.log(`[${this.name}] Targeting ${objects.length} object(s)${type ? ` of type '${type}'` : ''} - ${hasSelection ? 'selected only' : 'all objects'}`)
    
    return objects
  }
  
  /**
   * Get images to operate on based on selection state
   * Convenience method for image-specific tools
   */
  protected getTargetImages(): FabricImage[] {
    return this.getTargetObjects('image') as FabricImage[]
  }
  
  /**
   * Get option value with type safety
   * @param optionId The option ID
   * @returns The option value or undefined
   */
  protected getOptionValue<T = unknown>(optionId: string): T | undefined {
    const toolOptions = this.toolOptionsStore.getToolOptions(this.id)
    const option = toolOptions?.find(opt => opt.id === optionId)
    return option?.value as T | undefined
  }
  
  /**
   * Apply filters to images with proper management
   * @param images Array of images to apply filters to
   * @param filterType The type of filter (for removal)
   * @param createFilter Function to create the new filter (return null to remove only)
   * @param description Command description for history
   */
  protected async applyImageFilters(
    images: FabricImage[],
    filterType: string,
    createFilter: () => unknown | null,
    description: string
  ): Promise<void> {
    if (!this.canvas || images.length === 0) return
    
    const commands: ICommand[] = []
    
    images.forEach(img => {
      // Remove existing filters of the same type
      if (!img.filters) {
        img.filters = []
      } else {
        img.filters = img.filters.filter((f) => {
          const filter = f as unknown as { type?: string }
          return filter.type !== filterType
        })
      }
      
      // Add new filter if provided
      const newFilter = createFilter()
      if (newFilter) {
        img.filters.push(newFilter as typeof img.filters[0])
      }
      
      // Apply filters
      img.applyFilters()
      
      // Create command for history
      const command = new ModifyCommand(
        this.canvas!,
        img as FabricObject,
        { filters: img.filters },
        description
      )
      commands.push(command)
    })
    
    // Render canvas
    this.canvas.renderAll()
    
    // Execute all commands
    for (const command of commands) {
      await this.executeCommand(command)
    }
  }
  
  /**
   * Execute an operation with state guard
   * Prevents concurrent execution and ensures cleanup
   * @param stateName The state property name to guard
   * @param operation The operation to execute
   */
  protected async executeWithGuard<T>(
    stateName: string,
    operation: () => T | Promise<T>
  ): Promise<T | undefined> {
    // Check if we have a state object with get/set methods
    const state = (this as unknown as { state?: { get: (key: string) => unknown; set: (key: string, value: unknown) => void } }).state
    if (!state || typeof state.get !== 'function' || typeof state.set !== 'function') {
      // No state management, just execute
      return await operation()
    }
    
    // Check guard
    if (state.get(stateName)) {
      console.warn(`[${this.name}] Operation already in progress (${stateName})`)
      return undefined
    }
    
    // Set guard
    state.set(stateName, true)
    
    try {
      return await operation()
    } finally {
      // Always clear guard
      state.set(stateName, false)
    }
  }
  
  /**
   * Apply initial tool option value if it exists
   * @param optionId The option ID to check
   * @param applyFn Function to apply the value
   */
  protected applyInitialValue<T>(
    optionId: string,
    applyFn: (value: T) => void,
    defaultValue?: T
  ): void {
    const value = this.getOptionValue<T>(optionId)
    if (value !== undefined && value !== defaultValue) {
      applyFn(value)
    }
  }
  
  /**
   * Subscribe to a specific tool option
   * @param optionId The option ID to watch
   * @param callback Function to call when option changes
   * @param trackState Optional state property to track last value
   */
  protected subscribeToOption<T>(
    optionId: string,
    callback: (value: T) => void,
    trackState?: { stateName: string, stateObject: { get: (key: string) => unknown; set: (key: string, value: unknown) => void } }
  ): void {
    this.subscribeToToolOptions((options) => {
      const value = options.find(opt => opt.id === optionId)?.value as T | undefined
      
      if (value !== undefined) {
        // Check if value changed (if tracking)
        if (trackState) {
          const lastValue = trackState.stateObject.get(trackState.stateName)
          if (value === lastValue) return
          trackState.stateObject.set(trackState.stateName, value)
        }
        
        // Track performance
        this.track(`apply_${optionId}`, () => {
          callback(value)
        })
      }
    })
  }
  
  // Optional Tool interface methods
  // Override these in derived classes as needed
  
  onMouseDown?(e: ToolEvent): void
  onMouseMove?(e: ToolEvent): void
  onMouseUp?(e: ToolEvent): void
  onMouseWheel?(e: ToolEvent): void
  onKeyDown?(e: KeyboardEvent): void
  onKeyUp?(e: KeyboardEvent): void
  
  /**
   * Restore object selectability after tool deactivation
   * Some tools (like Hand, Zoom) disable selection, so we restore it
   */
  protected restoreObjectSelectability(canvas: Canvas): void {
    canvas.forEachObject((obj) => {
      // Don't make system objects selectable
      if (isSystemObject(obj)) return
      
      // Restore selectability based on layer lock status
      const objWithProps = obj as FabricObject & CustomFabricObjectProps
      const layerId = objWithProps.layerId
      if (layerId) {
        // Check if layer is locked
        const layer = this.layerStore.getLayerById(layerId)
        if (layer && !layer.locked) {
          obj.selectable = true
          obj.evented = true
        }
      } else {
        // No layer association, make selectable
        obj.selectable = true
        obj.evented = true
      }
    })
  }
} 