import { Event } from '../core/Event'
import type { Selection, Rect } from '@/lib/editor/canvas/types'
import type { CanvasObject } from '@/lib/editor/objects/types'

/**
 * ToolEvent interface - THE SINGLE SOURCE OF TRUTH
 * This replaces all scattered ToolEvent interfaces across the codebase
 */
export interface ToolEvent {
  // Mouse coordinates (viewport space)
  x: number;
  y: number;
  button?: number;
  buttons?: number;
  
  // Keyboard modifiers
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  
  // Canvas coordinates (canvas space, transformed)
  canvasX: number;
  canvasY: number;
  
  // Touch/pressure support
  pressure?: number;
  
  // Event metadata
  timestamp: number;
  eventType: 'mousedown' | 'mousemove' | 'mouseup' | 'keydown' | 'keyup' | 'wheel';
  
  // Event control
  preventDefault(): void;
  stopPropagation(): void;
  
  // Additional context
  target?: any; // Konva.Node
  nativeEvent?: MouseEvent | KeyboardEvent;
}

/**
 * Helper function to create a ToolEvent from a Konva event
 */
export function createToolEvent(
  konvaEvent: any,
  eventType: ToolEvent['eventType']
): ToolEvent {
  const stage = konvaEvent.target?.getStage();
  const pointerPosition = stage?.getPointerPosition() || { x: 0, y: 0 };
  
  // Get canvas coordinates (considering zoom and pan)
  const camera = stage?.getCamera?.() || { x: 0, y: 0, zoom: 1 };
  const canvasX = (pointerPosition.x - camera.x) / camera.zoom;
  const canvasY = (pointerPosition.y - camera.y) / camera.zoom;
  
  return {
    x: konvaEvent.evt?.clientX || pointerPosition.x,
    y: konvaEvent.evt?.clientY || pointerPosition.y,
    button: konvaEvent.evt?.button,
    buttons: konvaEvent.evt?.buttons,
    ctrlKey: konvaEvent.evt?.ctrlKey || false,
    shiftKey: konvaEvent.evt?.shiftKey || false,
    altKey: konvaEvent.evt?.altKey || false,
    metaKey: konvaEvent.evt?.metaKey || false,
    canvasX,
    canvasY,
    pressure: (konvaEvent.evt as any)?.pressure || 1.0,
    timestamp: Date.now(),
    eventType,
    preventDefault: () => konvaEvent.evt?.preventDefault(),
    stopPropagation: () => konvaEvent.evt?.stopPropagation(),
    target: konvaEvent.target,
    nativeEvent: konvaEvent.evt
  };
}

/**
 * Helper function to create a keyboard ToolEvent
 */
export function createKeyboardToolEvent(
  keyboardEvent: KeyboardEvent,
  eventType: 'keydown' | 'keyup'
): ToolEvent {
  return {
    x: 0,
    y: 0,
    canvasX: 0,
    canvasY: 0,
    ctrlKey: keyboardEvent.ctrlKey,
    shiftKey: keyboardEvent.shiftKey,
    altKey: keyboardEvent.altKey,
    metaKey: keyboardEvent.metaKey,
    timestamp: Date.now(),
    eventType,
    preventDefault: () => keyboardEvent.preventDefault(),
    stopPropagation: () => keyboardEvent.stopPropagation(),
    nativeEvent: keyboardEvent
  };
}

// Define state interfaces for events
interface SelectionState {
  selection: Selection | null
  version: number
}

interface CanvasState {
  objects: CanvasObject[]
  selectedObjectIds: string[]
  camera: { x: number; y: number; zoom: number }
}

/**
 * SELECTION EVENTS
 */
export class SelectionCreatedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly selection: Selection,
    metadata: Event['metadata']
  ) {
    super('selection.created', canvasId, 'canvas', metadata)
  }

  apply(currentState: SelectionState): SelectionState {
    return {
      ...currentState,
      selection: this.selection,
      version: currentState.version + 1
    }
  }

  canApply(currentState: SelectionState): boolean {
    return currentState.selection === null
  }

  reverse(): SelectionClearedEvent {
    return new SelectionClearedEvent(
      this.canvasId,
      this.selection,
      null,
      this.metadata
    )
  }

  getDescription(): string {
    return `Create selection in canvas ${this.canvasId}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      selection: this.selection
    }
  }
}

export class SelectionModifiedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly oldSelection: Selection,
    public readonly newSelection: Selection,
    metadata: Event['metadata']
  ) {
    super('selection.modified', canvasId, 'canvas', metadata)
  }

  apply(currentState: SelectionState): SelectionState {
    return {
      ...currentState,
      selection: this.newSelection,
      version: currentState.version + 1
    }
  }

  canApply(currentState: SelectionState): boolean {
    return currentState.selection !== null
  }

  reverse(): SelectionModifiedEvent {
    return new SelectionModifiedEvent(
      this.canvasId,
      this.newSelection,
      this.oldSelection,
      this.metadata
    )
  }

  getDescription(): string {
    return `Modify selection in canvas ${this.canvasId}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      oldSelection: this.oldSelection,
      newSelection: this.newSelection
    }
  }
}

export class SelectionClearedEvent extends Event {
  constructor(
    public readonly canvasId: string,
    public readonly clearedSelection: Selection,
    public readonly previousSelection: Selection | null,
    metadata: Event['metadata']
  ) {
    super('selection.cleared', canvasId, 'canvas', metadata)
  }

