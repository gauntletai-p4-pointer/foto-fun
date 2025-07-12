import { BaseStore } from '../base/BaseStore'
import { ToolWithState, ToolState, BaseTool, type ToolDependencies } from '@/lib/editor/tools/base/BaseTool'
import type { ToolEvent, CanvasManager } from '@/lib/editor/canvas/types'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { ToolFactory } from '@/lib/editor/tools/base/ToolFactory'
import type { EventStore } from '@/lib/events/core/EventStore'

// Re-export types from EventToolOptionsStore for backwards compatibility
export type { ToolOption, ToolOptionsConfig } from './EventToolOptionsStore'
// Re-export ToolState from BaseTool
export type { ToolState } from '@/lib/editor/tools/base/BaseTool'

/**
 * Tool Store State
 */
export interface ToolStoreState {
  activeToolId: string | null;
  tools: Map<string, ToolWithState>;
  eventQueue: ToolEvent[];
  isActivating: boolean;
}

/**
 * Event-Driven Tool Store with Senior Architecture Patterns
 * - State machine for proper tool lifecycle
 * - Event queuing during activation to prevent race conditions  
 * - Dependency injection through ToolFactory
 * - Event-driven communication
 */
export class EventToolStore extends BaseStore<ToolStoreState> {
  constructor(
    eventStore: EventStore,
    private eventBus: TypedEventBus,
    private toolFactory: ToolFactory,
    private canvasManager: CanvasManager
  ) {
    super({
      activeToolId: null,
      tools: new Map(),
      eventQueue: [],
      isActivating: false
    }, eventStore);
    
    this.setupEventHandlers();
  }
  
  protected getEventHandlers(): Map<string, (event: any) => void> {
    return new Map();
  }
  
  /**
   * Register a tool with the store
   */
  async registerTool<T extends BaseTool>(
    ToolClass: new (deps: ToolDependencies) => T
  ): Promise<void> {
    const tool = await this.toolFactory.createTool(ToolClass);
    
    this.setState(state => ({
      ...state,
      tools: new Map(state.tools).set(tool.id, tool)
    }));
    
    this.eventBus.emit('tool.message', {
      toolId: tool.id,
      message: `Tool registered: ${tool.name}`,
      type: 'info'
    });
  }
  
  /**
   * Activate a tool with proper state management and race condition prevention
   */
  async activateTool(toolId: string): Promise<void> {
    const state = this.getState();
    const tool = state.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    
    // Prevent concurrent activations
    if (state.isActivating) {
      throw new Error('Another tool is currently activating');
    }
    
    // Check if tool can be activated
    if (!tool.canTransitionTo(ToolState.ACTIVATING)) {
      throw new Error(`Tool ${toolId} cannot be activated from state ${tool.state}`);
    }
    
    this.setState(currentState => ({
      ...currentState,
      isActivating: true
    }));
    
    try {
      // Deactivate current tool first
      if (state.activeToolId && state.activeToolId !== toolId) {
        await this.deactivateCurrentTool();
      }
      
      // Activate the new tool
      await tool.onActivate?.(this.canvasManager);
      
      this.setState(currentState => ({
        ...currentState,
        activeToolId: toolId,
        isActivating: false
      }));
      
      // Process any queued events
      this.processEventQueue();
      
      this.eventBus.emit('tool.activated', { 
        toolId,
        previousToolId: state.activeToolId !== toolId ? state.activeToolId : undefined
      });
      
    } catch (error) {
      // Reset tool state on activation failure
      tool.setState(ToolState.INACTIVE, `Activation failed: ${(error as Error).message}`);
      
      this.setState(currentState => ({
        ...currentState,
        isActivating: false
      }));
      
      throw error;
    }
  }

  /**
   * Deactivate a tool by ID - alias for compatibility
   */
  async deactivateTool(toolId?: string): Promise<void> {
    if (toolId) {
      const state = this.getState();
      if (state.activeToolId === toolId) {
        await this.deactivateCurrentTool();
      }
    } else {
      await this.deactivateCurrentTool();
    }
  }

  /**
   * Update tool option - delegates to EventToolOptionsStore
   * @deprecated Use EventToolOptionsStore directly via dependency injection
   */
  async updateOption(toolId: string, optionKey: string, value: unknown): Promise<void> {
    // This method is deprecated - tools should use EventToolOptionsStore directly
    this.eventBus.emit('tool.option.changed', {
      toolId,
      optionId: optionKey, // Using optionKey as optionId for backward compatibility
      optionKey,
      value
    });
  }
  
