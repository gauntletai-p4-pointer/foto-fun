import { Event } from '../core/Event'
import { EventStore } from '../core/EventStore'
import { BaseStore } from '@/lib/store/base/BaseStore'
import type { CanvasManager } from '@/lib/editor/canvas/types'
import { TypedEventBus } from '../core/TypedEventBus'
import { SnapshotManager } from './SnapshotManager'

export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  undoStack: Event[]
  redoStack: Event[]
  currentEventId: string | null
  totalEvents: number
}

/**
 * Event-based history store for undo/redo functionality
 * 
 * This store tracks all events and provides time-travel debugging
 * capabilities by replaying events from the beginning.
 */
export class EventBasedHistoryStore extends BaseStore<HistoryState> {
  private historyEventStore: EventStore
  private canvasManager: CanvasManager | null = null
  private typedEventBus: TypedEventBus
  private snapshotManager: SnapshotManager
  
  constructor(eventStore: EventStore, typedEventBus: TypedEventBus) {
    super({
      canUndo: false,
      canRedo: false,
      undoStack: [],
      redoStack: [],
      currentEventId: null,
      totalEvents: 0
    }, eventStore)
    
    this.historyEventStore = eventStore
    this.typedEventBus = typedEventBus
    this.snapshotManager = new SnapshotManager(eventStore, typedEventBus)
    
    // Subscribe to events
    this.subscribeToHistoryEvents()
  }
  
  private subscribeToHistoryEvents(): void {
    // Subscribe to all events to build history
    this.historyEventStore.subscribe('*', (event) => {
      this.handleEvent(event)
    })
    
    // Subscribe to snapshot events
    this.typedEventBus.on('history.snapshot.loaded', async (data) => {
      await this.navigateToEvent(data.eventId)
    })
  }
  
  protected getEventHandlers(): Map<string, (event: Event) => void> {
    // We use TypedEventBus subscriptions instead
    return new Map()
  }
  
  /**
   * Set the canvas manager for state restoration
   */
  setCanvasManager(canvasManager: CanvasManager): void {
    this.canvasManager = canvasManager
  }
  
  /**
   * Handle new events
   */
  private handleEvent(event: Event): void {
    // Skip history events
    if (event.type.startsWith('history.')) {
      return
    }
    
    // Add to undo stack
    this.setState(state => ({
      ...state,
      undoStack: [...state.undoStack, event],
      redoStack: [], // Clear redo stack on new action
      currentEventId: event.id,
      canUndo: true,
      canRedo: false,
      totalEvents: state.totalEvents + 1
    }))
    
    // Emit state change
    this.emitStateChange()
  }
  
  /**
   * Emit history state change event
   */
  private emitStateChange(): void {
    const state = this.getState()
          this.typedEventBus.emit('history.state.changed', {
        canUndo: state.canUndo,
        canRedo: state.canRedo,
        currentIndex: state.undoStack.length,
        currentEventId: state.currentEventId || undefined,
        totalEvents: state.totalEvents
      })
  }
  
  /**
   * Undo the last event
   */
  async undo(): Promise<void> {
    const state = this.getState()
    if (!state.canUndo || state.undoStack.length === 0) {
      return
    }
    
    const eventToUndo = state.undoStack[state.undoStack.length - 1]
    
    // Get the reverse event
    const reverseEvent = eventToUndo.reverse()
    if (!reverseEvent) {
      console.warn('Event cannot be undone:', eventToUndo.type)
      return
    }
    
    // Apply the reverse event
    await this.historyEventStore.append(reverseEvent)
    
    // Update state
    this.setState(state => ({
      ...state,
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, eventToUndo],
      currentEventId: reverseEvent.id,
      canUndo: state.undoStack.length > 1,
      canRedo: true
    }))
    
    // Emit navigation event
    this.typedEventBus.emit('history.navigated', {
      eventId: reverseEvent.id,
      timestamp: Date.now(),
      direction: 'undo' as const,
      fromEventId: eventToUndo.id,
      toEventId: reverseEvent.id
    })
    
    // Emit history event
    const historyEvent = new HistoryUndoEvent(eventToUndo.id)
    await this.historyEventStore.append(historyEvent)
    
