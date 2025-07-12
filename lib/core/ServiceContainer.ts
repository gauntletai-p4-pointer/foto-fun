/**
 * Dependency Injection Container
 * Provides service registration and resolution with lifecycle management
 */
export class ServiceContainer {
  // Remove singleton pattern - each instance should be managed explicitly
  private services = new Map<string, unknown>()
  protected factories = new Map<string, ServiceFactory<unknown>>()
  private singletons = new Map<string, unknown>()
  
  // Service metadata for debugging and dependency management
  private metadata = new Map<string, ServiceMetadata>()
  
  // Initialization state tracking
  private initializationPhase: InitializationPhase = 'not-started'
  private initializingServices = new Set<string>()
  private initializedServices = new Set<string>()
  
  constructor() {
    // Public constructor - no singleton pattern
  }
  
  /**
   * Get initialization phase
   */
  getInitializationPhase(): InitializationPhase {
    return this.initializationPhase
  }
  
  /**
   * Set initialization phase
   */
  setInitializationPhase(phase: InitializationPhase): void {
    this.initializationPhase = phase
  }
  
  /**
   * Register a singleton service with proper dependency metadata
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
      phase: metadata?.phase || 'application',
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
      phase: metadata?.phase || 'application',
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
      phase: metadata?.phase || 'application',
      ...metadata
    })
  }
  
  /**
   * Register a constant value
   */
  registerValue<T>(token: string, value: T, phase: InitializationPhase = 'core'): void {
    this.services.set(token, value)
    this.metadata.set(token, {
      token,
      lifecycle: 'value',
      dependencies: [],
      phase
    })
    this.initializedServices.add(token)
  }
  
  /**
   * Update an existing service instance
   * Useful for services that are created outside the container
   */
  updateInstance(token: string, instance: unknown): void {
    // If not registered, register it as a singleton first
    if (!this.metadata.has(token)) {
      this.registerSingleton(token, () => instance, { phase: 'application' })
      this.initializedServices.add(token)
      return
    }
    
    const metadata = this.metadata.get(token)!
    
    if (metadata.lifecycle === 'singleton') {
      this.singletons.set(token, instance)
    } else {
      this.services.set(token, instance)
    }
    this.initializedServices.add(token)
  }
  
  /**
   * Get a service by token (supports async factories)
   */
  async get<T>(token: string): Promise<T> {
    // Check if it's a registered value
    if (this.services.has(token)) {
      return this.services.get(token) as T
    }
    
    // Check if singleton already exists
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T
    }
    
    // Prevent concurrent initialization of the same service
    if (this.initializingServices.has(token)) {
      // Wait for the service to be initialized
      return this.waitForService<T>(token)
    }
    
    // Create new instance
    const factory = this.factories.get(token)
    if (!factory) {
      throw new ServiceNotFoundError(token)
    }
    
    const metadata = this.metadata.get(token)!
    
    // Check initialization phase compatibility
    this.validatePhaseCompatibility(token, metadata)
    
    // Check for circular dependencies
    this.checkCircularDependencies(token)
    
    // Mark as initializing
    this.initializingServices.add(token)
    
