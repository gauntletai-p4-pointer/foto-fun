import type { ServiceContainer } from '@/lib/core/ServiceContainer'
import type { BaseTool, ToolDependencies } from './BaseTool'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { CommandManager } from '@/lib/editor/commands/CommandManager'
import type { ResourceManager } from '@/lib/core/ResourceManager'
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import type { FilterManager } from '@/lib/editor/filters/FilterManager'

/**
 * Tool Factory with Dependency Injection
 * Creates tools with all required dependencies properly injected
 */
export class ToolFactory {
  constructor(private serviceContainer: ServiceContainer) {}
  
  /**
   * Create a tool instance with dependency injection
   */
  async createTool<T extends BaseTool>(
    ToolClass: new (deps: ToolDependencies) => T
  ): Promise<T> {
    const dependencies = await this.resolveToolDependencies();
    return new ToolClass(dependencies);
  }
  
  /**
   * Resolve all tool dependencies from the service container
   */
  private async resolveToolDependencies(): Promise<ToolDependencies> {
    // Core dependencies (required)
    const eventBus = await this.serviceContainer.get<TypedEventBus>('TypedEventBus');
    const canvasManager = await this.serviceContainer.get<CanvasManager>('CanvasManager');
    const commandManager = await this.serviceContainer.get<CommandManager>('CommandManager');
    const resourceManager = await this.serviceContainer.get<ResourceManager>('ResourceManager');
    
    // Optional dependencies
    let selectionManager: SelectionManager | undefined;
    let filterManager: FilterManager | undefined;
    
    try {
      selectionManager = await this.serviceContainer.get<SelectionManager>('SelectionManager');
    } catch {
      // SelectionManager is optional for some tools
    }
    
    try {
      filterManager = await this.serviceContainer.get<FilterManager>('FilterManager');
    } catch {
      // FilterManager is optional for non-filter tools
    }
    
    return {
      eventBus,
      canvasManager,
      commandManager,
      resourceManager,
      selectionManager,
      filterManager
    };
  }
  
  /**
   * Create multiple tool instances
   */
  async createTools<T extends BaseTool>(
    toolClasses: Array<new (deps: ToolDependencies) => T>
  ): Promise<T[]> {
    const dependencies = await this.resolveToolDependencies();
    return toolClasses.map(ToolClass => new ToolClass(dependencies));
  }
  
  /**
   * Check if all required dependencies are available
   */
  async canCreateTools(): Promise<boolean> {
    try {
      await this.resolveToolDependencies();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get the service container
   */
  getServiceContainer(): ServiceContainer {
    return this.serviceContainer;
  }
} 