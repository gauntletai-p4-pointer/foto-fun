export * from './EventToolStore'

// React Hook
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventToolStore } from './EventToolStore'
import { ServiceContainer } from '@/lib/core/ServiceContainer'

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

/**
 * Get tool store instance for non-React contexts
 * Should be used in classes, commands, etc.
 */
export function getToolStore(): EventToolStore {
  return ServiceContainer.getInstance().get<EventToolStore>('ToolStore')
} 