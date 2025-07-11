import { EventStore } from '@/lib/events/core/EventStore'
import type { Event } from '@/lib/events/core/Event'

/**
 * Base class for event-driven stores
 * Provides state management through event sourcing
 */
export abstract class BaseStore<TState> {
  private state: TState
  private eventStore: EventStore
  private listeners = new Set<(state: TState) => void>()
  private subscriptions: Array<() => void> = []
  private disposed = false
  
  constructor(initialState: TState, eventStore: EventStore) {
    this.state = initialState
    this.eventStore = eventStore
    this.subscribeToEvents()
  }
  
  /**
   * Define event handlers for this store
   * Map event types to handler methods
   */
  protected abstract getEventHandlers(): Map<string, (event: Event) => void>
  
  /**
   * Subscribe to relevant events
   */
  private subscribeToEvents(): void {
    const handlers = this.getEventHandlers()
    
    handlers.forEach((handler, eventType) => {
      const unsubscribe = this.eventStore.subscribe(eventType, (event) => {
        if (!this.disposed) {
          handler.call(this, event)
          this.notifyListeners()
        }
      })
      
      this.subscriptions.push(unsubscribe)
    })
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: TState) => void): () => void {
    this.listeners.add(listener)
    
    // Call immediately with current state
    listener(this.state)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  /**
   * Update state immutably
   */
  protected setState(updater: (state: TState) => TState): void {
    if (this.disposed) {
      console.warn('Attempting to update disposed store')
      return
    }
    
    const newState = updater(this.state)
    
    // Only update if state actually changed
    if (newState !== this.state) {
      this.state = newState
      this.notifyListeners()
    }
  }
  
  /**
   * Get current state
   */
  getState(): TState {
    return this.state
  }
  
  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state)
      } catch (error) {
        console.error('Error in store listener:', error)
      }
    })
  }
  
  /**
   * Dispose the store and clean up subscriptions
   */
  dispose(): void {
    this.disposed = true
    
    // Unsubscribe from all events
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    
    // Clear listeners
    this.listeners.clear()
  }
  
  /**
   * Create a derived store that computes state from this store
   */
  derive<TDerived>(
    selector: (state: TState) => TDerived,
    isEqual?: (a: TDerived, b: TDerived) => boolean
  ): DerivedStore<TState, TDerived> {
    return new DerivedStore(this, selector, isEqual)
  }
}

/**
 * Derived store that computes state from a parent store
 */
export class DerivedStore<TParentState, TState> {
  private listeners = new Set<(state: TState) => void>()
  private currentState: TState
  private unsubscribe: (() => void) | null = null
  
  constructor(
    private parent: BaseStore<TParentState>,
    private selector: (state: TParentState) => TState,
    private isEqual: (a: TState, b: TState) => boolean = (a, b) => a === b
  ) {
    this.currentState = selector(parent.getState())
  }
  
  /**
   * Subscribe to derived state changes
   */
  subscribe(listener: (state: TState) => void): () => void {
    // Start watching parent if this is the first subscriber
    if (this.listeners.size === 0) {
      this.startWatching()
    }
    
    this.listeners.add(listener)
    
    // Call immediately with current state
    listener(this.currentState)
    
    return () => {
      this.listeners.delete(listener)
      
      // Stop watching if no more subscribers
      if (this.listeners.size === 0) {
        this.stopWatching()
      }
    }
  }
  
  /**
   * Get current derived state
   */
  getState(): TState {
    return this.currentState
  }
  
  private startWatching(): void {
    this.unsubscribe = this.parent.subscribe((parentState) => {
      const newState = this.selector(parentState)
      
      if (!this.isEqual(newState, this.currentState)) {
        this.currentState = newState
        this.notifyListeners()
      }
    })
  }
  
  private stopWatching(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState)
      } catch (error) {
        console.error('Error in derived store listener:', error)
      }
    })
  }
}

/**
 * React hook for using stores
 */
import { useEffect, useState, useRef } from 'react'

export function useStore<TState, TParentState = unknown>(
  store: BaseStore<TState> | DerivedStore<TParentState, TState>
): TState {
  const [state, setState] = useState(() => store.getState())
  const storeRef = useRef(store)
  
  // Update ref if store changes
  storeRef.current = store
  
  useEffect(() => {
    // Subscribe to the current store
    const unsubscribe = storeRef.current.subscribe(setState)
    
    // Cleanup on unmount or store change
    return unsubscribe
  }, [store])
  
  return state
}

/**
 * React hook for using a derived value from a store
 */
export function useDerivedStore<TState, TDerived>(
  store: BaseStore<TState>,
  selector: (state: TState) => TDerived,
  deps: React.DependencyList = []
): TDerived {
  const derivedStoreRef = useRef<DerivedStore<TState, TDerived> | null>(null)
  const depsRef = useRef(deps)
  
  // Create or update derived store if dependencies change
  if (!derivedStoreRef.current || deps.some((dep, i) => dep !== depsRef.current[i])) {
    derivedStoreRef.current = store.derive(selector)
    depsRef.current = deps
  }
  
  return useStore(derivedStoreRef.current!)
} 