import { create } from 'zustand'
import { TOOL_IDS } from '@/constants'

interface FilterState {
  // Track which filters are currently active
  activeFilters: Set<string>
  
  // Update filter state
  setFilterActive: (filterId: string, isActive: boolean) => void
  
  // Check if a filter is active
  isFilterActive: (filterId: string) => boolean
  
  // Clear all filters
  clearAllFilters: () => void
  
  // Update active filters based on current canvas state
  updateFromCanvas: (filterStates: Record<string, boolean>) => void
}

export const useFilterStore = create<FilterState>((set, get) => ({
  activeFilters: new Set(),
  
  setFilterActive: (filterId: string, isActive: boolean) => {
    set((state) => {
      const newFilters = new Set(state.activeFilters)
      if (isActive) {
        newFilters.add(filterId)
      } else {
        newFilters.delete(filterId)
      }
      return { activeFilters: newFilters }
    })
  },
  
  isFilterActive: (filterId: string) => {
    return get().activeFilters.has(filterId)
  },
  
  clearAllFilters: () => {
    set({ activeFilters: new Set() })
  },
  
  updateFromCanvas: (filterStates: Record<string, boolean>) => {
    const newFilters = new Set<string>()
    Object.entries(filterStates).forEach(([filterId, isActive]) => {
      if (isActive) {
        newFilters.add(filterId)
      }
    })
    set({ activeFilters: newFilters })
  }
}))

// Define which tools are toggle filters
export const TOGGLE_FILTER_TOOLS = [
  TOOL_IDS.GRAYSCALE,
  TOOL_IDS.SEPIA,
  TOOL_IDS.INVERT
] as const

export type ToggleFilterTool = typeof TOGGLE_FILTER_TOOLS[number] 