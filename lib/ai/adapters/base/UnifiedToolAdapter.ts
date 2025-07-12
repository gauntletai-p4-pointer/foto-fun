import { z } from 'zod';
import type { CanvasContext } from '../types/CanvasContext';
import type { AdapterDependencies } from '../types/AdapterDependencies';
import type { AdapterMetadata } from '../types/AdapterMetadata';
import type { AdapterBehavior } from '../types/AdapterBehavior';
import type { AdapterPlugin } from '../types/AdapterPlugin';
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';

/**
 * Base class for all AI tool adapters following senior-level architectural patterns
 * 
 * Key Features:
 * - Type-safe parameter conversion with Zod schemas
 * - Dependency injection for all services
 * - Event-driven communication
 * - Behavior composition system
 * - Plugin architecture for extensibility
 * - Intelligent error handling with recovery strategies
 */
export abstract class UnifiedToolAdapter<TInput = unknown, TOutput = unknown> {
  // Abstract properties that must be implemented
  abstract readonly toolId: string;
  abstract readonly aiName: string;
  abstract readonly description: string;
  abstract readonly inputSchema: z.ZodType<TInput>;
  
  // Injected dependencies
  protected dependencies: AdapterDependencies;
  
  // Behavior and plugin composition
  private behaviors: AdapterBehavior[] = [];
  private plugins: AdapterPlugin[] = [];
  
  // Metadata and configuration
  protected metadata: AdapterMetadata;
  
  constructor(dependencies: AdapterDependencies) {
    this.dependencies = dependencies;
    this.metadata = this.getAdapterMetadata();
    this.setupBehaviors();
    this.setupPlugins();
  }
  
  /**
   * Main execution method - handles the complete adapter lifecycle
   */
  async execute(params: unknown, context: CanvasContext): Promise<TOutput> {
    // 1. Validate input parameters
    const validatedParams = this.validateInput(params);
    
    // 2. Apply pre-execution behaviors
    await this.applyPreExecutionBehaviors(validatedParams, context);
    
    // 3. Execute the core adapter logic
    const result = await this.executeCore(validatedParams, context);
    
    // 4. Apply post-execution behaviors
    await this.applyPostExecutionBehaviors(result, context);
    
    // 5. Return formatted result
    return this.formatResult(result);
  }
  
  /**
   * Core execution method - implemented by specific adapters
   */
  protected abstract executeCore(params: TInput, context: CanvasContext): Promise<TOutput>;
  
  /**
   * Validate input parameters using Zod schema
   */
  protected validateInput(params: unknown): TInput {
    try {
      return this.inputSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }
  
  /**
   * Get adapter metadata - can be overridden by specific adapters
   */
  protected getAdapterMetadata(): AdapterMetadata {
    return {
      category: 'unknown',
      worksOn: 'unknown',
      requiresSelection: false,
      isReadOnly: false,
      supportsBatch: false,
      estimatedDuration: 1000
    };
  }
  
  /**
   * Setup default behaviors - can be overridden by specific adapters
   */
  protected setupBehaviors(): void {
    // Default behaviors that most adapters need
    this.addBehavior({
      name: 'validation',
      preExecution: async (params, context) => {
        await this.validateContext(context);
      }
    });
    
    this.addBehavior({
      name: 'performance',
      preExecution: async (params, context) => {
        this.startPerformanceTracking();
      },
      postExecution: async (result, context) => {
        this.endPerformanceTracking();
      }
    });
  }
  
  /**
   * Setup default plugins - can be overridden by specific adapters
   */
  protected setupPlugins(): void {
    // Plugins can be added by specific adapters
  }
  
  /**
   * Add behavior to the adapter
   */
  protected addBehavior(behavior: AdapterBehavior): void {
    this.behaviors.push(behavior);
  }
  
  /**
   * Add plugin to the adapter
   */
  protected addPlugin(plugin: AdapterPlugin): void {
    if (plugin.isCompatible(this)) {
      plugin.apply(this);
      this.plugins.push(plugin);
    }
  }
  
  /**
   * Apply pre-execution behaviors
   */
  private async applyPreExecutionBehaviors(params: TInput, context: CanvasContext): Promise<void> {
    for (const behavior of this.behaviors) {
      if (behavior.preExecution) {
        await behavior.preExecution(params, context);
      }
    }
  }
  
  /**
   * Apply post-execution behaviors
   */
  private async applyPostExecutionBehaviors(result: TOutput, context: CanvasContext): Promise<void> {
    for (const behavior of this.behaviors) {
      if (behavior.postExecution) {
        await behavior.postExecution(result, context);
      }
    }
  }
  
  /**
   * Validate execution context
   */
  protected async validateContext(context: CanvasContext): Promise<void> {
    if (this.metadata.requiresSelection && context.targetObjects.length === 0) {
      throw new Error('This operation requires object selection');
    }
    
    if (!context.hasContent && this.metadata.worksOn === 'existing') {
      throw new Error('This operation requires existing content on the canvas');
    }
  }
  
  /**
   * Format result for consistent response structure
   */
  protected formatResult(result: TOutput): TOutput {
    // Default implementation - can be overridden
    return result;
  }
  
  /**
   * Start performance tracking
   */
  private startPerformanceTracking(): void {
    this.dependencies.performanceMonitor?.startTracking(this.aiName);
  }
  
  /**
   * End performance tracking
   */
  private endPerformanceTracking(): void {
    this.dependencies.performanceMonitor?.endTracking(this.aiName);
  }
  
  /**
   * Emit event through the event bus
   */
  protected emitEvent(eventName: string, data: unknown): void {
    this.dependencies.eventBus.emit(`adapter.${eventName}` as any, {
      adapterId: this.aiName,
      toolId: this.toolId,
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get command factory for creating commands
   */
  protected getCommandFactory() {
    return this.dependencies.commandFactory;
  }
  
  /**
   * Get command manager for executing commands
   */
  protected getCommandManager() {
    return this.dependencies.commandManager;
  }
  
  /**
   * Get canvas manager
   */
  protected getCanvasManager() {
    return this.dependencies.canvasManager;
  }
  
  /**
   * Get tool store
   */
  protected getToolStore() {
    return this.dependencies.toolStore;
  }
  
  /**
   * Check if adapter is read-only
   */
  isReadOnly(): boolean {
    return this.metadata.isReadOnly;
  }
  
  /**
   * Get adapter capabilities
   */
  getCapabilities(): AdapterMetadata {
    return this.metadata;
  }
}
