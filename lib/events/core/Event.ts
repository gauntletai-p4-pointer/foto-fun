import { nanoid } from 'nanoid'

/**
 * Base Event class for our event-sourced architecture
 * All state changes in the system are represented as events
 */
export abstract class Event {
  readonly id: string
  readonly timestamp: number
  readonly type: string
  readonly aggregateId: string
  readonly aggregateType: 'canvas' | 'layer' | 'selection' | 'tool' | 'workflow'
  readonly userId?: string
  readonly sessionId: string
  readonly version: number
  
  // Metadata for debugging and auditing
  readonly metadata: {
    source: 'user' | 'ai' | 'system'
    correlationId?: string // Links related events
    causationId?: string // ID of the event that caused this one
    workflowId?: string // ID of the workflow this event belongs to
    selectionSnapshotId?: string // ID of the selection snapshot at event time
  }
  
  constructor(
    type: string,
    aggregateId: string,
    aggregateType: Event['aggregateType'],
    metadata: Event['metadata'],
    version: number = 1
  ) {
    this.id = nanoid()
    this.timestamp = Date.now()
    this.type = type
    this.aggregateId = aggregateId
    this.aggregateType = aggregateType
    this.metadata = metadata
    this.version = version
    this.sessionId = this.getSessionId()
  }
  
  /**
   * Apply this event to an aggregate to produce new state
   * This is where the actual state transformation happens
   */
  abstract apply(currentState: unknown): unknown
  
  /**
   * Create a reverse event that undoes this event
   * Not all events are reversible
   */
  abstract reverse(): Event | null
  
  /**
   * Check if this event can be applied to the given state
   */
  abstract canApply(currentState: unknown): boolean
  
  /**
   * Get a human-readable description of this event
   */
  abstract getDescription(): string
  
  /**
   * Serialize event for storage
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      timestamp: this.timestamp,
      type: this.type,
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      userId: this.userId,
      sessionId: this.sessionId,
      version: this.version,
      metadata: this.metadata,
      data: this.getEventData()
    }
  }
  
  /**
   * Get event-specific data for serialization
   * Subclasses should override this
   */
  protected abstract getEventData(): Record<string, unknown>
  
  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = window.sessionStorage.getItem('editorSessionId')
      if (!sessionId) {
        sessionId = nanoid()
        window.sessionStorage.setItem('editorSessionId', sessionId)
      }
      return sessionId
    }
    return 'server-session'
  }
}

/**
 * Canvas-specific events
 */
export abstract class CanvasEvent extends Event {
  constructor(
    type: string,
    canvasId: string,
    metadata: Event['metadata'],
    version?: number
  ) {
    super(type, canvasId, 'canvas', metadata, version)
  }
}

/**
 * Selection-specific events
 */
export abstract class SelectionEvent extends Event {
  readonly selectionSnapshotId: string
  
  constructor(
    type: string,
    selectionId: string,
    selectionSnapshotId: string,
    metadata: Event['metadata']
  ) {
    super(type, selectionId, 'selection', {
      ...metadata,
      selectionSnapshotId
    })
    this.selectionSnapshotId = selectionSnapshotId
  }
}

/**
 * Workflow-specific events
 */
export abstract class WorkflowEvent extends Event {
  constructor(
    type: string,
    workflowId: string,
    metadata: Event['metadata']
  ) {
    super(type, workflowId, 'workflow', {
      ...metadata,
      workflowId
    })
  }
} 