import { BaseStore } from '../base/BaseStore';
import type { EventStore } from '@/lib/events/core/EventStore';
import type { Event } from '@/lib/events/core/Event';
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { ToolFactory } from '@/lib/editor/tools/base/ToolFactory';
import type { ToolRegistry, ToolClassMetadata } from '@/lib/editor/tools/base/ToolRegistry';
import { BaseTool, ToolState } from '@/lib/editor/tools/base/BaseTool';

interface ToolStoreState {
  activeToolId: string | null;
  previousToolId: string | null;
  isActivating: boolean;
  toolHistory: string[];
}

/**
 * Custom error for tool activation failures
 */
class ToolActivationError extends Error {
  constructor(
    public toolId: string,
    public originalError: Error
  ) {
    super(`Failed to activate tool ${toolId}: ${originalError.message}`);
    this.name = 'ToolActivationError';
  }
}

/**
 * Promise queue for preventing race conditions during tool activation
 */
class PromiseQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    
    this.isProcessing = false;
  }
}

/**
 * EventToolStore manages the single active tool instance with proper lifecycle management.
 * Follows the plan: transient tool instances, race condition prevention, command-first operations.
 */
export class EventToolStore extends BaseStore<ToolStoreState> {
  private activeTool: BaseTool | null = null;
  private activationQueue = new PromiseQueue();
  private lastUsedToolPerGroup = new Map<string, string>();

  constructor(
    eventStore: EventStore,
    private readonly eventBus: TypedEventBus,
    private readonly toolFactory: ToolFactory,
    private readonly toolRegistry: ToolRegistry,
    private readonly canvasManager: CanvasManager
  ) {
    super({
      activeToolId: null,
      previousToolId: null,
      isActivating: false,
      toolHistory: []
    }, eventStore);
  }

  /**
   * Activate a tool with proper state management and race condition prevention
   */
  async activateTool(toolId: string): Promise<void> {
    return this.activationQueue.add(async () => {
      await this.doActivateTool(toolId);
    });
  }