    try {
      // Create instance with dependency injection
      const instance = await factory(this) as T
      
      // Cache if singleton
      if (metadata.lifecycle === 'singleton') {
        this.singletons.set(token, instance)
      }
      
      // Mark as initialized
      this.initializedServices.add(token)
      
      return instance
    } finally {
      // Remove from initializing set
      this.initializingServices.delete(token)
    }
  }
  
  /**
   * Get a service synchronously with better error handling
   */
  getSync<T>(token: string): T {
    // Check if it's a registered value
    if (this.services.has(token)) {
      return this.services.get(token) as T
    }
    
    // Check if singleton already exists
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T
    }
    
    // Check if currently initializing
    if (this.initializingServices.has(token)) {
      throw new Error(`Service '${token}' is currently being initialized. This indicates a circular dependency or improper async/sync usage.`)
    }
    
    // Create new instance
    const factory = this.factories.get(token)
    if (!factory) {
      throw new ServiceNotFoundError(token)
    }
    
    const metadata = this.metadata.get(token)!
    
    // Check initialization phase compatibility
    this.validatePhaseCompatibility(token, metadata)
    
    // Check for circular dependencies
    this.checkCircularDependencies(token)
    
    // Mark as initializing
    this.initializingServices.add(token)
    
    try {
      // Create instance with dependency injection
      const result = factory(this)
      
      // If the factory returns a promise, throw a clear error
      if (result instanceof Promise) {
        throw new Error(`Service '${token}' has async dependencies but was accessed synchronously. Use get() instead of getSync() or ensure all dependencies are synchronous.`)
      }
      
      const instance = result as T
      
      // Cache if singleton
      if (metadata.lifecycle === 'singleton') {
        this.singletons.set(token, instance)
      }
      
      // Mark as initialized
      this.initializedServices.add(token)
      
      return instance
    } finally {
      // Remove from initializing set
      this.initializingServices.delete(token)
    }
  }
  
  /**
   * Wait for a service to be initialized (for concurrent access)
   */
  private async waitForService<T>(token: string): Promise<T> {
    const maxWaitTime = 10000 // 10 seconds
    const checkInterval = 50 // 50ms
    let elapsed = 0
    
    while (elapsed < maxWaitTime) {
      if (this.initializedServices.has(token)) {
        return this.get<T>(token)
      }
      
      if (!this.initializingServices.has(token)) {
        // Service failed to initialize
        throw new Error(`Service '${token}' failed to initialize`)
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval))
      elapsed += checkInterval
    }
    
    throw new Error(`Timeout waiting for service '${token}' to initialize`)
  }
  
  /**
   * Validate that service can be accessed in current initialization phase
   */
  private validatePhaseCompatibility(token: string, metadata: ServiceMetadata): void {
    const servicePhase = metadata.phase || 'application'
    const currentPhase = this.initializationPhase
    
    // Define phase hierarchy: core -> infrastructure -> application
    const phaseOrder: Record<InitializationPhase, number> = {
      'not-started': 0,
      'core': 1,
      'infrastructure': 2,
      'application': 3,
      'complete': 4
    }
    
    const servicePhaseOrder = phaseOrder[servicePhase]
    const currentPhaseOrder = phaseOrder[currentPhase]
    
    if (servicePhaseOrder > currentPhaseOrder && currentPhase !== 'complete') {
      throw new Error(`Service '${token}' (phase: ${servicePhase}) cannot be accessed during initialization phase '${currentPhase}'. Ensure proper initialization order.`)
    }
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
  
  async get<T>(token: string): Promise<T> {
    // Check scoped instances first
    if (this.scopedInstances.has(token)) {
      return this.scopedInstances.get(token) as T
    }
    
    const metadata = this.parent.getMetadata(token)
    
    if (metadata?.lifecycle === 'scoped') {
      // Use parent's get method to handle factory resolution
      const instance = await this.parent.get<T>(token)
      this.scopedInstances.set(token, instance)
      return instance
    }
    
    // Delegate to parent for non-scoped services
    return this.parent.get<T>(token)
  }
  
  dispose(): void {
    // Clean up scoped instances
    this.scopedInstances.forEach((instance) => {
      if (instance && typeof (instance as { dispose?: () => void }).dispose === 'function') {
        (instance as { dispose: () => void }).dispose()
      }
    })
    this.scopedInstances.clear()
  }
}

// Types
export type ServiceFactory<T> = (container: ServiceContainer | ScopedContainer) => T | Promise<T>

export type ServiceLifecycle = 'singleton' | 'transient' | 'scoped' | 'value'

export type InitializationPhase = 'not-started' | 'core' | 'infrastructure' | 'application' | 'complete'

export interface ServiceMetadata {
  token: string
  lifecycle: ServiceLifecycle
  dependencies: string[]
  description?: string
  version?: string
  phase?: InitializationPhase
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

// Decorators (for future use - currently not used due to singleton pattern removal)
export function Injectable(_token: string) {
  return function <T extends new (...args: unknown[]) => unknown>(_target: T) {
    // Decorator implementation would go here
    return _target
  }
}

export function Singleton(_token: string) {
  return function <T extends new (...args: unknown[]) => unknown>(_target: T) {
    // Decorator implementation would go here
    return _target
  }
} 