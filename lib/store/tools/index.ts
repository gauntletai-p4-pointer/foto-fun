// Export only the store classes - singleton pattern eliminated
export { EventToolStore } from './EventToolStore'
export { EventToolOptionsStore } from './EventToolOptionsStore'
export type { ToolState } from './EventToolStore'
export type { ToolOptionsState } from './EventToolOptionsStore'

// React Hook
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventToolStore } from './EventToolStore'

/**
 * React hook for using the tool store
 */
export function useToolStore() {
  const store = useService<EventToolStore>('ToolStore')
  const state = useStore(store)
  
  return {
    ...state,
    // Methods
    activateTool: (toolId: string) => store.activateTool(toolId),
    getTool: (toolId: string) => store.getTool(toolId),
    getActiveTool: () => store.getActiveTool(),
    getToolOptions: (toolId: string) => store.getToolOptions(toolId),
    updateOption: (toolId: string, optionId: string, value: unknown) => 
      store.updateOption(toolId, optionId, value),
    // Alias for compatibility
    setActiveTool: (toolId: string) => store.activateTool(toolId)
  }
} 