import type { Canvas } from 'fabric'
import type { ComponentType } from 'react'
import type { Tool, ToolEvent } from '@/types'
import { useCanvasStore } from '@/store/canvasStore'
import { useToolOptionsStore } from '@/store/toolOptionsStore'
import type { ToolOption } from '@/store/toolOptionsStore'
import { usePerformanceStore } from '@/store/performanceStore'
// TODO: Uncomment when stores are implemented
// import { useHistoryStore } from '@/store/historyStore'
// import { useLayerStore } from '@/store/layerStore'
import type { StoreApi } from 'zustand'

// Type for event cleanup functions
type CleanupFunction = () => void

// Type for canvas event names
type CanvasEventName = 
  | 'mouse:down' | 'mouse:move' | 'mouse:up' 
  | 'mouse:over' | 'mouse:out' | 'mouse:wheel'
  | 'selection:created' | 'selection:updated' | 'selection:cleared'
  | 'object:added' | 'object:removed' | 'object:modified'
  | 'path:created' | 'text:changed' | 'text:editing:entered' | 'text:editing:exited'

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
  // TODO: Uncomment when stores are implemented
  // protected historyStore = useHistoryStore.getState()
  // protected layerStore = useLayerStore.getState()
  
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
  protected async executeCommand(command: Command): Promise<void> {
    // TODO: Implement when history store is available
    // await this.historyStore.executeCommand(command)
    console.log('Command execution:', command.description)
    await command.execute()
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
  
  // Optional Tool interface methods
  // Override these in derived classes as needed
  
  onMouseDown?(e: ToolEvent): void
  onMouseMove?(e: ToolEvent): void
  onMouseUp?(e: ToolEvent): void
  onMouseWheel?(e: ToolEvent): void
  onKeyDown?(e: KeyboardEvent): void
  onKeyUp?(e: KeyboardEvent): void
}

// Command interface (will be moved to separate file)
export interface Command {
  id: string
  timestamp: number
  description: string
  execute(): Promise<void>
  undo(): Promise<void>
  redo(): Promise<void>
  canExecute(): boolean
  canUndo(): boolean
} 