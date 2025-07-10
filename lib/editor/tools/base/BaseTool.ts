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
import { ToolChain } from '@/lib/ai/execution/ToolChain'
import { selectionContext } from '@/lib/ai/execution/SelectionContext'
import type { SelectionSnapshot } from '@/lib/ai/execution/SelectionSnapshot'

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

// Interface for state objects with get/set methods
interface StateObject<T = unknown> {
  get(key: string): T
  set(key: string, value: T): void
}

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
  
  // Re-entry guard for option updates
  private isProcessingOptionChange = false
  
  // Store references
  protected canvasStore = useCanvasStore.getState()
  protected toolOptionsStore = useToolOptionsStore.getState()
  protected performanceMonitor = usePerformanceStore.getState()
  protected historyStore = useHistoryStore.getState()
  protected layerStore = useLayerStore.getState()
  
  // Selection snapshot support
  protected selectionSnapshot: SelectionSnapshot | null = null
  
  // Tool configuration
  protected targetObjectTypes: string[] = [] // Override in subclasses to restrict types
  protected requiresSelection: boolean = false // Override to require selection
  
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
   * Subscribe to store changes
   * @param store Zustand store
   * @param selector State selector
   * @param callback Callback when selected state changes
   */
  protected subscribeToStore<T, S>(
    store: StoreApi<T>,
    selector: (state: T) => S,
    callback: (value: S) => void
  ): void {
    // Subscribe and track for cleanup
    const unsubscribe = store.subscribe((state) => {
      const value = selector(state)
      callback(value)
    })
    
    this.unsubscribers.push(unsubscribe)
  }
  
  /**
   * Subscribe to tool options
   * @param callback Function to call when options change
   */
  protected subscribeToToolOptions(callback: (options: ToolOption[]) => void): void {
    this.subscribeToStore(
      useToolOptionsStore,
      (state) => state.getToolOptions(this.id) || [],
      (options) => {
        // Prevent re-entry during option processing
        if (this.isProcessingOptionChange) {
          return
        }
        
        try {
          this.isProcessingOptionChange = true
          callback(options)
        } finally {
          // Use setTimeout to ensure the flag is reset after the current execution stack
          setTimeout(() => {
            this.isProcessingOptionChange = false
          }, 0)
        }
      }
    )
  }
  
  /**
   * Safely update a tool option without triggering re-entry
   * @param optionId The option ID to update
   * @param value The new value
   */
  protected updateOptionSafely(optionId: string, value: unknown): void {
    // If we're already processing, defer the update
    if (this.isProcessingOptionChange) {
      setTimeout(() => {
        this.toolOptionsStore.updateOption(this.id, optionId, value)
      }, 0)
    } else {
      this.toolOptionsStore.updateOption(this.id, optionId, value)
    }
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
   * If we're executing within a ToolChain, skip history recording
   * since the chain itself is already recorded as a single command
   */
  protected async executeCommand(command: ICommand): Promise<void> {
    // Check if we're executing within a tool chain
    if (ToolChain.isExecutingChain) {
      // Execute directly without history recording
      if (command.canExecute()) {
        await command.execute()
      }
    } else {
      // Normal execution through history store
      await this.historyStore.executeCommand(command)
    }
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
   * Set a selection snapshot for this tool to use
   */
  setSelectionSnapshot(snapshot: SelectionSnapshot | null): void {
    this.selectionSnapshot = snapshot
  }

  /**
   * Get target objects based on tool configuration and selection
   */
  protected getTargetObjects(): FabricObject[] {
    if (!this.canvas) return []
    
    // Priority 1: Use selection snapshot if available
    if (this.selectionSnapshot && !this.selectionSnapshot.isEmpty) {
      console.log(`[${this.id}] Using selection snapshot with ${this.selectionSnapshot.count} objects`)
      // Filter by type if this tool has type restrictions
      if (this.targetObjectTypes.length > 0) {
        return this.selectionSnapshot.objects.filter((obj: FabricObject) => 
          this.targetObjectTypes.includes(obj.type as string)
        )
      }
      return [...this.selectionSnapshot.objects]
    }
    
    // Priority 2: Check SelectionContext (for backward compatibility)
    const contextObjects = selectionContext.getTargetObjects()
    if (contextObjects.length > 0) {
      console.log(`[${this.id}] Using SelectionContext with ${contextObjects.length} objects`)
      // Filter by allowed types
      if (this.targetObjectTypes.length > 0) {
        return contextObjects.filter(obj => 
          this.targetObjectTypes.includes(obj.type as string)
        )
      }
      return contextObjects
    }
    
    // Priority 3: Current canvas selection
    const activeSelection = this.canvas.getActiveObjects()
    
    // If we have an active selection, use it
    if (activeSelection.length > 0) {
      // Filter by allowed types
      if (this.targetObjectTypes.length > 0) {
        return activeSelection.filter(obj => 
          this.targetObjectTypes.includes(obj.type as string)
        )
      }
      return activeSelection
    }
    
    // Priority 4: All objects of allowed types (if tool allows it)
    if (this.requiresSelection) {
      return []
    }
    
    // Get all objects of the allowed types
    if (this.targetObjectTypes.length > 0) {
      return this.canvas.getObjects().filter(obj => 
        this.targetObjectTypes.includes(obj.type as string)
      )
    }
    
    // No type restrictions - return all objects
    return this.canvas.getObjects()
  }
  
  /**
   * Get images to operate on based on selection state
   * Convenience method for image-specific tools
   * @param requireSelection If true, returns empty array when nothing is selected
   */
  protected getTargetImages(requireSelection = false): FabricImage[] {
    // Temporarily set requiresSelection
    const originalRequiresSelection = this.requiresSelection
    this.requiresSelection = requireSelection
    
    // Set target types to only images
    const originalTypes = this.targetObjectTypes
    this.targetObjectTypes = ['image']
    
    const images = this.getTargetObjects() as FabricImage[]
    
    // Restore original settings
    this.requiresSelection = originalRequiresSelection
    this.targetObjectTypes = originalTypes
    
    return images
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
      // Initialize filters array if needed
      if (!img.filters) {
        img.filters = []
      }
      
      // Calculate what the new filters will be
      const newFilters = img.filters.filter((f) => {
        const filter = f as unknown as { type?: string }
        return filter.type !== filterType
      })
      
      // Add new filter if provided
      const newFilter = createFilter()
      if (newFilter) {
        newFilters.push(newFilter as typeof img.filters[0])
      }
      
      // Create command BEFORE modifying the object
      // This ensures ModifyCommand captures the current state as "old"
      const command = new ModifyCommand(
        this.canvas!,
        img as FabricObject,
        { filters: newFilters },
        description
      )
      
      // Now execute the command which will apply the changes
      commands.push(command)
    })
    
    // Execute all commands - this will apply the filters and render
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
    const state = (this as unknown as { state?: StateObject }).state
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
   * Apply initial option values
   * @param optionId The option ID
   * @param callback Function to call with the initial value
   */
  protected applyInitialValue<T>(optionId: string, callback: (value: T) => void): void {
    const value = this.getOptionValue<T>(optionId)
    if (value !== undefined) {
      callback(value)
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
    trackState?: { stateName: string, stateObject: StateObject }
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
      // Don't make background objects selectable
      if (obj.excludeFromExport) return
      
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