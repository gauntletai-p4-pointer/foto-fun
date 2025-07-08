import { create } from 'zustand'
import type { Canvas, FabricObject } from 'fabric'

interface SelectionStore {
  activeSelection: FabricObject | null
  selectionMode: 'new' | 'add' | 'subtract' | 'intersect'
  
  setActiveSelection: (selection: FabricObject | null) => void
  setSelectionMode: (mode: 'new' | 'add' | 'subtract' | 'intersect') => void
  clearSelection: (canvas: Canvas) => void
  
  // Helper to apply selection with current mode
  applySelection: (canvas: Canvas, newSelection: FabricObject) => void
}

export const useSelectionStore = create<SelectionStore>((set, get) => ({
  activeSelection: null,
  selectionMode: 'new',
  
  setActiveSelection: (selection) => set({ activeSelection: selection }),
  
  setSelectionMode: (mode) => set({ selectionMode: mode }),
  
  clearSelection: (canvas) => {
    const { activeSelection } = get()
    if (activeSelection) {
      canvas.remove(activeSelection)
      set({ activeSelection: null })
    }
  },
  
  applySelection: (canvas, newSelection) => {
    const { activeSelection, selectionMode } = get()
    
    // For now, just handle 'new' mode
    // TODO: Implement add, subtract, intersect operations
    if (selectionMode === 'new') {
      // Remove existing selection
      if (activeSelection) {
        canvas.remove(activeSelection)
      }
      
      // Add new selection
      canvas.add(newSelection)
      set({ activeSelection: newSelection })
    }
    
    canvas.renderAll()
  }
})) 