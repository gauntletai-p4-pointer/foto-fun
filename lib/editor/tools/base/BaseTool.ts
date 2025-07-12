import type { TypedEventBus } from '@/lib/events/core/TypedEventBus';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { CommandManager } from '@/lib/editor/commands/CommandManager';
import type { ResourceManager } from '@/lib/core/ResourceManager';
import type { SelectionManager } from '@/lib/editor/selection/SelectionManager';
import type { FilterManager } from '@/lib/editor/filters/FilterManager';
import type { Command } from '@/lib/editor/commands/base/Command';
import type { CommandContext } from '@/lib/editor/commands/base/Command';
import React from 'react';

export interface ToolDependencies {
  eventBus: TypedEventBus;
  canvasManager: CanvasManager;
  commandManager: CommandManager;
  resourceManager: ResourceManager;
  selectionManager?: SelectionManager;
  filterManager?: FilterManager;
}

export enum ToolState {
  INACTIVE = 'INACTIVE',
  ACTIVATING = 'ACTIVATING',
  ACTIVE = 'ACTIVE',
  WORKING = 'WORKING',
  DEACTIVATING = 'DEACTIVATING'
}

export interface ToolEvent {
  x: number;
  y: number;
  button?: number;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  type?: string;
  target?: any;
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

export interface ToolOptions {
  [key: string]: any;
}

export abstract class BaseTool {
  abstract id: string;
  abstract name: string;
  abstract icon: React.ComponentType;
  
  readonly instanceId: string = '';
  cursor: string = 'default';
  
  private state = ToolState.INACTIVE;
  private stateTransitions = new Map<string, Set<ToolState>>();
  private cleanupTasks: Array<() => void> = [];
  
  constructor(protected dependencies: ToolDependencies) {
    this.setupStateTransitions();
  }
  
  private setupStateTransitions(): void {
    this.stateTransitions.set(ToolState.INACTIVE, new Set([ToolState.ACTIVATING]));
    this.stateTransitions.set(ToolState.ACTIVATING, new Set([ToolState.ACTIVE, ToolState.INACTIVE]));
    this.stateTransitions.set(ToolState.ACTIVE, new Set([ToolState.WORKING, ToolState.DEACTIVATING]));
    this.stateTransitions.set(ToolState.WORKING, new Set([ToolState.ACTIVE, ToolState.DEACTIVATING]));
    this.stateTransitions.set(ToolState.DEACTIVATING, new Set([ToolState.INACTIVE]));
  }
  
  transitionTo(newState: ToolState): void {
    const allowedTransitions = this.stateTransitions.get(this.state);
    if (!allowedTransitions?.has(newState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${newState} for tool ${this.id}`);
    }
    
    const oldState = this.state;
    this.state = newState;
    this.onStateChange(oldState, newState);
    
    // Emit state change event
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
  
  protected canHandleEvents(): boolean {
    return this.state === ToolState.ACTIVE || this.state === ToolState.WORKING;
  }
  
  // Event handlers with state guards
  onMouseMove(event: ToolEvent): void {
    if (!this.canHandleEvents()) return;
    this.handleMouseMove(event);
  }
  
  onMouseDown(event: ToolEvent): void {
    if (!this.canHandleEvents()) return;
    this.transitionTo(ToolState.WORKING);
    this.handleMouseDown(event);
  }
  
  onMouseUp(event: ToolEvent): void {
    if (this.state === ToolState.WORKING) {
      this.transitionTo(ToolState.ACTIVE);
    }
    this.handleMouseUp(event);
  }
  
  onKeyDown(event: KeyboardEvent): void {
    if (!this.canHandleEvents()) return;
    this.handleKeyDown(event);
  }
  
  onKeyUp(event: KeyboardEvent): void {
    if (!this.canHandleEvents()) return;
    this.handleKeyUp(event);
  }
  
  // Lifecycle methods
  async onActivate(): Promise<void> {
    this.transitionTo(ToolState.ACTIVATING);
    try {
      await this.setupTool();
      this.transitionTo(ToolState.ACTIVE);
    } catch (error) {
      this.transitionTo(ToolState.INACTIVE);
      throw error;
    }
  }
  
  async onDeactivate(): Promise<void> {
    this.transitionTo(ToolState.DEACTIVATING);
    try {
      await this.cleanupTool();
    } finally {
      this.transitionTo(ToolState.INACTIVE);
    }
  }
  
  // Command execution helper
  protected async executeCommand(command: Command): Promise<void> {
    const result = await this.dependencies.commandManager.executeCommand(command);
    if (!result.success) {
      throw new Error(result.error.message);
    }
  }
  
  // Helper to get command context
  protected getCommandContext(): CommandContext {
    return {
      canvasManager: this.dependencies.canvasManager,
      selectionManager: this.dependencies.selectionManager!,
      eventBus: this.dependencies.eventBus,
      executionId: `${this.id}-${Date.now()}`,
      timestamp: Date.now()
    };
  }
  
  // Tool operation event emission methods - NEW
  protected emitOperation(operation: string, params: any): void {
    this.dependencies.eventBus.emit('tool.operation.requested', {
      toolId: this.id,
      instanceId: this.instanceId,
      operation,
      params,
      timestamp: Date.now()
    });
  }

  protected emitIntent(intent: string, context: any): void {
    this.dependencies.eventBus.emit('tool.intent', {
      toolId: this.id,
      instanceId: this.instanceId,
      intent,
      context,
      timestamp: Date.now()
    });
  }
  
  // Resource cleanup system
  protected registerCleanup(cleanup: () => void): void {
    this.cleanupTasks.push(cleanup);
  }
  
  async dispose(): Promise<void> {
    // Run all cleanup tasks
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.error('Tool cleanup error:', error);
      }
    }
    
    // Clear references
    this.cleanupTasks = [];
    (this.dependencies as any) = null;
  }
  
  // Options system (to be implemented by subclasses)
  protected getDefaultOptions(): Record<string, any> {
    return {};
  }
  
  protected getOptionDefinitions(): Record<string, any> {
    return {};
  }
  
  protected getAllOptions(): Record<string, any> {
    const defaults = this.getDefaultOptions();
    // TODO: Integrate with EventToolOptionsStore when available
    // const current = this.dependencies.toolOptionsStore?.getOptions(this.id) || {};
    // return { ...defaults, ...current };
    return defaults;
  }
  
  // Abstract methods that must be implemented by subclasses
  protected abstract onStateChange(from: ToolState, to: ToolState): void;
  protected abstract handleMouseMove(event: ToolEvent): void;
  protected abstract handleMouseDown(event: ToolEvent): void;
  protected abstract handleMouseUp(event: ToolEvent): void;
  protected abstract handleKeyDown(event: KeyboardEvent): void;
  protected abstract handleKeyUp(event: KeyboardEvent): void;
  protected abstract setupTool(): Promise<void>;
  protected abstract cleanupTool(): Promise<void>;
}

export interface ToolWithState {
  getState(): ToolState;
}
