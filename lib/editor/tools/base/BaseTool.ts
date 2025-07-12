import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { CommandManager } from '@/lib/editor/commands/CommandManager';
import type { ResourceManager } from '@/lib/core/ResourceManager';
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager';
import type { ObjectManager } from '@/lib/editor/canvas/services/ObjectManager';
import type { EventBasedHistoryStore as HistoryManager } from '@/lib/events/history/EventBasedHistoryStore';
import type { EventToolOptionsStore } from '@/lib/store/tools/EventToolOptionsStore';
import type { CommandFactory } from '@/lib/editor/commands/base/CommandFactory';
import type { ToolEvent } from '@/lib/events/canvas/ToolEvents';

export interface ToolDependencies {
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  resourceManager: ResourceManager;
  selectionManager: SelectionManager;
  objectManager: ObjectManager;
  historyManager: HistoryManager;
  toolOptionsStore: EventToolOptionsStore;
  commandFactory: CommandFactory;
}

export enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING',
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',
  DEACTIVATING = 'DEACTIVATING'
}

// ToolEvent interface is now imported from ./ToolEvent.ts

export interface ToolOptions {
  [key: string]: string | number | boolean | Record<string, unknown> | undefined;
}

export abstract class BaseTool<T extends ToolOptions = ToolOptions> {
  protected readonly id: string;
  protected readonly instanceId: string;
  protected readonly dependencies: ToolDependencies;
  protected state: ToolState = ToolState.INACTIVE;
  
  cursor: string = 'default';
  private cleanupFunctions: Array<() => void | Promise<void>> = [];
  
  constructor(id: string, dependencies: ToolDependencies) {
    this.id = id;
    this.instanceId = `${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.dependencies = dependencies;
  }
  
  // Public getters for external access
  get toolId(): string {
    return this.id;
  }
  
  // State management
  protected setState(newState: ToolState): void {
    const oldState = this.state;
    this.state = newState;
    this.dependencies.eventBus.emit('tool.state.changed', {
      toolId: this.id,
      instanceId: this.instanceId,
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });
  }
  
  getState(): ToolState {
    return this.state;
  }
  
  // Lifecycle methods - MUST be implemented by subclasses
  abstract onActivate(canvas: CanvasManager): Promise<void>;
  abstract onDeactivate(canvas: CanvasManager): Promise<void>;
  
  // Event handlers - Override as needed
  onMouseDown?(event: ToolEvent): void;
  onMouseMove?(event: ToolEvent): void;
  onMouseUp?(event: ToolEvent): void;
  onKeyDown?(event: KeyboardEvent): void;
  onKeyUp?(event: KeyboardEvent): void;
  
  // Resource cleanup
  protected registerCleanup(cleanup: () => void | Promise<void>): void {
    this.cleanupFunctions.push(cleanup);
  }
  
  // Tool operation event emission methods
  protected emitOperation(operation: string, params: Record<string, unknown>): void {
    this.dependencies.eventBus.emit('tool.operation.requested', {
      toolId: this.id,
      instanceId: this.instanceId,
      operation,
      params,
      timestamp: Date.now()
    });
  }

  protected emitIntent(intent: string, context: Record<string, unknown>): void {
    this.dependencies.eventBus.emit('tool.intent', {
      toolId: this.id,
      instanceId: this.instanceId,
      intent,
      context,
      timestamp: Date.now()
    });
  }
  
  async dispose(): Promise<void> {
    // Run all cleanup functions
    for (const cleanup of this.cleanupFunctions) {
      try {
        await cleanup();
      } catch (error) {
        console.error('Tool cleanup error:', error);
      }
    }
    
    // Clear references
    this.cleanupFunctions = [];
  }
  
  // Options system (to be implemented by subclasses)
  protected getDefaultOptions(): T {
    return {} as T;
  }
  
  protected getOptionDefinitions(): Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select' | 'color';
    defaultValue?: string | number | boolean;
    label?: string;
    options?: Array<{ value: string | number; label: string; }>;
    min?: number;
    max?: number;
    step?: number;
  }> {
    return {};
  }
  
  protected getAllOptions(): T {
    const defaults = this.getDefaultOptions();
    
    // Get current options from tool options store
    if (this.dependencies.toolOptionsStore) {
      const currentOptions = this.dependencies.toolOptionsStore.getToolOptionValues(this.id);
      return { ...defaults, ...currentOptions } as T;
    }
    
    return defaults;
  }
  
  protected getOption<U extends T[keyof T]>(key: keyof T): U | undefined {
    const allOptions = this.getAllOptions();
    return allOptions[key] as U;
  }
  
  protected setOption(key: keyof T, value: T[keyof T]): void {
    // Emit option change event - the store will handle the update
    this.dependencies.eventBus.emit('tool.option.changed', {
      toolId: this.id,
      optionId: key as string,
      optionKey: key as string,
      value
    });
  }
}

export interface ToolWithState {
  getState(): ToolState;
}
