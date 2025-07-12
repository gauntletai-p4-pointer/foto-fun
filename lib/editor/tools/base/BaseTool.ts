import type { Tool, ToolEvent } from '@/lib/editor/canvas/types'
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import type { TypedEventBus } from '@/lib/events/core/TypedEventBus'
import type { CommandManager } from '@/lib/editor/commands/CommandManager'
import type { ResourceManager } from '@/lib/core/ResourceManager'
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager'
import type { FilterManager } from '@/lib/editor/filters/FilterManager'
import type { Command, CommandContext } from '@/lib/editor/commands/base/Command'

/**
 * Tool State Machine States
 */
export enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING', 
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',
  DEACTIVATING = 'DEACTIVATING'
}

/**
 * Tool State Transition Record
 */
export interface ToolStateTransition {
  from: ToolState;
  to: ToolState;
  timestamp: number;
  reason?: string;
}

/**
 * Tool Dependencies for Dependency Injection
 */
export interface ToolDependencies {
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  resourceManager: ResourceManager;
  selectionManager?: SelectionManager;
  filterManager?: FilterManager;
}

/**
 * Tool Option Definition for Type Safety
 */
export interface ToolOptionDefinition<T = any> {
  type: 'number' | 'string' | 'boolean' | 'color' | 'enum';
  default: T;
  min?: number;
  max?: number;
  enum?: T[];
  validator?: (value: T) => boolean;
  description?: string;
}

/**
 * Tool Options Interface
 */
export interface ToolOptions {
  [key: string]: ToolOptionDefinition;
}

/**
 * Tool with State Machine Interface
 */
export interface ToolWithState extends Tool {
  state: ToolState;
  canTransitionTo(newState: ToolState): boolean;
  setState(newState: ToolState, reason?: string): void;
}

/**
 * Enhanced Base Tool with Senior Architecture Patterns
 * - State Machine for proper lifecycle management
 * - Dependency Injection for all services
 * - Event-driven communication
 * - Command pattern integration
 * - Type-safe options system
 */
export abstract class BaseTool<TOptions extends ToolOptions = {}> implements ToolWithState {
  // Required Tool interface properties
  abstract id: string;
  abstract name: string;
  abstract icon: React.ComponentType;
  abstract cursor: string;
  shortcut?: string;
  
  // State machine
  state: ToolState = ToolState.INACTIVE;
  private stateHistory: ToolStateTransition[] = [];
  
  // Dependencies (injected)
  protected dependencies: ToolDependencies;
  
  // Type-safe options
  protected options: Record<string, any> = {};
  
  constructor(dependencies: ToolDependencies) {
    this.dependencies = dependencies;
    this.initializeOptions();
  }
  
