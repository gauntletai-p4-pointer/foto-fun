import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Layer, LayerType, BlendMode } from '@/types'
import type { FabricObject } from 'fabric'
import { useCanvasStore } from './canvasStore'
import { useHistoryStore } from './historyStore'

interface LayerState {
  // Layer data
  layers: Layer[]
  activeLayerId: string | null
  
  // Layer operations
  addLayer: (layer: Partial<Layer>) => Layer
  removeLayer: (layerId: string) => void
  duplicateLayer: (layerId: string) => Layer | null
  updateLayer: (layerId: string, updates: Partial<Layer>) => void
  
  // Layer ordering
  reorderLayers: (fromIndex: number, toIndex: number) => void
  moveLayerUp: (layerId: string) => void
  moveLayerDown: (layerId: string) => void
  
  // Layer selection
  setActiveLayer: (layerId: string | null) => void
  getActiveLayer: () => Layer | null
  getLayerById: (layerId: string) => Layer | undefined
  
  // Layer visibility
  toggleLayerVisibility: (layerId: string) => void
  setLayerOpacity: (layerId: string, opacity: number) => void
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void
  
  // Layer grouping
  createGroup: (name: string, layerIds: string[]) => Layer
  ungroupLayers: (groupId: string) => void
  
  // Layer merging
  mergeDown: (layerId: string) => void
  mergeVisible: () => void
  flattenImage: () => void
  
  // Canvas integration
  syncLayersToCanvas: () => void
  updateLayerThumbnail: (layerId: string) => void
  addObjectToActiveLayer: (object: FabricObject) => void
  
  // Utility
  generateLayerName: (type: LayerType) => string
  getLayerIndex: (layerId: string) => number
  getVisibleLayers: () => Layer[]
}

