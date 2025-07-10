/**
 * Resource Management System
 * Ensures proper cleanup of resources to prevent memory leaks
 */

export interface Disposable {
  dispose(): void | Promise<void>
}

export interface Resource extends Disposable {
  id: string
  type: string
  metadata?: Record<string, any>
}

/**
 * Manages lifecycle of resources with automatic cleanup
 */
export class ResourceManager implements Disposable {
  private resources = new Map<string, Resource>()
  private disposeCallbacks = new Map<string, Set<() => void | Promise<void>>>()
  private disposed = false
  
  /**
   * Register a resource for management
   */
  register<T extends Disposable>(
    id: string, 
    resource: T,
    metadata?: Record<string, any>
  ): T {
    if (this.disposed) {
      throw new Error('Cannot register resource on disposed ResourceManager')
    }
    
    // Dispose existing resource with same ID
    if (this.resources.has(id)) {
      this.disposeResource(id)
    }
    
    // Wrap resource
    const wrappedResource: Resource = {
      id,
      type: resource.constructor.name,
      dispose: resource.dispose.bind(resource),
      metadata
    }
    
    this.resources.set(id, wrappedResource)
    return resource
  }
  
  /**
   * Register a simple cleanup function
   */
  registerCleanup(id: string, cleanup: () => void | Promise<void>): void {
    this.register(id, {
      dispose: cleanup
    })
  }
  
  /**
   * Register an event listener with automatic cleanup
   */
  registerEventListener<K extends keyof WindowEventMap>(
    id: string,
    target: EventTarget,
    event: K,
    handler: (ev: WindowEventMap[K]) => any,
    options?: AddEventListenerOptions
  ): void {
    target.addEventListener(event, handler as EventListener, options)
    
    this.registerCleanup(id, () => {
      target.removeEventListener(event, handler as EventListener, options)
    })
  }
  
  /**
   * Register a DOM element with automatic removal
   */
  registerElement(id: string, element: HTMLElement): HTMLElement {
    this.register(id, {
      dispose: () => {
        element.remove()
      }
    }, { type: 'DOMElement' })
    return element
  }
  
  /**
   * Register a timer with automatic cleanup
   */
  registerInterval(id: string, callback: () => void, delay: number): NodeJS.Timeout {
    const intervalId = setInterval(callback, delay)
    
    this.registerCleanup(id, () => {
      clearInterval(intervalId)
    })
    
    return intervalId
  }
  
  /**
   * Register a timeout with automatic cleanup
   */
  registerTimeout(id: string, callback: () => void, delay: number): NodeJS.Timeout {
    const timeoutId = setTimeout(() => {
      callback()
      // Auto-remove after execution
      this.resources.delete(id)
    }, delay)
    
    this.registerCleanup(id, () => {
      clearTimeout(timeoutId)
    })
    
    return timeoutId
  }
  
  /**
   * Register an animation frame with automatic cleanup
   */
  registerAnimationFrame(
    id: string, 
    callback: (time: number) => void
  ): number {
    let frameId: number
    const animate = (time: number) => {
      callback(time)
      frameId = requestAnimationFrame(animate)
    }
    
    frameId = requestAnimationFrame(animate)
    
    this.registerCleanup(id, () => {
      cancelAnimationFrame(frameId)
    })
    
    return frameId
  }
  
  /**
   * Add a callback to be called when a resource is disposed
   */
  onDispose(id: string, callback: () => void | Promise<void>): void {
    if (!this.disposeCallbacks.has(id)) {
      this.disposeCallbacks.set(id, new Set())
    }
    this.disposeCallbacks.get(id)!.add(callback)
  }
  
  /**
   * Check if a resource is registered
   */
  has(id: string): boolean {
    return this.resources.has(id)
  }
  
  /**
   * Get resource metadata
   */
  getMetadata(id: string): Record<string, any> | undefined {
    return this.resources.get(id)?.metadata
  }
  
  /**
   * Dispose a specific resource by ID
   */
  async disposeResource(id: string): Promise<void> {
    const resource = this.resources.get(id)
    if (!resource) return
    
    try {
      // Call dispose on resource
      await resource.dispose()
      
      // Call registered callbacks
      const callbacks = this.disposeCallbacks.get(id)
      if (callbacks) {
        await Promise.all(
          Array.from(callbacks).map(cb => cb())
        )
      }
    } catch (error) {
      console.error(`Error disposing resource ${id}:`, error)
    } finally {
      // Always remove from tracking
      this.resources.delete(id)
      this.disposeCallbacks.delete(id)
    }
  }
  
  /**
   * Dispose all resources
   */
  async dispose(): Promise<void> {
    if (this.disposed) return
    
    this.disposed = true
    
    // Dispose in reverse order (LIFO)
    const ids = Array.from(this.resources.keys()).reverse()
    
    await Promise.all(
      ids.map(id => this.disposeResource(id))
    )
    
    this.resources.clear()
    this.disposeCallbacks.clear()
  }
  
  /**
   * Get list of active resources
   */
  getActiveResources(): ResourceInfo[] {
    return Array.from(this.resources.values()).map(resource => ({
      id: resource.id,
      type: resource.type,
      metadata: resource.metadata
    }))
  }
  
  /**
   * Create a child resource manager
   */
  createChild(): ResourceManager {
    const child = new ResourceManager()
    
    // Register child for disposal
    this.register(`child-${Date.now()}`, child)
    
    return child
  }
}

/**
 * Global resource manager for app-wide resources
 */
export class GlobalResourceManager extends ResourceManager {
  private static instance: GlobalResourceManager | null = null
  
  private constructor() {
    super()
    
    // Register cleanup on window unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', async () => {
        await this.dispose()
      })
    }
  }
  
  static getInstance(): GlobalResourceManager {
    if (!GlobalResourceManager.instance) {
      GlobalResourceManager.instance = new GlobalResourceManager()
    }
    return GlobalResourceManager.instance
  }
  
  /**
   * Track memory usage of resources
   */
  getMemoryUsage(): MemoryReport {
    const report: MemoryReport = {
      totalResources: this.getActiveResources().length,
      resourcesByType: {},
      estimatedMemory: 0
    }
    
    this.getActiveResources().forEach(resource => {
      const type = resource.type
      report.resourcesByType[type] = (report.resourcesByType[type] || 0) + 1
      
      // Estimate memory based on type
      if (resource.metadata?.size) {
        report.estimatedMemory += resource.metadata.size
      }
    })
    
    return report
  }
}

// Types
export interface ResourceInfo {
  id: string
  type: string
  metadata?: Record<string, any>
}

export interface MemoryReport {
  totalResources: number
  resourcesByType: Record<string, number>
  estimatedMemory: number
}

// React Hook
import { useEffect, useRef } from 'react'

/**
 * Hook for automatic resource cleanup in React components
 */
export function useResourceManager(): ResourceManager {
  const managerRef = useRef<ResourceManager>()
  
  if (!managerRef.current) {
    managerRef.current = new ResourceManager()
  }
  
  useEffect(() => {
    return () => {
      managerRef.current?.dispose()
    }
  }, [])
  
  return managerRef.current
}

// Decorators
export function AutoDispose(target: any, propertyKey: string): void {
  const originalMethod = target[propertyKey]
  
  target[propertyKey] = async function(...args: any[]) {
    const resourceManager = new ResourceManager()
    
    try {
      // Inject resource manager as first argument
      return await originalMethod.call(this, resourceManager, ...args)
    } finally {
      // Always cleanup
      await resourceManager.dispose()
    }
  }
} 