  /**
   * Deactivate the currently active tool
   */
  async deactivateCurrentTool(): Promise<void> {
    const state = this.getState();
    if (!state.activeToolId) return;
    
    const tool = state.tools.get(state.activeToolId);
    if (!tool) return;
    
    await tool.onDeactivate?.(this.canvasManager);
    
    this.eventBus.emit('tool.deactivated', { 
      toolId: state.activeToolId 
    });
    
    this.setState(currentState => ({
      ...currentState,
      activeToolId: null
    }));
  }
  
  /**
   * Get the currently active tool
   */
  getActiveTool(): ToolWithState | null {
    const state = this.getState();
    if (!state.activeToolId) return null;
    
    const tool = state.tools.get(state.activeToolId);
    return tool?.state === ToolState.ACTIVE ? tool : null;
  }
  
  /**
   * Get a tool by ID
   */
  getTool(toolId: string): ToolWithState | null {
    const state = this.getState();
    return state.tools.get(toolId) || null;
  }
  
  /**
   * Get all registered tools
   */
  getAllTools(): ToolWithState[] {
    const state = this.getState();
    return Array.from(state.tools.values());
  }
  
  /**
   * Queue events during tool activation to prevent race conditions
   */
  queueEvent(event: ToolEvent): void {
    const activeTool = this.getActiveTool();
    if (!activeTool) {
      // Tool not active yet, queue the event
      this.setState(state => ({
        ...state,
        eventQueue: [...state.eventQueue, event]
      }));
      return;
    }
    
    // Tool is active, process immediately
    this.processEvent(activeTool, event);
  }
  
  /**
   * Process all queued events once tool is active
   */
  private processEventQueue(): void {
    const activeTool = this.getActiveTool();
    if (!activeTool) return;
    
    const state = this.getState();
    const events = [...state.eventQueue];
    
    // Clear the queue
    this.setState(currentState => ({
      ...currentState,
      eventQueue: []
    }));
    
    // Process each event
    events.forEach(event => {
      this.processEvent(activeTool, event);
    });
  }
  
  /**
   * Process a single event with the active tool
   */
  private processEvent(tool: ToolWithState, event: ToolEvent): void {
    try {
      switch (event.type) {
        case 'mousedown':
          tool.onMouseDown?.(event);
          break;
        case 'mousemove':
          tool.onMouseMove?.(event);
          break;
        case 'mouseup':
          tool.onMouseUp?.(event);
          break;
        case 'keydown':
          tool.onKeyDown?.(event.nativeEvent as KeyboardEvent);
          break;
        case 'keyup':
          tool.onKeyUp?.(event.nativeEvent as KeyboardEvent);
          break;
      }
    } catch (error) {
      this.eventBus.emit('tool.message', {
        toolId: tool.id,
        message: `Error processing ${event.type} event: ${(error as Error).message}`,
        type: 'error'
      });
    }
  }
  
  /**
   * Check if a tool is currently active
   */
  isToolActive(toolId: string): boolean {
    const state = this.getState();
    return state.activeToolId === toolId;
  }
  
  /**
   * Get the active tool ID
   */
  getActiveToolId(): string | null {
    const state = this.getState();
    return state.activeToolId;
  }
  
  /**
   * Clear the event queue (useful for cleanup)
   */
  clearEventQueue(): void {
    this.setState(state => ({
      ...state,
      eventQueue: []
    }));
  }
  
  /**
   * Setup event handlers for tool communication
   */
  private setupEventHandlers(): void {
    // Listen for tool option changes
    this.eventBus.on('tool.option.changed', (data) => {
      const state = this.getState();
      const tool = state.tools.get(data.toolId);
      if (tool) {
        // Tool option was changed, could trigger UI updates
        this.eventBus.emit('tool.message', {
          toolId: data.toolId,
          message: `Option ${data.optionKey} changed to ${data.value}`,
          type: 'info'
        });
      }
    });
    
    // Listen for command execution results
    this.eventBus.on('command.completed', (data) => {
      const state = this.getState();
      if (state.activeToolId) {
        this.eventBus.emit('tool.message', {
          toolId: state.activeToolId,
          message: `Command completed: ${data.commandType}`,
          type: 'success'
        });
      }
    });
    
    this.eventBus.on('command.failed', (data) => {
      const state = this.getState();
      if (state.activeToolId) {
        this.eventBus.emit('tool.message', {
          toolId: state.activeToolId,
          message: `Command failed: ${data.error}`,
          type: 'error'
        });
      }
    });
  }
} 