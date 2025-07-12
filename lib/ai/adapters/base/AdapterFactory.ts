import type { ServiceContainer } from '@/lib/core/ServiceContainer';
import type { AdapterDependencies } from '../types/AdapterDependencies';
import type { UnifiedToolAdapter } from './UnifiedToolAdapter';

/**
 * Factory for creating adapter instances with dependency injection
 * Ensures all adapters receive proper dependencies from ServiceContainer

* All dependencies are mandatory and resolved synchronously
 */
export class AdapterFactory {
  constructor(private serviceContainer: ServiceContainer) {}

  /**
   * Create an adapter instance with resolved dependencies
   */
  createAdapter<T extends UnifiedToolAdapter>(
    AdapterClass: new (dependencies: AdapterDependencies) => T
  ): T {
    const dependencies = this.resolveAdapterDependencies();
    return new AdapterClass(dependencies);
  }

  /**
   * Create multiple adapters in batch
   */
  createAdapters<T extends UnifiedToolAdapter>(
    AdapterClasses: (new (dependencies: AdapterDependencies) => T)[]
  ): T[] {
    const dependencies = this.resolveAdapterDependencies();
    return AdapterClasses.map(AdapterClass => new AdapterClass(dependencies));
  }

  /**
   * Resolve all dependencies required by adapters
   * Only depends on services that are actually registered
   */
  private resolveAdapterDependencies(): AdapterDependencies {
    return {
      // Core services - Available and registered
      eventBus: this.serviceContainer.getSync('TypedEventBus'),
      canvasManager: this.serviceContainer.getSync('CanvasManager'),
      commandManager: this.serviceContainer.getSync('CommandManager'),
      commandFactory: this.serviceContainer.getSync('CommandFactory'),
      resourceManager: this.serviceContainer.getSync('ResourceManager'),
      
      // Basic services - Available and registered
      parameterConverter: this.serviceContainer.getSync('ParameterConverter'),
      modelPreferences: this.serviceContainer.getSync('ModelPreferencesManager'),
      
      // Placeholder services for missing dependencies
      // TODO: Register these services properly when needed
      toolStore: null, // Will be resolved async when needed
      responseFormatter: null, // Not implemented yet
      errorHandler: null, // Not implemented yet
      performanceMonitor: null, // Not implemented yet
      replicateClient: null // Not implemented yet
    };
  }
} 