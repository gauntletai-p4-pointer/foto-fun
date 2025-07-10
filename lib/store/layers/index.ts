export * from './EventLayerStore'

// React Hook
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventLayerStore } from './EventLayerStore'
import { ServiceContainer } from '@/lib/core/ServiceContainer'

/**
 * React hook for using the layer store
 */
export function useLayerStore() {
  const store = useService<EventLayerStore>('LayerStore')
  const state = useStore(store)
  
  return {
    ...state,
    // Methods
    getLayers: () => store.getLayers(),
    getActiveLayer: () => store.getActiveLayer(),
    getLayer: (layerId: string) => store.getLayer(layerId),
    setActiveLayer: (layerId: string) => store.setActiveLayer(layerId),
    selectLayers: (layerIds: string[]) => store.selectLayers(layerIds),
    toggleLayerSelection: (layerId: string) => store.toggleLayerSelection(layerId),
    getSelectedLayers: () => store.getSelectedLayers(),
    isLayerSelected: (layerId: string) => store.isLayerSelected(layerId),
    getLayerChildren: (parentId: string) => store.getLayerChildren(parentId),
    isGroupExpanded: (groupId: string) => store.isGroupExpanded(groupId),
    toggleGroupExpansion: (groupId: string) => store.toggleGroupExpansion(groupId)
  }
}

/**
 * Get layer store instance for non-React contexts
 * Should be used in classes, commands, etc.
 */
export function getLayerStore(): EventLayerStore {
  return ServiceContainer.getInstance().getSync<EventLayerStore>('LayerStore')
} 