import type { Tool, ToolEvent, CanvasManager } from '@/lib/editor/canvas/types'
import { ResourceManager } from '@/lib/core/ResourceManager'
import type { ExecutionContext } from '@/lib/events/execution/ExecutionContext'

/**
 * Base class for all canvas tools
 * Provides resource management and DI integration
 */
export abstract class BaseTool implements Tool {
  abstract id: string
  abstract name: string
  abstract icon: React.ComponentType
  abstract cursor: string
  shortcut?: string
  
  protected canvas: CanvasManager | null = null
  protected isActive = false
  protected resourceManager: ResourceManager | null = null
  protected executionContext: ExecutionContext | null = null
  
  // Tool lifecycle
  onActivate(canvas: CanvasManager): void {
    this.canvas = canvas
    this.isActive = true
    
    // Create resource manager if not injected
    if (!this.resourceManager) {
      this.resourceManager = new ResourceManager()
    }
    
    this.setupTool()
  }
  
  onDeactivate(_canvas: CanvasManager): void {
    this.cleanupTool()
    
    // Dispose resources
    if (this.resourceManager) {
      this.resourceManager.dispose()
      this.resourceManager = null
    }
    
    this.isActive = false
    this.canvas = null
    this.executionContext = null
  }
  
  // Resource management
  setResourceManager(resourceManager: ResourceManager): void {
    this.resourceManager = resourceManager
  }
  
  // Execution context for AI operations
  setExecutionContext(context: ExecutionContext): void {
    this.executionContext = context
  }
  
  // Override these in subclasses
  protected abstract setupTool(): void
  protected abstract cleanupTool(): void
  
  // Default event handlers (override as needed)
  onMouseDown?(_event: ToolEvent): void {
    // Override in subclasses
  }
  
  onMouseMove?(_event: ToolEvent): void {
    // Override in subclasses
  }
  
  onMouseUp?(_event: ToolEvent): void {
    // Override in subclasses
  }
  
  onKeyDown?(_event: KeyboardEvent): void {
    // Override in subclasses
  }
  
  onKeyUp?(_event: KeyboardEvent): void {
    // Override in subclasses
  }
  
  // Utility methods
  protected getCanvas(): CanvasManager {
    if (!this.canvas) {
      throw new Error(`Tool ${this.id} is not active`)
    }
    return this.canvas
  }
  
  protected getResourceManager(): ResourceManager {
    if (!this.resourceManager) {
      throw new Error(`Tool ${this.id} has no resource manager`)
    }
    return this.resourceManager
  }
  
  // Tool options support
  protected options: Record<string, unknown> = {}
  
  setOption(key: string, value: unknown): void {
    this.options[key] = value
    this.onOptionChange(key, value)
  }
  
  getOption(key: string): unknown {
    return this.options[key]
  }
  
  protected onOptionChange(_key: string, _value: unknown): void {
    // Override in subclasses to react to option changes
  }
  
  // Helper methods for resource management
  protected registerEventListener<K extends keyof WindowEventMap>(
    id: string,
    target: EventTarget,
    event: K,
    handler: (ev: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void {
    this.getResourceManager().registerEventListener(id, target, event, handler, options)
  }
  
  protected registerCleanup(id: string, cleanup: () => void | Promise<void>): void {
    this.getResourceManager().registerCleanup(id, cleanup)
  }
  
  protected registerInterval(id: string, callback: () => void, delay: number): NodeJS.Timeout {
    return this.getResourceManager().registerInterval(id, callback, delay)
  }
  
  protected registerTimeout(id: string, callback: () => void, delay: number): NodeJS.Timeout {
    return this.getResourceManager().registerTimeout(id, callback, delay)
  }
  
  protected registerAnimationFrame(id: string, callback: (time: number) => void): number {
    return this.getResourceManager().registerAnimationFrame(id, callback)
  }
} 