export const useLayerStore = create<LayerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    layers: [],
    activeLayerId: null,
    
    // Add a new layer
    addLayer: (layerData) => {
      const layers = get().layers
      const newLayer: Layer = {
        id: uuidv4(),
        name: layerData.name || get().generateLayerName(layerData.type || 'image'),
        type: layerData.type || 'image',
        visible: true,
        opacity: 100,
        blendMode: 'normal',
        locked: false,
        position: layers.length,
        ...layerData
      }
      
      set((state) => ({
        layers: [...state.layers, newLayer],
        activeLayerId: newLayer.id
      }))
      
      get().syncLayersToCanvas()
      return newLayer
    },
    
    // Remove a layer
    removeLayer: (layerId) => {
      const layer = get().getLayerById(layerId)
      if (!layer || layer.locked) return
      
      set((state) => {
        const newLayers = state.layers.filter(l => l.id !== layerId)
        // Update positions
        newLayers.forEach((l, index) => {
          l.position = index
        })
        
        // Update active layer if needed
        let newActiveId = state.activeLayerId
        if (state.activeLayerId === layerId) {
          const oldIndex = state.layers.findIndex(l => l.id === layerId)
          newActiveId = newLayers[Math.min(oldIndex, newLayers.length - 1)]?.id || null
        }
        
        return {
          layers: newLayers,
          activeLayerId: newActiveId
        }
      })
      
      // Remove from canvas
      const canvas = useCanvasStore.getState().fabricCanvas
      if (canvas && layer.fabricObject) {
        canvas.remove(layer.fabricObject)
        canvas.renderAll()
      }
    },
    
    // Duplicate a layer
    duplicateLayer: (layerId) => {
      const layer = get().getLayerById(layerId)
      if (!layer) return null
      
      const duplicated: Layer = {
        ...layer,
        id: uuidv4(),
        name: `${layer.name} copy`,
        position: layer.position + 1,
        fabricObject: undefined // Will be created when syncing to canvas
      }
      
      set((state) => {
        const newLayers = [...state.layers]
        // Insert after original
        newLayers.splice(layer.position + 1, 0, duplicated)
        // Update positions
        newLayers.forEach((l, index) => {
          l.position = index
        })
        
        return {
          layers: newLayers,
          activeLayerId: duplicated.id
        }
      })
      
      get().syncLayersToCanvas()
      return duplicated
    },
    
    // Update layer properties
    updateLayer: (layerId, updates) => {
      set((state) => ({
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, ...updates } : layer
        )
      }))
      
      // Update canvas object if needed
      const layer = get().getLayerById(layerId)
      const canvas = useCanvasStore.getState().fabricCanvas
      if (layer?.fabricObject && canvas) {
        if ('visible' in updates) {
          layer.fabricObject.visible = updates.visible!
        }
        if ('opacity' in updates) {
          layer.fabricObject.opacity = updates.opacity! / 100
        }
        if ('locked' in updates) {
          layer.fabricObject.selectable = !updates.locked
          layer.fabricObject.evented = !updates.locked
        }
        canvas.renderAll()
      }
    },
    
    // Reorder layers
    reorderLayers: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return
      
      set((state) => {
        const newLayers = [...state.layers]
        const [movedLayer] = newLayers.splice(fromIndex, 1)
        newLayers.splice(toIndex, 0, movedLayer)
        
        // Update positions
        newLayers.forEach((l, index) => {
          l.position = index
        })
        
        return { layers: newLayers }
      })
      
      get().syncLayersToCanvas()
    },
    
    // Move layer up in stack
    moveLayerUp: (layerId) => {
      const index = get().getLayerIndex(layerId)
      if (index < get().layers.length - 1) {
        get().reorderLayers(index, index + 1)
      }
    },
    
    // Move layer down in stack
    moveLayerDown: (layerId) => {
      const index = get().getLayerIndex(layerId)
      if (index > 0) {
        get().reorderLayers(index, index - 1)
      }
    },
    
    // Set active layer
    setActiveLayer: (layerId) => {
      set({ activeLayerId: layerId })
      
      // Update canvas active object
      const layer = layerId ? get().getLayerById(layerId) : null
      const canvas = useCanvasStore.getState().fabricCanvas
      if (canvas) {
        if (layer?.fabricObject) {
          canvas.setActiveObject(layer.fabricObject)
        } else {
          canvas.discardActiveObject()
        }
        canvas.renderAll()
      }
    },
    
    // Get active layer
    getActiveLayer: () => {
      const state = get()
      return state.layers.find(l => l.id === state.activeLayerId) || null
    },
    
    // Get layer by ID
    getLayerById: (layerId) => {
      return get().layers.find(l => l.id === layerId)
    },
    
    // Toggle visibility
    toggleLayerVisibility: (layerId) => {
      const layer = get().getLayerById(layerId)
      if (layer) {
        get().updateLayer(layerId, { visible: !layer.visible })
      }
    },
    
    // Set opacity
    setLayerOpacity: (layerId, opacity) => {
      get().updateLayer(layerId, { opacity: Math.max(0, Math.min(100, opacity)) })
    },
    
    // Set blend mode
    setLayerBlendMode: (layerId, blendMode) => {
      get().updateLayer(layerId, { blendMode })
      // Note: Fabric.js doesn't natively support all blend modes
      // This would need custom implementation or filters
    },
    
    // Create group
    createGroup: (name, layerIds) => {
      const layers = layerIds.map(id => get().getLayerById(id)).filter(Boolean) as Layer[]
      if (layers.length === 0) return get().addLayer({ type: 'group', name })
      
      const minPosition = Math.min(...layers.map(l => l.position))
      
      const group: Partial<Layer> = {
        type: 'group',
        name,
        childIds: layerIds,
        position: minPosition
      }
      
      const newGroup = get().addLayer(group)
      
      // Update child layers
      layerIds.forEach(id => {
        get().updateLayer(id, { parentId: newGroup.id })
      })
      
      return newGroup
    },
    
    // Ungroup layers
    ungroupLayers: (groupId) => {
      const group = get().getLayerById(groupId)
      if (!group || group.type !== 'group') return
      
      // Remove parent reference from children
      group.childIds?.forEach(childId => {
        get().updateLayer(childId, { parentId: undefined })
      })
      
      get().removeLayer(groupId)
    },
    
    // Merge down
    mergeDown: (layerId) => {
      const layers = get().layers
      const index = get().getLayerIndex(layerId)
      if (index <= 0) return
      
      const topLayer = layers[index]
      const bottomLayer = layers[index - 1]
      
      if (!topLayer.fabricObject || !bottomLayer.fabricObject) return
      
      // TODO: Implement actual pixel merging
      // For now, just remove the top layer
      console.log('Merge down not fully implemented - would merge', topLayer.name, 'into', bottomLayer.name)
      get().removeLayer(topLayer.id)
    },
    
    // Merge visible layers
    mergeVisible: () => {
      const visibleLayers = get().getVisibleLayers()
      if (visibleLayers.length <= 1) return
      
      // TODO: Implement actual merging
      console.log('Merge visible not implemented - would merge', visibleLayers.length, 'layers')
    },
    
    // Flatten image
    flattenImage: () => {
      const layers = get().layers
      if (layers.length <= 1) return
      
      // TODO: Implement actual flattening
      console.log('Flatten image not implemented - would flatten', layers.length, 'layers')
    },
    
    // Sync layers to canvas
    syncLayersToCanvas: () => {
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas) return
      
      // Clear canvas and re-add in correct order
      canvas.clear()
      
      const layers = get().layers
      layers.forEach(layer => {
        if (layer.fabricObject && layer.visible) {
          layer.fabricObject.opacity = layer.opacity / 100
          canvas.add(layer.fabricObject)
        }
      })
      
      canvas.renderAll()
    },
    
    // Update layer thumbnail
    updateLayerThumbnail: (layerId) => {
      const layer = get().getLayerById(layerId)
      const canvas = useCanvasStore.getState().fabricCanvas
      
      if (!layer || !canvas) return
      
      // Create a small canvas for thumbnail
      const thumbCanvas = document.createElement('canvas')
      thumbCanvas.width = 50
      thumbCanvas.height = 50
      const thumbCtx = thumbCanvas.getContext('2d')
      
      if (thumbCtx && layer.fabricObject) {
        // TODO: Render layer object to thumbnail
        // For now, just create a placeholder
        thumbCtx.fillStyle = '#ccc'
        thumbCtx.fillRect(0, 0, 50, 50)
        
        const thumbnail = thumbCanvas.toDataURL()
        get().updateLayer(layerId, { thumbnail })
      }
    },
    
    // Generate layer name
    generateLayerName: (type) => {
      const layers = get().layers
      const typeCount = layers.filter(l => l.type === type).length
      
      const baseNames: Record<LayerType, string> = {
        image: 'Layer',
        text: 'Text',
        shape: 'Shape',
        adjustment: 'Adjustment',
        group: 'Group'
      }
      
      return `${baseNames[type]} ${typeCount + 1}`
    },
    
    // Get layer index
    getLayerIndex: (layerId) => {
      return get().layers.findIndex(l => l.id === layerId)
    },
    
    // Get visible layers
    getVisibleLayers: () => {
      return get().layers.filter(l => l.visible)
    },
    
    // Add object to active layer
    addObjectToActiveLayer: (object: FabricObject) => {
      let activeLayer = get().getActiveLayer()
      if (!activeLayer) {
        // Create a default layer if none exists
        const newLayer = get().addLayer({ type: 'image' })
        activeLayer = newLayer
      }
      
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas) return
      
      // Add the object to canvas
      canvas.add(object)
      
      // Associate the object with the layer
      // For now, we'll store a reference in the layer
      // In a full implementation, we'd track all objects per layer
      activeLayer.fabricObject = object
      
      // Update the layer to trigger re-render
      get().updateLayer(activeLayer.id, { fabricObject: object })
      
      canvas.renderAll()
    }
  }))
) 