  private async doActivateTool(toolId: string): Promise<void> {
    const currentState = this.getState();
    if (currentState.activeToolId === toolId || currentState.isActivating) {
      return;
    }

    this.setState(state => ({ ...state, isActivating: true }));

    try {
      // Deactivate the current tool before activating the new one
      if (this.activeTool) {
        await this.deactivateTool();
      }

      // Create a new instance of the tool
      const newTool = await this.toolFactory.createTool(toolId);
      
      // The tool's constructor creates the instanceId. We can't access it directly,
      // but the tool's internal setState method will emit it with the events.
      // We will capture it from the event for the final 'store.tool.activated' event.
      let toolInstanceId = '';
      const unsub = this.eventBus.on('tool.state.changed', (data) => {
        if (data.toolId === toolId && data.to === ToolState.ACTIVATING) {
          toolInstanceId = data.instanceId;
          unsub();
        }
      });
      
      // Activate the new tool. This will call setState internally and trigger our listener above.
      await newTool.onActivate(this.canvasManager);
      this.activeTool = newTool;

      // Update state
      this.setState(state => ({
        ...state,
        activeToolId: toolId,
        toolHistory: [...state.toolHistory, toolId]
      }));
      
      const toolMetadata = this.toolRegistry.getToolClass(toolId);
      // Update last used tool for the group
      if (toolMetadata?.metadata.groupId) {
        this.lastUsedToolPerGroup.set(toolMetadata.metadata.groupId, toolId);
      }
      
      this.eventBus.emit('store.tool.activated', {
        toolId,
        instanceId: toolInstanceId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`Error activating tool ${toolId}:`, error);
      // Revert state if activation fails
      this.setState(state => ({
        ...state,
        activeToolId: null, // Or revert to previous tool
      }));
      throw new ToolActivationError(toolId, error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.setState(state => ({ ...state, isActivating: false }));
    }
  }

  /**
   * Activate a tool group - activates the last used tool in the group or default
   */
  async activateToolGroup(groupId: string): Promise<void> {
    const group = this.toolRegistry.getToolGroup(groupId);
    if (!group) {
      throw new Error(`Tool group ${groupId} not found`);
    }
    
    // Get last used tool from this group or default
    const toolId = this.lastUsedToolPerGroup.get(groupId) || group.defaultTool;
    
    await this.activateTool(toolId);
  }

  /**
   * Deactivate the currently active tool
   */
  async deactivateTool(): Promise<void> {
    if (!this.activeTool) {
      return;
    }

    const currentState = this.getState();
    const toolId = currentState.activeToolId;
    
          try {
        // Emit deactivating state event (tool handles internal state)
        this.eventBus.emit('tool.state.changed', {
          toolId: toolId || 'unknown',
          from: ToolState.ACTIVE,
          to: ToolState.DEACTIVATING,
          instanceId: `${toolId}-${Date.now()}`,
          timestamp: Date.now()
        });
        
        await this.activeTool.onDeactivate(this.canvasManager);
        
        // Emit inactive state event (tool handles internal state)
        this.eventBus.emit('tool.state.changed', {
          toolId: toolId || 'unknown',
          from: ToolState.DEACTIVATING,
          to: ToolState.INACTIVE,
          instanceId: `${toolId}-${Date.now()}`,
          timestamp: Date.now()
        });
      
      // Dispose tool instance
      await this.activeTool.dispose();
      
      // Clear active tool
      this.activeTool = null;
      
      // Update state
      this.setState(state => ({
        ...state,
        previousToolId: state.activeToolId,
        activeToolId: null
      }));

      // Emit deactivation event
      if (toolId) {
        this.eventBus.emit('store.tool.deactivated', {
          toolId,
          instanceId: `${toolId}-${Date.now()}`,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(`Error deactivating tool ${toolId}:`, error);
      throw error;
    }
  }

  /**
   * Get the currently active tool instance
   */
  getActiveTool(): BaseTool | null {
    return this.activeTool;
  }

  /**
   * Get a tool by ID (legacy method for compatibility)
   */
  getTool(toolId: string): BaseTool | null {
    // For the new architecture, we only have one active tool at a time
    const currentState = this.getState();
    if (currentState.activeToolId === toolId) {
      return this.activeTool;
    }
    return null;
  }

  /**
   * Get the active tool ID
   */
  getActiveToolId(): string | null {
    return this.getState().activeToolId;
  }

  /**
   * Get the currently active tool group
   */
  getActiveToolGroup(): string | null {
    const state = this.getState();
    if (!state.activeToolId) return null;
    
    const toolClass = this.toolRegistry.getToolClass(state.activeToolId);
    return toolClass?.metadata.groupId || null;
  }

  /**
   * Get the last used tool in a group
   */
  getLastUsedToolInGroup(groupId: string): string | null {
    const group = this.toolRegistry.getToolGroup(groupId);
    if (!group) return null;
    
    return this.lastUsedToolPerGroup.get(groupId) || group.defaultTool;
  }

  /**
   * Check if a specific tool can be activated
   */
  canActivateTool(toolId: string): boolean {
    const currentState = this.getState();
    
    // Can't activate during activation process
    if (currentState.isActivating) {
      return false;
    }

    // Check if tool is registered in the registry
    return this.toolRegistry.getToolClass(toolId) !== null;
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): ToolClassMetadata[] {
    return this.toolRegistry.getAllToolClasses();
  }

  /**
   * Check if tool is currently active
   */
  isToolActive(toolId: string): boolean {
    const currentState = this.getState();
    return currentState.activeToolId === toolId && 
           this.activeTool?.getState() === ToolState.ACTIVE;
  }

  /**
   * Required by BaseStore - setup event handlers
   */
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    const handlers = new Map<string, (event: Event) => void>();

    // Handle canvas state changes that might affect tools
    handlers.set('canvas.cleared', () => {
      // Optionally deactivate tools when canvas is cleared
    });

    handlers.set('canvas.object.selected', (_event: Event) => {
      // Tools might need to respond to selection changes
      if (this.activeTool) {
        // Could emit tool-specific events here
      }
    });

    return handlers;
  }
}

// Export stub types
export interface ToolOption {
  type: string;
  default: unknown;
}
