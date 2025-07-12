import { BaseStore } from '../base/BaseStore';
import type { EventStore } from '@/lib/events/core/EventStore';
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
    const instanceId = this.activeTool.instanceId; // Store before disposal
    
          try {
        // Transition tool to deactivating state with lifecycle events
        this.activeTool.transitionTo(ToolState.DEACTIVATING);
        this.eventBus.emit('tool.state.changed', {
          toolId: toolId || 'unknown',
          from: ToolState.ACTIVE,
          to: ToolState.DEACTIVATING,
          instanceId: instanceId,
          timestamp: Date.now()
        });
        
        await this.activeTool.onDeactivate();
        
        this.activeTool.transitionTo(ToolState.INACTIVE);
        this.eventBus.emit('tool.state.changed', {
          toolId: toolId || 'unknown',
          from: ToolState.DEACTIVATING,
          to: ToolState.INACTIVE,
          instanceId: instanceId,
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
          instanceId: instanceId,
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

    // Check if tool is registered
    return this.toolFactory.canCreateTool(toolId);
  }

  /**
   * Get all available tools
   */
  getAvailableTools(): ToolClassMetadata[] {
    return this.toolFactory.getAvailableTools();
  }

  /**
   * Check if tool is currently active
   */
  isToolActive(toolId: string): boolean {
    const currentState = this.getState();
    return currentState.activeToolId === toolId && 
           this.activeTool?.getState() === ToolState.ACTIVE;
  }

  private async doActivateTool(toolId: string): Promise<void> {
    const currentState = this.getState();
    
    // Check if already active
    if (currentState.activeToolId === toolId && this.activeTool?.getState() === ToolState.ACTIVE) {
      return;
    }

    // Mark as activating
    this.setState(state => ({ ...state, isActivating: true }));

    try {
      // Deactivate current tool first
      if (this.activeTool) {
        await this.deactivateTool();
      }

      // Create fresh tool instance
      const tool = await this.toolFactory.createTool(toolId);
      
      // Activate the tool with lifecycle events
      tool.transitionTo(ToolState.ACTIVATING);
      this.eventBus.emit('tool.state.changed', {
        toolId,
        from: ToolState.INACTIVE,
        to: ToolState.ACTIVATING,
        instanceId: tool.instanceId,
        timestamp: Date.now()
      });
      
      await tool.onActivate();
      
      tool.transitionTo(ToolState.ACTIVE);
      this.eventBus.emit('tool.state.changed', {
        toolId,
        from: ToolState.ACTIVATING,
        to: ToolState.ACTIVE,
        instanceId: tool.instanceId,
        timestamp: Date.now()
      });
      
      // Store as active tool
      this.activeTool = tool;
      
      // Remember last used tool in group
      const toolClass = this.toolRegistry.getToolClass(toolId);
      if (toolClass?.metadata.groupId) {
        this.lastUsedToolPerGroup.set(toolClass.metadata.groupId, toolId);
      }
      
      // Update state
      this.setState(state => ({
        ...state,
        previousToolId: state.activeToolId,
        activeToolId: toolId,
        isActivating: false,
        toolHistory: [toolId, ...state.toolHistory.slice(0, 9)]
      }));

      // Emit activation event
      this.eventBus.emit('store.tool.activated', {
        toolId,
        instanceId: tool.instanceId,
        timestamp: Date.now()
      });

          } catch (error) {
        // Reset activating state on error
        this.setState(state => ({ ...state, isActivating: false }));
        
        // Create typed error
        const toolError = error instanceof Error ? error : new Error(String(error));
        const activationError = new ToolActivationError(toolId, toolError);
        
        // Fallback to move tool if not already trying move tool
        if (toolId !== 'move') {
          console.warn(`Tool activation failed for ${toolId}, falling back to move tool`, activationError);
          try {
            await this.doActivateTool('move');
          } catch (fallbackError) {
            console.error('Fallback to move tool also failed:', fallbackError);
          }
        }
        
        throw activationError;
      }
  }

  /**
   * Required by BaseStore - setup event handlers
   */
  protected getEventHandlers(): Map<string, (event: any) => void> {
    const handlers = new Map<string, (event: any) => void>();

    // Handle canvas state changes that might affect tools
    handlers.set('canvas.cleared', () => {
      // Optionally deactivate tools when canvas is cleared
    });

    handlers.set('canvas.object.selected', (event: any) => {
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
  default: any;
}
