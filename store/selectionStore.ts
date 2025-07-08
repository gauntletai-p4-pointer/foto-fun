import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { SelectionMode } from '@/lib/editor/selection'

interface SelectionState {
  // Selection mode
  mode: SelectionMode
  
  // Selection options
  feather: number
  antiAlias: boolean
  
  // Selection state
  hasSelection: boolean
  selectionBounds: { x: number; y: number; width: number; height: number } | null
  
  // Actions
  setMode: (mode: SelectionMode) => void
  setFeather: (feather: number) => void
  setAntiAlias: (antiAlias: boolean) => void
  updateSelectionState: (hasSelection: boolean, bounds?: { x: number; y: number; width: number; height: number } | null) => void
}

export const useSelectionStore = create<SelectionState>()(
  devtools(
    (set) => ({
      // Initial state
      mode: 'replace',
      feather: 0,
      antiAlias: true,
      hasSelection: false,
      selectionBounds: null,
      
      // Actions
      setMode: (mode) => set({ mode }),
      setFeather: (feather) => set({ feather: Math.max(0, Math.min(100, feather)) }),
      setAntiAlias: (antiAlias) => set({ antiAlias }),
      updateSelectionState: (hasSelection, bounds) => set({ 
        hasSelection, 
        selectionBounds: bounds || null 
      }),
    }),
    {
      name: 'selection-store'
    }
  )
) 