  apply(currentState: SelectionState): SelectionState {
    return {
      ...currentState,
      selection: null,
      version: currentState.version + 1
    }
  }

  canApply(currentState: SelectionState): boolean {
    return currentState.selection !== null
  }

  reverse(): SelectionCreatedEvent | null {
    if (this.previousSelection) {
      return new SelectionCreatedEvent(
        this.canvasId,
        this.previousSelection,
        this.metadata
      )
    }
    return null
  }

  getDescription(): string {
    return `Clear selection in canvas ${this.canvasId}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      canvasId: this.canvasId,
      clearedSelection: this.clearedSelection,
      previousSelection: this.previousSelection
    }
  }
}

/**
 * DRAWING EVENTS
 */
export class DrawingStartedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly canvasId: string,
    public readonly position: { x: number; y: number },
    public readonly point: { x: number; y: number; pressure?: number },
    public readonly options: Record<string, unknown>,
    metadata: Event['metadata']
  ) {
    super('drawing.started', `${canvasId}.${toolId}`, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Start drawing with ${this.toolId} at (${this.position.x}, ${this.position.y})`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      canvasId: this.canvasId,
      position: this.position,
      point: this.point,
      options: this.options
    }
  }
}

export class DrawingUpdatedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly canvasId: string,
    public readonly position: { x: number; y: number },
    metadata: Event['metadata']
  ) {
    super('drawing.updated', `${canvasId}.${toolId}`, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Update drawing with ${this.toolId} at (${this.position.x}, ${this.position.y})`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      canvasId: this.canvasId,
      position: this.position
    }
  }
}

export class DrawingCompletedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly canvasId: string,
    public readonly path: string | Record<string, unknown>,
    public readonly result: Record<string, unknown>,
    public readonly pathId: string,
    metadata: Event['metadata']
  ) {
    super('drawing.completed', `${canvasId}.${toolId}`, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Complete drawing with ${this.toolId} (path: ${this.pathId})`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      canvasId: this.canvasId,
      path: this.path,
      result: this.result,
      pathId: this.pathId
    }
  }
}

/**
 * TOOL EVENTS
 */
export class ToolActivatedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly toolName: string,
    public readonly instanceId: string,
    metadata: Event['metadata']
  ) {
    super('tool.activated', toolId, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Activate ${this.toolName} tool`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      toolName: this.toolName,
      instanceId: this.instanceId
    }
  }
}

export class ToolDeactivatedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly toolName: string,
    public readonly instanceId: string,
    metadata: Event['metadata']
  ) {
    super('tool.deactivated', toolId, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Deactivate ${this.toolName} tool`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      toolName: this.toolName,
      instanceId: this.instanceId
    }
  }
}

export class ToolStateChangedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly instanceId: string,
    public readonly from: string,
    public readonly to: string,
    metadata: Event['metadata']
  ) {
    super('tool.state.changed', toolId, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): ToolStateChangedEvent {
    return new ToolStateChangedEvent(
      this.toolId,
      this.instanceId,
      this.to,
      this.from,
      this.metadata
    )
  }

  getDescription(): string {
    return `Tool ${this.toolId} state changed from ${this.from} to ${this.to}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      instanceId: this.instanceId,
      from: this.from,
      to: this.to
    }
  }
}

export class ToolOptionChangedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly optionId: string,
    public readonly value: unknown,
    public readonly previousValue: unknown,
    metadata: Event['metadata']
  ) {
    super('tool.option.changed', `${toolId}.${optionId}`, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): ToolOptionChangedEvent {
    return new ToolOptionChangedEvent(
      this.toolId,
      this.optionId,
      this.previousValue,
      this.value,
      this.metadata
    )
  }

  getDescription(): string {
    return `Change ${this.optionId} to ${this.value}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      optionId: this.optionId,
      value: this.value,
      previousValue: this.previousValue
    }
  }
}

export class ToolOperationRequestedEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly instanceId: string,
    public readonly operation: string,
    public readonly params: any,
    metadata: Event['metadata']
  ) {
    super('tool.operation.requested', toolId, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Tool ${this.toolId} requested operation: ${this.operation}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      instanceId: this.instanceId,
      operation: this.operation,
      params: this.params
    }
  }
}

export class ToolIntentEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly instanceId: string,
    public readonly intent: string,
    public readonly context: any,
    metadata: Event['metadata']
  ) {
    super('tool.intent', toolId, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Tool ${this.toolId} intent: ${this.intent}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      instanceId: this.instanceId,
      intent: this.intent,
      context: this.context
    }
  }
}

export class ToolErrorEvent extends Event {
  constructor(
    public readonly toolId: string,
    public readonly instanceId: string,
    public readonly error: Error,
    public readonly operation: string,
    metadata: Event['metadata']
  ) {
    super('tool.error', toolId, 'tool', metadata)
  }

  apply(currentState: unknown): unknown {
    return currentState
  }

  canApply(): boolean {
    return true
  }

  reverse(): null {
    return null
  }

  getDescription(): string {
    return `Tool ${this.toolId} error in ${this.operation}: ${this.error.message}`
  }

  protected getEventData(): Record<string, unknown> {
    return {
      toolId: this.toolId,
      instanceId: this.instanceId,
      error: {
        message: this.error.message,
        stack: this.error.stack,
        name: this.error.name
      },
      operation: this.operation
    }
  }
} 