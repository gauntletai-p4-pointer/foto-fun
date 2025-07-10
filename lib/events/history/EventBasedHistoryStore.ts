import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { EventStore } from '../core/EventStore'
import { Event } from '../core/Event'
import { ExecutionContext, ExecutionContextFactory } from '../execution/ExecutionContext'
import type { Canvas } from 'fabric'

/**
 * History entry in the new event-based system
 */
export interface EventHistoryEntry {
  event: Event
  timestamp: number
  description: string
  canUndo: boolean
  contextId: string
}

/**
 * Event-based history state
 */
interface EventHistoryState {
  // Event tracking
  entries: EventHistoryEntry[]
  currentIndex: number
  maxHistorySize: number
  
  // Execution state
  isExecuting: boolean
  isUndoing: boolean
  isRedoing: boolean
  
  // Current execution context
  activeContext: ExecutionContext | null
  
  // Actions
  startExecution: (canvas: Canvas, source: Event['metadata']['source'], workflowId?: string) => Promise<ExecutionContext>
  commitExecution: (context: ExecutionContext) => Promise<void>
  rollbackExecution: (context: ExecutionContext) => void
  
  // Undo/Redo
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: () => boolean
  canRedo: () => boolean
  
  // History management
  clear: () => void
  getHistory: () => EventHistoryEntry[]
  
  // Event subscription
  subscribeToEvents: () => () => void
}

/**
 * Event-based history store that replaces the command-based one
 */
export const useEventHistoryStore = create<EventHistoryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      entries: [],
      currentIndex: -1,
      maxHistorySize: 100, // More history with events
      isExecuting: false,
      isUndoing: false,
      isRedoing: false,
      activeContext: null,
      
      // Start a new execution context
      startExecution: async (canvas, source, workflowId) => {
        // Create new execution context
        const context = await ExecutionContextFactory.fromCanvas(canvas, source, { workflowId })
        
        set({ activeContext: context })
        
        return context
      },
      
      // Commit an execution context
      commitExecution: async (context) => {
        const state = get()
        
        if (state.isExecuting || state.isUndoing || state.isRedoing) {
          throw new Error('Cannot commit while another operation is in progress')
        }
        
        set({ isExecuting: true })
        
        try {
          // Commit the context (this appends all events to the store)
          await context.commit()
          
          // Clear active context
          set({ 
            activeContext: null,
            isExecuting: false 
          })
        } catch (error) {
          console.error('Failed to commit execution:', error)
          set({ isExecuting: false })
          throw error
        }
      },
      
      // Rollback an execution context
      rollbackExecution: (context) => {
        context.rollback()
        
        const state = get()
        if (state.activeContext === context) {
          set({ activeContext: null })
        }
      },
      
      // Undo the last event
      undo: async () => {
        const state = get()
        
        if (!state.canUndo()) {
          return
        }
        
        if (state.isExecuting || state.isUndoing || state.isRedoing) {
          console.warn('Cannot undo while another operation is in progress')
          return
        }
        
        set({ isUndoing: true })
        
        try {
          const entry = state.entries[state.currentIndex]
          const reverseEvent = entry.event.reverse()
          
          if (!reverseEvent) {
            console.warn('Event cannot be undone:', entry.description)
            set({ isUndoing: false })
            return
          }
          
          // Create a new context for the undo operation
          const canvas = get().activeContext?.['canvas'] || null
          if (!canvas) {
            throw new Error('No canvas available for undo')
          }
          
          const undoContext = await ExecutionContextFactory.fromCanvas(canvas, 'system')
          
          // Emit the reverse event
          await undoContext.emit(reverseEvent)
          await undoContext.commit()
          
          // Update index
          set({ 
            currentIndex: state.currentIndex - 1,
            isUndoing: false 
          })
        } catch (error) {
          console.error('Undo failed:', error)
          set({ isUndoing: false })
          throw error
        }
      },
      
      // Redo the next event
      redo: async () => {
        const state = get()
        
        if (!state.canRedo()) {
          return
        }
        
        if (state.isExecuting || state.isUndoing || state.isRedoing) {
          console.warn('Cannot redo while another operation is in progress')
          return
        }
        
        set({ isRedoing: true })
        
        try {
          const nextIndex = state.currentIndex + 1
          const entry = state.entries[nextIndex]
          
          // Re-apply the original event
          const canvas = get().activeContext?.['canvas'] || null
          if (!canvas) {
            throw new Error('No canvas available for redo')
          }
          
          const redoContext = await ExecutionContextFactory.fromCanvas(canvas, 'system')
          
          // Clone and re-emit the event
          await redoContext.emit(entry.event)
          await redoContext.commit()
          
          set({ 
            currentIndex: nextIndex,
            isRedoing: false 
          })
        } catch (error) {
          console.error('Redo failed:', error)
          set({ isRedoing: false })
          throw error
        }
      },
      
      // Check if undo is available
      canUndo: () => {
        const state = get()
        return state.currentIndex >= 0 && 
               !state.isExecuting && 
               !state.isUndoing && 
               !state.isRedoing &&
               state.entries[state.currentIndex]?.canUndo
      },
      
      // Check if redo is available
      canRedo: () => {
        const state = get()
        return state.currentIndex < state.entries.length - 1 && 
               !state.isExecuting && 
               !state.isUndoing && 
               !state.isRedoing
      },
      
      // Clear all history
      clear: () => {
        set({
          entries: [],
          currentIndex: -1,
          isExecuting: false,
          isUndoing: false,
          isRedoing: false,
          activeContext: null
        })
      },
      
      // Get the full history
      getHistory: () => {
        return get().entries
      },
      
      // Subscribe to events from the event store
      subscribeToEvents: () => {
        const eventStore = EventStore.getInstance()
        
        // Subscribe to all events
        const unsubscribe = eventStore.subscribe('*', (event: Event) => {
          const state = get()
          
          // Skip if this is an undo/redo event
          if (state.isUndoing || state.isRedoing) {
            return
          }
          
          // Skip system events that shouldn't be in history
          if (event.metadata.source === 'system' && !event.reverse()) {
            return
          }
          
          // Create history entry
          const entry: EventHistoryEntry = {
            event,
            timestamp: event.timestamp,
            description: event.getDescription(),
            canUndo: event.reverse() !== null,
            contextId: event.metadata.correlationId || ''
          }
          
          // Remove any entries after current index (branching history)
          const newEntries = state.entries.slice(0, state.currentIndex + 1)
          
          // Add new entry
          newEntries.push(entry)
          
          // Trim to max size
          if (newEntries.length > state.maxHistorySize) {
            newEntries.shift()
          }
          
          set({
            entries: newEntries,
            currentIndex: newEntries.length - 1
          })
        })
        
        return unsubscribe
      }
    }),
    {
      name: 'event-history-store'
    }
  )
)

// Initialize event subscription when store is created
const unsubscribe = useEventHistoryStore.getState().subscribeToEvents()

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', unsubscribe)
}

// Export keyboard handlers for consistency
export const eventHistoryKeyboardHandlers = {
  handleUndo: (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      useEventHistoryStore.getState().undo()
    }
  },
  
  handleRedo: (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && (
      (e.key === 'z' && e.shiftKey) || 
      e.key === 'y'
    )) {
      e.preventDefault()
      useEventHistoryStore.getState().redo()
    }
  }
} 