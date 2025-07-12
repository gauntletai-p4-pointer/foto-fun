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
   * All dependencies are mandatory and resolved synchronously
   */
  private resolveAdapterDependencies(): AdapterDependencies {
    return {
      // Core services - ALL MANDATORY
      eventBus: this.serviceContainer.getSync('TypedEventBus'),
      canvasManager: this.serviceContainer.getSync('CanvasManager'),
      commandManager: this.serviceContainer.getSync('CommandManager'),
      commandFactory: this.serviceContainer.getSync('CommandFactory'),
      toolStore: this.serviceContainer.getSync('EventToolStore'),
      resourceManager: this.serviceContainer.getSync('ResourceManager'),
      
      // Adapter-specific services - MANDATORY
      parameterConverter: this.serviceContainer.getSync('ParameterConverter'),
      responseFormatter: this.serviceContainer.getSync('ResponseFormatter'),
      errorHandler: this.serviceContainer.getSync('ErrorHandler'),
      performanceMonitor: this.serviceContainer.getSync('PerformanceMonitor'),
      
      // AI-specific services - MANDATORY
      modelPreferences: this.serviceContainer.getSync('ModelPreferencesManager'),
      replicateClient: this.serviceContainer.getSync('ReplicateClient')
    };
  }
} 