    this.emitStateChange()
  }
  
  /**
   * Redo the last undone event
   */
  async redo(): Promise<void> {
    const state = this.getState()
    if (!state.canRedo || state.redoStack.length === 0) {
      return
    }
    
    const eventToRedo = state.redoStack[state.redoStack.length - 1]
    
    // Re-apply the original event
    await this.historyEventStore.append(eventToRedo)
    
    // Update state
    this.setState(state => ({
      ...state,
      undoStack: [...state.undoStack, eventToRedo],
      redoStack: state.redoStack.slice(0, -1),
      currentEventId: eventToRedo.id,
      canUndo: true,
      canRedo: state.redoStack.length > 1
    }))
    
    // Emit navigation event
    this.typedEventBus.emit('history.navigated', {
      eventId: eventToRedo.id,
      timestamp: Date.now(),
      direction: 'redo' as const,
      fromEventId: state.currentEventId,
      toEventId: eventToRedo.id
    })
    
    // Emit history event
    const historyEvent = new HistoryRedoEvent(eventToRedo.id)
    await this.historyEventStore.append(historyEvent)
    
    this.emitStateChange()
  }
  
  /**
   * Navigate to a specific event
   */
  async navigateToEvent(targetEventId: string): Promise<void> {
    const state = this.getState()
    const targetIndex = state.undoStack.findIndex(e => e.id === targetEventId)
    
    if (targetIndex === -1) {
      console.warn('Event not found in history:', targetEventId)
      return
    }
    
    const currentIndex = state.undoStack.findIndex(e => e.id === state.currentEventId)
    const steps = currentIndex - targetIndex
    
    if (steps > 0) {
      // Undo
      for (let i = 0; i < steps; i++) {
        await this.undo()
      }
    } else if (steps < 0) {
      // Redo
      for (let i = 0; i < Math.abs(steps); i++) {
        await this.redo()
      }
    }
    
    // Emit navigation event
    this.typedEventBus.emit('history.navigated', {
      eventId: targetEventId,
      timestamp: Date.now(),
      direction: steps > 0 ? 'undo' : 'redo',
      fromEventId: state.currentEventId,
      toEventId: targetEventId
    })
  }
  
  /**
   * Clear history
   */
  clear(): void {
    this.setState(() => ({
      canUndo: false,
      canRedo: false,
      undoStack: [],
      redoStack: [],
      currentEventId: null,
      totalEvents: 0
    }))
    
    this.emitStateChange()
  }
  
  /**
   * Get history entries for display
   */
  getHistory(): Event[] {
    return this.getState().undoStack
  }
  
  /**
   * Get snapshot manager
   */
  getSnapshotManager(): SnapshotManager {
    return this.snapshotManager
  }
  
  /**
   * Time travel to a specific event
   */
  async timeTravel(targetEventId: string): Promise<void> {
    await this.navigateToEvent(targetEventId)
  }
}

/**
 * History undo event
 */
class HistoryUndoEvent extends Event {
  constructor(private undoneEventId: string) {
    super(
      'history.undo',
      undoneEventId,
      'workflow',
      {
        source: 'system',
        correlationId: `undo_${Date.now()}`
      }
    )
  }
  
  apply(state: unknown): unknown {
    return state // No state change, just tracking
  }
  
  reverse(): Event | null {
    return null // Cannot undo an undo
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Undo event ${this.undoneEventId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      undoneEventId: this.undoneEventId
    }
  }
}

/**
 * History redo event
 */
class HistoryRedoEvent extends Event {
  constructor(private redoneEventId: string) {
    super(
      'history.redo',
      redoneEventId,
      'workflow',
      {
        source: 'system',
        correlationId: `redo_${Date.now()}`
      }
    )
  }
  
  apply(state: unknown): unknown {
    return state // No state change, just tracking
  }
  
  reverse(): Event | null {
    return null // Cannot undo a redo
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Redo event ${this.redoneEventId}`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      redoneEventId: this.redoneEventId
    }
  }
}

// Legacy singleton function - will be removed in Phase 2 completion
let historyStoreInstance: EventBasedHistoryStore | null = null

/**
 * Get or create the singleton history store instance
 * @deprecated Use ServiceContainer instead
 */
export function getHistoryStore(eventStore: EventStore, typedEventBus: TypedEventBus): EventBasedHistoryStore {
  if (!historyStoreInstance) {
    historyStoreInstance = new EventBasedHistoryStore(eventStore, typedEventBus)
  }
  return historyStoreInstance
}

/**
 * React hook for using the history store
 */
export function useEventHistoryStore() {
  // This is a simplified version - in a real app, you'd use proper React context
  // For now, we'll return a simple interface that matches what's expected
  return {
    undo: async () => {
      if (historyStoreInstance) {
        await historyStoreInstance.undo()
      }
    },
    redo: async () => {
      if (historyStoreInstance) {
        await historyStoreInstance.redo()
      }
    },
    canUndo: historyStoreInstance?.getState().canUndo ?? false,
    canRedo: historyStoreInstance?.getState().canRedo ?? false,
    clear: () => {
      if (historyStoreInstance) {
        historyStoreInstance.clear()
      }
    },
    getHistory: () => {
      return historyStoreInstance?.getHistory() ?? []
    }
  }
}

/**
 * Keyboard handlers for history operations
 */
export const eventHistoryKeyboardHandlers = {
  handleUndo: (e: KeyboardEvent) => {
    e.preventDefault()
    if (historyStoreInstance) {
      historyStoreInstance.undo()
    }
  },
  handleRedo: (e: KeyboardEvent) => {
    e.preventDefault()
    if (historyStoreInstance) {
      historyStoreInstance.redo()
    }
  }
} 