import type { ServiceContainer } from '@/lib/core/ServiceContainer';
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { CommandManager } from '@/lib/editor/commands/CommandManager';
import type { ResourceManager } from '@/lib/core/ResourceManager';
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager';
import type { FilterManager } from '@/lib/editor/filters/FilterManager';
import { ToolRegistry } from './ToolRegistry';
import { BaseTool, type ToolDependencies } from './BaseTool';

/**
 * Tool factory that creates fresh tool instances with proper dependency injection.
 * Does NOT manage active tools - that's EventToolStore's job.
 */
export class ToolFactory {
  constructor(
    private readonly container: ServiceContainer,
    private readonly toolRegistry: ToolRegistry
  ) {}

  /**
   * Create a fresh tool instance with dependency injection
   */
  async createTool(toolId: string): Promise<BaseTool> {
    const toolClass = this.toolRegistry.getToolClass(toolId);
    if (!toolClass) {
      throw new Error(`Tool ${toolId} not registered`);
    }

    const dependencies = await this.resolveDependencies();
    const tool = new toolClass.ToolClass(dependencies);
    
    // Assign unique instance ID for tracking
    const instanceId = `${toolId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    (tool as any).instanceId = instanceId;
    
    return tool;
  }

  /**
   * Get tool metadata without creating instance
   */
  getToolMetadata(toolId: string) {
    const toolClass = this.toolRegistry.getToolClass(toolId);
    return toolClass?.metadata || null;
  }

  /**
   * Check if tool can be created
   */
  canCreateTool(toolId: string): boolean {
    return this.toolRegistry.hasToolClass(toolId);
  }

  /**
   * Get all available tools
   */
  getAvailableTools() {
    return this.toolRegistry.getAllToolClasses();
  }

  private async resolveDependencies(): Promise<ToolDependencies> {
    // Core dependencies that all tools need
    const dependencies: ToolDependencies = {
      eventBus: this.container.getSync<TypedEventBus>('TypedEventBus'),
      canvasManager: this.container.getSync<CanvasManager>('CanvasManager'),
      commandManager: this.container.getSync<CommandManager>('CommandManager'),
      resourceManager: this.container.getSync<ResourceManager>('ResourceManager')
    };

    // Optional dependencies - only inject if available
    try {
      dependencies.selectionManager = this.container.getSync<SelectionManager>('SelectionManager');
    } catch {
      // Optional dependency not available
    }

    try {
      dependencies.filterManager = this.container.getSync<FilterManager>('FilterManager');
    } catch {
      // Optional dependency not available
    }

    return dependencies;
  }
}