  // State machine implementation
  setState(newState: ToolState, reason?: string): void {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Invalid transition from ${this.state} to ${newState}`);
    }
    
    const transition: ToolStateTransition = {
      from: this.state,
      to: newState,
      timestamp: Date.now(),
      reason
    };
    
    this.state = newState;
    this.stateHistory.push(transition);
    
    // Emit tool message event with state change information
    this.dependencies.eventBus.emit('tool.message', {
      toolId: this.id,
      message: `State changed from ${transition.from} to ${transition.to}`,
      type: 'info',
      metadata: { transition }
    });
  }
  
  canTransitionTo(newState: ToolState): boolean {
    const validTransitions: Record<ToolState, ToolState[]> = {
      [ToolState.INACTIVE]: [ToolState.ACTIVATING],
      [ToolState.ACTIVATING]: [ToolState.ACTIVE, ToolState.INACTIVE],
      [ToolState.ACTIVE]: [ToolState.WORKING, ToolState.DEACTIVATING],
      [ToolState.WORKING]: [ToolState.ACTIVE, ToolState.DEACTIVATING],
      [ToolState.DEACTIVATING]: [ToolState.INACTIVE]
    };
    
    return validTransitions[this.state]?.includes(newState) ?? false;
  }
  
  // Safe event handlers with state guards
  onMouseDown?(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE) return;
    this.setState(ToolState.WORKING, 'Mouse interaction started');
    this.handleMouseDown(event);
  }
  
  onMouseMove?(event: ToolEvent): void {
    if (this.state !== ToolState.ACTIVE && this.state !== ToolState.WORKING) return;
    this.handleMouseMove(event);
  }
  
  onMouseUp?(event: ToolEvent): void {
    if (this.state !== ToolState.WORKING) return;
    this.handleMouseUp(event);
    this.setState(ToolState.ACTIVE, 'Mouse interaction completed');
  }
  
  // Abstract methods for tool-specific logic
  protected abstract getOptionDefinitions(): TOptions;
  protected abstract handleMouseDown(event: ToolEvent): void;
  protected abstract handleMouseMove(event: ToolEvent): void;
  protected abstract handleMouseUp(event: ToolEvent): void;
  
  // Command pattern integration
  protected async executeCommand(command: Command): Promise<void> {
    const result = await this.dependencies.commandManager.executeCommand(command);
    if (result.success) {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        message: `Command executed: ${command.constructor.name}`,
        type: 'success'
      });
    } else {
      this.dependencies.eventBus.emit('tool.message', {
        toolId: this.id,
        message: `Command failed: ${result.error.message}`,
        type: 'error'
      });
    }
  }

  // Command context creation for tools
  protected getCommandContext(): CommandContext {
    if (!this.dependencies.selectionManager) {
      throw new Error(`Tool ${this.id} requires SelectionManager dependency for command execution`);
    }
    
    return {
      eventBus: this.dependencies.eventBus,
      canvasManager: this.dependencies.canvasManager,
      selectionManager: this.dependencies.selectionManager,
      executionId: this.generateExecutionId(),
      timestamp: Date.now()
    };
  }

  private generateExecutionId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Type-safe options system
  private initializeOptions(): void {
    const definitions = this.getOptionDefinitions();
    Object.entries(definitions).forEach(([key, definition]) => {
      this.options[key] = definition.default;
    });
  }
  
  setOption<K extends keyof TOptions>(
    key: K, 
    value: TOptions[K]['default']
  ): void {
    const definition = this.getOptionDefinitions()[key];
    if (definition.validator && !definition.validator(value)) {
      throw new Error(`Invalid value for option ${String(key)}: ${value}`);
    }
    
    this.options[String(key)] = value;
    this.dependencies.eventBus.emit('tool.option.changed', {
      toolId: this.id,
      optionId: String(key),
      optionKey: String(key),
      value
    });
  }
  
  getOption<K extends keyof TOptions>(key: K): TOptions[K]['default'] {
    return this.options[String(key)];
  }
  
  // Tool lifecycle methods
  async onActivate(): Promise<void> {
    this.setState(ToolState.ACTIVATING, 'Tool activation requested');
    await this.setupTool();
    this.setState(ToolState.ACTIVE, 'Tool activation completed');
  }
  
  async onDeactivate(): Promise<void> {
    this.setState(ToolState.DEACTIVATING, 'Tool deactivation requested');
    await this.cleanupTool();
    this.setState(ToolState.INACTIVE, 'Tool deactivation completed');
  }
  
  protected abstract setupTool(): Promise<void>;
  protected abstract cleanupTool(): Promise<void>;
  
  // Utility methods for accessing dependencies
  protected getCanvas(): CanvasManager {
    return this.dependencies.canvasManager;
  }
  
  protected getEventBus(): TypedEventBus {
    return this.dependencies.eventBus;
  }
  
  protected getCommandManager(): CommandManager {
    return this.dependencies.commandManager;
  }
  
  protected getResourceManager(): ResourceManager {
    return this.dependencies.resourceManager;
  }
  
  protected getSelectionManager(): SelectionManager | undefined {
    return this.dependencies.selectionManager;
  }
  
  protected getFilterManager(): FilterManager | undefined {
    return this.dependencies.filterManager;
  }
  
  // Resource management helpers
  protected registerEventListener<K extends keyof WindowEventMap>(
    id: string,
    target: EventTarget,
    event: K,
    handler: (ev: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void {
    this.getResourceManager().registerEventListener(id, target, event, handler, options);
  }
  
  protected registerCleanup(id: string, cleanup: () => void | Promise<void>): void {
    this.getResourceManager().registerCleanup(id, cleanup);
  }
  
  protected registerInterval(id: string, callback: () => void, delay: number): NodeJS.Timeout {
    return this.getResourceManager().registerInterval(id, callback, delay);
  }
  
  protected registerTimeout(id: string, callback: () => void, delay: number): NodeJS.Timeout {
    return this.getResourceManager().registerTimeout(id, callback, delay);
  }
  
  protected registerAnimationFrame(id: string, callback: (time: number) => void): number {
    return this.getResourceManager().registerAnimationFrame(id, callback);
  }
  
  // State introspection
  getStateHistory(): ToolStateTransition[] {
    return [...this.stateHistory];
  }
  
  getLastTransition(): ToolStateTransition | null {
    return this.stateHistory[this.stateHistory.length - 1] || null;
  }
  
  isActive(): boolean {
    return this.state === ToolState.ACTIVE || this.state === ToolState.WORKING;
  }
  
  isWorking(): boolean {
    return this.state === ToolState.WORKING;
  }
} 