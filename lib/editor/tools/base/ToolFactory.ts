import type { ServiceContainer } from '@/lib/core/ServiceContainer';
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { CommandManager } from '@/lib/editor/commands/CommandManager';
import type { ResourceManager } from '@/lib/core/ResourceManager';
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager';
import type { ObjectManager } from '@/lib/editor/canvas/services/ObjectManager';
import type { EventBasedHistoryStore as HistoryManager } from '@/lib/events/history/EventBasedHistoryStore';
import type { EventToolOptionsStore } from '@/lib/store/tools/EventToolOptionsStore';
import type { CommandFactory } from '@/lib/editor/commands/base/CommandFactory';
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

    const dependencies = this.resolveDependencies();
    const tool = new toolClass.ToolClass(toolId, dependencies);
    
    return tool;
  }

  /**
   * Resolve all mandatory dependencies for tools
   */
  private resolveDependencies(): ToolDependencies {
    // All dependencies are mandatory - use strict getSync for all
    const dependencies: ToolDependencies = {
      eventBus: this.container.getSync<TypedEventBus>('TypedEventBus'),
      canvasManager: this.container.getSync<CanvasManager>('CanvasManager'),
      commandManager: this.container.getSync<CommandManager>('CommandManager'),
      resourceManager: this.container.getSync<ResourceManager>('ResourceManager'),
      selectionManager: this.container.getSync<SelectionManager>('SelectionManager'),
      objectManager: this.container.getSync<ObjectManager>('ObjectManager'),
      historyManager: this.container.getSync<HistoryManager>('HistoryStore'),
      toolOptionsStore: this.container.getSync<EventToolOptionsStore>('ToolOptionsStore'),
      commandFactory: this.container.getSync<CommandFactory>('CommandFactory')
    };

    return dependencies;
  }
}
