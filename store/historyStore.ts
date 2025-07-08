import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ICommand } from '@/lib/commands/base'

export interface HistoryEntry {
  command: ICommand
  timestamp: number
}

interface HistoryState {
  // History tracking
  history: HistoryEntry[]
  currentIndex: number
  maxHistorySize: number
  
  // State flags
  isExecuting: boolean
  isUndoing: boolean
  isRedoing: boolean
  
  // Actions
  executeCommand: (command: ICommand) => Promise<void>
  undo: () => Promise<void>
  redo: () => Promise<void>
  
  // Queries
  canUndo: () => boolean
  canRedo: () => boolean
  getHistory: () => HistoryEntry[]
  getCurrentCommand: () => ICommand | null
  
  // Management
  clear: () => void
  setMaxHistorySize: (size: number) => void
  
  // Internal
  _addToHistory: (command: ICommand) => void
  _truncateHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      history: [],
      currentIndex: -1,
      maxHistorySize: 50,
      isExecuting: false,
      isUndoing: false,
      isRedoing: false,
      
      // Execute a new command
      executeCommand: async (command: ICommand) => {
        const state = get()
        
        // Prevent concurrent operations
        if (state.isExecuting || state.isUndoing || state.isRedoing) {
          console.warn('Cannot execute command while another operation is in progress')
          return
        }
        
        // Check if command can be executed
        if (!command.canExecute()) {
          console.warn('Command cannot be executed:', command.description)
          return
        }
        
        set({ isExecuting: true })
        
        try {
          // Execute the command
          await command.execute()
          
          // Check if we can merge with the previous command
          const { history, currentIndex } = get()
          const previousCommand = currentIndex >= 0 ? history[currentIndex].command : null
          
          if (previousCommand && previousCommand.canMergeWith?.(command)) {
            // Merge with previous command
            previousCommand.mergeWith!(command)
            set({ 
              history: [...history.slice(0, currentIndex), { command: previousCommand, timestamp: Date.now() }],
              isExecuting: false 
            })
          } else {
            // Add as new command
            get()._addToHistory(command)
            set({ isExecuting: false })
          }
        } catch (error) {
          console.error('Command execution failed:', error)
          set({ isExecuting: false })
          throw error
        }
      },
      
      // Undo the last command
      undo: async () => {
        const state = get()
        
        // Check if we can undo
        if (!state.canUndo()) {
          return
        }
        
        // Prevent concurrent operations
        if (state.isExecuting || state.isUndoing || state.isRedoing) {
          console.warn('Cannot undo while another operation is in progress')
          return
        }
        
        set({ isUndoing: true })
        
        try {
          const command = state.history[state.currentIndex].command
          
          if (command.canUndo()) {
            await command.undo()
            set({ 
              currentIndex: state.currentIndex - 1,
              isUndoing: false 
            })
          } else {
            console.warn('Command cannot be undone:', command.description)
            set({ isUndoing: false })
          }
        } catch (error) {
          console.error('Undo failed:', error)
          set({ isUndoing: false })
          throw error
        }
      },
      
      // Redo the next command
      redo: async () => {
        const state = get()
        
        // Check if we can redo
        if (!state.canRedo()) {
          return
        }
        
        // Prevent concurrent operations
        if (state.isExecuting || state.isUndoing || state.isRedoing) {
          console.warn('Cannot redo while another operation is in progress')
          return
        }
        
        set({ isRedoing: true })
        
        try {
          const nextIndex = state.currentIndex + 1
          const command = state.history[nextIndex].command
          
          await command.redo()
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
               !state.isRedoing
      },
      
      // Check if redo is available
      canRedo: () => {
        const state = get()
        return state.currentIndex < state.history.length - 1 && 
               !state.isExecuting && 
               !state.isUndoing && 
               !state.isRedoing
      },
      
      // Get the full history
      getHistory: () => {
        return get().history
      },
      
      // Get the current command
      getCurrentCommand: () => {
        const state = get()
        if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
          return state.history[state.currentIndex].command
        }
        return null
      },
      
      // Clear all history
      clear: () => {
        set({
          history: [],
          currentIndex: -1,
          isExecuting: false,
          isUndoing: false,
          isRedoing: false
        })
      },
      
      // Set maximum history size
      setMaxHistorySize: (size: number) => {
        if (size < 1) {
          console.warn('History size must be at least 1')
          return
        }
        
        set({ maxHistorySize: size })
        get()._truncateHistory()
      },
      
      // Internal: Add command to history
      _addToHistory: (command: ICommand) => {
        const state = get()
        
        // Remove any commands after current index (branching history)
        const newHistory = state.history.slice(0, state.currentIndex + 1)
        
        // Add new command
        newHistory.push({
          command,
          timestamp: Date.now()
        })
        
        // Update state
        set({
          history: newHistory,
          currentIndex: newHistory.length - 1
        })
        
        // Truncate if needed
        get()._truncateHistory()
      },
      
      // Internal: Truncate history to max size
      _truncateHistory: () => {
        const state = get()
        
        if (state.history.length > state.maxHistorySize) {
          const excess = state.history.length - state.maxHistorySize
          set({
            history: state.history.slice(excess),
            currentIndex: Math.max(0, state.currentIndex - excess)
          })
        }
      }
    }),
    {
      name: 'history-store'
    }
  )
)

// Keyboard shortcut handlers (to be used by the app)
export const historyKeyboardHandlers = {
  handleUndo: (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      useHistoryStore.getState().undo()
    }
  },
  
  handleRedo: (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && (
      (e.key === 'z' && e.shiftKey) || 
      e.key === 'y'
    )) {
      e.preventDefault()
      useHistoryStore.getState().redo()
    }
  }
} 