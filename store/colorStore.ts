import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ColorStore {
  recentColors: string[]
  maxRecentColors: number
  
  addRecentColor: (color: string) => void
  clearRecentColors: () => void
}

export const useColorStore = create<ColorStore>()(
  persist(
    (set) => ({
      recentColors: [],
      maxRecentColors: 12,
      
      addRecentColor: (color) => set((state) => {
        // Don't add if it's already the most recent
        if (state.recentColors[0] === color) return state
        
        // Remove the color if it already exists
        const filtered = state.recentColors.filter(c => c !== color)
        
        // Add to the beginning and limit the array size
        const newColors = [color, ...filtered].slice(0, state.maxRecentColors)
        
        return { recentColors: newColors }
      }),
      
      clearRecentColors: () => set({ recentColors: [] })
    }),
    {
      name: 'foto-fun-colors',
    }
  )
) 