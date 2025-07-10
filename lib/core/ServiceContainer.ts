/**
 * Dependency Injection Container
 * Provides service registration and resolution with lifecycle management
 */
export class ServiceContainer {
  private static instance: ServiceContainer | null = null
  private services = new Map<string, unknown>()
  private factories = new Map<string, ServiceFactory<unknown>>()
  private singletons = new Map<string, unknown>()
  
  // Service metadata for debugging
  private metadata = new Map<string, ServiceMetadata>()
  
  constructor() {
    // Public constructor
  }
  
  /**
   * Get the singleton instance of the container
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer()
    }
    return ServiceContainer.instance
  }
  
  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: string, 
    factory: ServiceFactory<T>,
    metadata?: Partial<ServiceMetadata>
  ): void {
    this.factories.set(token, factory)
    this.metadata.set(token, {
      token,
      lifecycle: 'singleton',
      dependencies: metadata?.dependencies || [],
      ...metadata
    })
  }
  
  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(
    token: string, 
    factory: ServiceFactory<T>,
    metadata?: Partial<ServiceMetadata>
  ): void {
    this.factories.set(token, factory)
    this.metadata.set(token, {
      token,
      lifecycle: 'transient',
      dependencies: metadata?.dependencies || [],
      ...metadata
    })
  }
  
  /**
   * Register a scoped service (per request/context)
   */
  registerScoped<T>(
    token: string,
    factory: ServiceFactory<T>,
    metadata?: Partial<ServiceMetadata>
  ): void {
    this.factories.set(token, factory)
    this.metadata.set(token, {
      token,
      lifecycle: 'scoped',
      dependencies: metadata?.dependencies || [],
      ...metadata
    })
  }
  
  /**
   * Register a constant value
   */
  registerValue<T>(token: string, value: T): void {
    this.services.set(token, value)
    this.metadata.set(token, {
      token,
      lifecycle: 'value',
      dependencies: []
    })
  }
  
  /**
   * Get a service by token
   */
  get<T>(token: string): T {
    // Check if it's a registered value
    if (this.services.has(token)) {
      return this.services.get(token)
    }
    
    // Check if singleton already exists
    if (this.singletons.has(token)) {
      return this.singletons.get(token)
    }
    
    // Create new instance
    const factory = this.factories.get(token)
    if (!factory) {
      throw new ServiceNotFoundError(token)
    }
    
    const metadata = this.metadata.get(token)!
    
    // Check for circular dependencies
    this.checkCircularDependencies(token)
    
    // Create instance with dependency injection
    const instance = factory(this)
    
    // Cache if singleton
    if (metadata.lifecycle === 'singleton') {
      this.singletons.set(token, instance)
    }
    
    return instance
  }
  
  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token) || this.factories.has(token)
  }
  
  /**
   * Create a scoped container for request-scoped services
   */
  createScope(): ScopedContainer {
    return new ScopedContainer(this)
  }
  
  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear()
    this.factories.clear()
    this.singletons.clear()
    this.metadata.clear()
  }
  
  /**
   * Get service metadata for debugging
   */
  getMetadata(token: string): ServiceMetadata | undefined {
    return this.metadata.get(token)
  }
  
  /**
   * List all registered services
   */
  listServices(): ServiceInfo[] {
    const services: ServiceInfo[] = []
    
    this.metadata.forEach((meta, token) => {
      services.push({
        token,
        lifecycle: meta.lifecycle,
        isResolved: this.singletons.has(token),
        dependencies: meta.dependencies || []
      })
    })
    
    return services
  }
  
  /**
   * Check for circular dependencies
   */
  private checkCircularDependencies(
    token: string, 
    chain: string[] = []
  ): void {
    if (chain.includes(token)) {
      throw new CircularDependencyError(token, chain)
    }
    
    const metadata = this.metadata.get(token)
    if (!metadata) return
    
    const newChain = [...chain, token]
    
    for (const dep of metadata.dependencies || []) {
      this.checkCircularDependencies(dep, newChain)
    }
  }
}

/**
 * Scoped container for request-scoped services
 */
export class ScopedContainer {
  private scopedInstances = new Map<string, unknown>()
  
  constructor(private parent: ServiceContainer) {}
  
  get<T>(token: string): T {
    // Check scoped instances first
    if (this.scopedInstances.has(token)) {
      return this.scopedInstances.get(token)
    }
    
    const metadata = this.parent.getMetadata(token)
    
    if (metadata?.lifecycle === 'scoped') {
      // Create scoped instance
      const factory = (this.parent as ServiceContainer & { factories: Map<string, ServiceFactory<unknown>> }).factories.get(token)
      const instance = factory(this)
      this.scopedInstances.set(token, instance)
      return instance
    }
    
    // Delegate to parent for non-scoped services
    return this.parent.get(token)
  }
  
  dispose(): void {
    // Clean up scoped instances
    this.scopedInstances.forEach((instance) => {
      if (instance && typeof instance.dispose === 'function') {
        instance.dispose()
      }
    })
    this.scopedInstances.clear()
  }
}

// Types
export type ServiceFactory<T> = (container: ServiceContainer | ScopedContainer) => T

export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped' | 'value'

export interface ServiceMetadata {
  token: string
  lifecycle: ServiceLifecycle
  dependencies: string[]
  description?: string
  version?: string
}

export interface ServiceInfo {
  token: string
  lifecycle: ServiceLifecycle
  isResolved: boolean
  dependencies: string[]
}

// Errors
export class ServiceNotFoundError extends Error {
  constructor(token: string) {
    super(`Service '${token}' not found in container`)
    this.name = 'ServiceNotFoundError'
  }
}

export class CircularDependencyError extends Error {
  constructor(token: string, chain: string[]) {
    super(`Circular dependency detected: ${chain.join(' -> ')} -> ${token}`)
    this.name = 'CircularDependencyError'
  }
}

// React Hook
import { useContext, createContext } from 'react'

const ContainerContext = createContext<ServiceContainer | null>(null)

export const ContainerProvider = ContainerContext.Provider

export function useService<T>(token: string): T {
  const container = useContext(ContainerContext)
  if (!container) {
    throw new Error('useService must be used within ContainerProvider')
  }
  return container.get<T>(token)
}

// Decorators (for future use)
export function Injectable(token: string) {
  return function (target: new (...args: unknown[]) => unknown) {
    // Register the class in the container
    const container = ServiceContainer.getInstance()
    container.registerTransient(token, () => new target())
  }
}

export function Singleton(token: string) {
  return function (target: new (...args: unknown[]) => unknown) {
    // Register as singleton
    const container = ServiceContainer.getInstance()
    container.registerSingleton(token, () => new target())
  }
} 