/**
 * ToolStateManager - Manages encapsulated state for tools
 * 
 * This class provides a type-safe way to manage tool state,
 * ensuring all state is properly encapsulated and can be
 * persisted/restored between tool switches.
 */
export class ToolStateManager<T extends Record<string, unknown>> {
  private state: T
  private initialState: T
  private subscribers: Set<(state: T) => void> = new Set()
  
  constructor(initialState: T) {
    this.initialState = { ...initialState }
    this.state = { ...initialState }
  }
  
  /**
   * Get the current state
   */
  getState(): Readonly<T> {
    return { ...this.state }
  }
  
  /**
   * Get a specific state value
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key]
  }
  
  /**
   * Set a specific state value
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    if (this.state[key] !== value) {
      this.state[key] = value
      this.notifySubscribers()
    }
  }
  
  /**
   * Update multiple state values at once
   */
  setState(updates: Partial<T>): void {
    let hasChanges = false
    
    for (const key in updates) {
      if (this.state[key] !== updates[key]) {
        this.state[key] = updates[key]!
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      this.notifySubscribers()
    }
  }
  
  /**
   * Reset state to initial values
   */
  reset(): void {
    this.state = { ...this.initialState }
    this.notifySubscribers()
  }
  
  /**
   * Reset a specific key to its initial value
   */
  resetKey<K extends keyof T>(key: K): void {
    if (this.state[key] !== this.initialState[key]) {
      this.state[key] = this.initialState[key]
      this.notifySubscribers()
    }
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: T) => void): () => void {
    this.subscribers.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }
  
  /**
   * Notify all subscribers of state changes
   */
  private notifySubscribers(): void {
    const stateCopy = this.getState()
    this.subscribers.forEach(callback => {
      callback(stateCopy)
    })
  }
  
  /**
   * Serialize state for persistence
   */
  serialize(): string {
    return JSON.stringify(this.state)
  }
  
  /**
   * Deserialize and restore state
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as T
      this.state = { ...this.initialState, ...parsed }
      this.notifySubscribers()
    } catch (error) {
      console.error('Failed to deserialize state:', error)
    }
  }
  
  /**
   * Create a snapshot of current state
   */
  snapshot(): T {
    return { ...this.state }
  }
  
  /**
   * Restore from a snapshot
   */
  restore(snapshot: T): void {
    this.state = { ...snapshot }
    this.notifySubscribers()
  }
}

/**
 * Factory function to create a typed ToolStateManager
 */
export function createToolState<T extends Record<string, unknown>>(
  initialState: T
): ToolStateManager<T> {
  return new ToolStateManager(initialState)
}

/**
 * Example usage:
 * 
 * interface BrushToolState {
 *   isDrawing: boolean
 *   lastPoint: { x: number; y: number } | null
 *   strokePath: Point[]
 *   pressure: number
 * }
 * 
 * class BrushTool extends BaseTool {
 *   private state = createToolState<BrushToolState>({
 *     isDrawing: false,
 *     lastPoint: null,
 *     strokePath: [],
 *     pressure: 1.0
 *   })
 * 
 *   handleMouseDown(e: MouseEvent) {
 *     this.state.set('isDrawing', true)
 *     this.state.set('lastPoint', { x: e.x, y: e.y })
 *   }
 * }
 */ 