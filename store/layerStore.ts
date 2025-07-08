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
      // Extract id from layerData to ensure we never use it
      const { id: _, ...layerDataWithoutId } = layerData
      const newLayer: Layer = {
        id: uuidv4(),
        name: layerDataWithoutId.name || get().generateLayerName(layerDataWithoutId.type || 'image'),
        type: layerDataWithoutId.type || 'image',
        visible: true,
        opacity: 100,
        blendMode: 'normal',
        locked: false,
        position: layers.length,
        objectIds: [],
        ...layerDataWithoutId
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
      
      // Remove all objects associated with this layer from canvas
      const canvas = useCanvasStore.getState().fabricCanvas
      if (canvas && layer.objectIds) {
        const objectsToRemove = canvas.getObjects().filter(obj => 
          layer.objectIds?.includes(obj.get('id' as any) as string)
        )
        objectsToRemove.forEach(obj => canvas.remove(obj))
        canvas.renderAll()
      }
    },
    
    // Duplicate a layer
    duplicateLayer: (layerId) => {
      const layer = get().getLayerById(layerId)
      if (!layer) return null
      
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas) return null
      
      // Create new layer with unique ID
      const duplicated: Layer = {
        ...layer,
        id: uuidv4(),
        name: `${layer.name} copy`,
        position: layer.position + 1,
        objectIds: [] // Will be populated when we duplicate objects
      }
      
      // Duplicate all objects in the layer
      if (layer.objectIds && layer.objectIds.length > 0) {
        const objectsToDuplicate = canvas.getObjects().filter(obj => 
          layer.objectIds?.includes(obj.get('id' as any) as string)
        )
        
        objectsToDuplicate.forEach(async (obj) => {
          // Clone the object using async/await pattern for Fabric.js v6
          try {
            const cloned = await obj.clone()
            const newId = `${obj.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            cloned.set('id' as any, newId)
            cloned.set('layerId' as any, duplicated.id)
            canvas.add(cloned)
            duplicated.objectIds!.push(newId)
          } catch (error) {
            console.error('Error cloning object:', error)
          }
        })
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
      
      canvas.renderAll()
      return duplicated
    },
    
    // Update layer properties
    updateLayer: (layerId, updates) => {
      set((state) => ({
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, ...updates } : layer
        )
      }))
      
      // Update canvas objects if visibility or opacity changed
      const layer = get().getLayerById(layerId)
      const canvas = useCanvasStore.getState().fabricCanvas
      if (layer && canvas && layer.objectIds) {
        const layerObjects = canvas.getObjects().filter(obj => 
          layer.objectIds?.includes(obj.get('id' as any) as string)
        )
        
        layerObjects.forEach(obj => {
          if ('visible' in updates) {
            obj.visible = updates.visible!
          }
          if ('opacity' in updates) {
            obj.opacity = updates.opacity! / 100
          }
          if ('locked' in updates) {
            obj.selectable = !updates.locked
            obj.evented = !updates.locked
          }
        })
        
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
      
      // Update canvas selection if needed
      const layer = layerId ? get().getLayerById(layerId) : null
      const canvas = useCanvasStore.getState().fabricCanvas
      if (canvas && layer && layer.objectIds && layer.objectIds.length > 0) {
        // Select first object in layer for visual feedback
        const firstObject = canvas.getObjects().find(obj => 
          layer.objectIds?.includes(obj.get('id' as any) as string)
        )
        if (firstObject) {
          canvas.setActiveObject(firstObject)
          canvas.renderAll()
        }
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
      
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas || !topLayer.objectIds || !bottomLayer.objectIds) return
      
      // Move all objects from top layer to bottom layer
      const topObjects = canvas.getObjects().filter(obj => 
        topLayer.objectIds?.includes(obj.get('id' as any) as string)
      )
      
      topObjects.forEach(obj => {
        obj.set('layerId' as any, bottomLayer.id)
        bottomLayer.objectIds!.push(obj.get('id' as any) as string)
      })
      
      // Remove the top layer
      get().removeLayer(topLayer.id)
      
      canvas.renderAll()
    },
    
    // Merge visible layers
    mergeVisible: () => {
      const visibleLayers = get().getVisibleLayers()
      if (visibleLayers.length <= 1) return
      
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas) return
      
      // Create a new layer for merged content
      const mergedLayer = get().addLayer({
        name: 'Merged',
        type: 'image'
      })
      
      // Move all objects from visible layers to the new layer
      visibleLayers.forEach(layer => {
        if (layer.objectIds) {
          const objects = canvas.getObjects().filter(obj => 
            layer.objectIds?.includes(obj.get('id' as any) as string)
          )
          
          objects.forEach(obj => {
            obj.set('layerId' as any, mergedLayer.id)
            mergedLayer.objectIds!.push(obj.get('id' as any) as string)
          })
        }
      })
      
      // Remove the original layers
      visibleLayers.forEach(layer => {
        if (layer.id !== mergedLayer.id) {
          get().removeLayer(layer.id)
        }
      })
      
      canvas.renderAll()
    },
    
    // Flatten image
    flattenImage: () => {
      const layers = get().layers
      if (layers.length <= 1) return
      
      // This is essentially merge all layers
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas) return
      
      // Create a new background layer
      const flattenedLayer = get().addLayer({
        name: 'Background',
        type: 'image'
      })
      
      // Move all objects to the flattened layer
      layers.forEach(layer => {
        if (layer.id !== flattenedLayer.id && layer.objectIds) {
          const objects = canvas.getObjects().filter(obj => 
            layer.objectIds?.includes(obj.get('id' as any) as string)
          )
          
          objects.forEach(obj => {
            obj.set('layerId' as any, flattenedLayer.id)
            flattenedLayer.objectIds!.push(obj.get('id' as any) as string)
          })
        }
      })
      
      // Remove all other layers
      layers.forEach(layer => {
        if (layer.id !== flattenedLayer.id) {
          get().removeLayer(layer.id)
        }
      })
      
      canvas.renderAll()
    },
    
    // Sync layers to canvas
    syncLayersToCanvas: () => {
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas) return
      
      // Get all objects and sort by layer position
      const layers = get().layers
      const allObjects = canvas.getObjects()
      
      // Create a map of objects by layer
      const objectsByLayer = new Map<string, FabricObject[]>()
      
      allObjects.forEach(obj => {
        const layerId = obj.get('layerId' as any) as string
        if (layerId) {
          if (!objectsByLayer.has(layerId)) {
            objectsByLayer.set(layerId, [])
          }
          objectsByLayer.get(layerId)!.push(obj)
        }
      })
      
      // Clear canvas and re-add in correct order
      canvas.clear()
      
      layers.forEach(layer => {
        if (layer.visible && objectsByLayer.has(layer.id)) {
          const layerObjects = objectsByLayer.get(layer.id)!
          layerObjects.forEach(obj => {
            obj.opacity = (layer.opacity / 100) * (obj.opacity || 1)
            canvas.add(obj)
          })
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
      
      if (thumbCtx && layer.objectIds && layer.objectIds.length > 0) {
        // Get layer objects
        const layerObjects = canvas.getObjects().filter(obj => 
          layer.objectIds?.includes(obj.get('id' as any) as string)
        )
        
        if (layerObjects.length > 0) {
          // Calculate bounds of all objects
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          
          layerObjects.forEach(obj => {
            const bounds = obj.getBoundingRect()
            minX = Math.min(minX, bounds.left)
            minY = Math.min(minY, bounds.top)
            maxX = Math.max(maxX, bounds.left + bounds.width)
            maxY = Math.max(maxY, bounds.top + bounds.height)
          })
          
          // Scale to fit thumbnail
          const width = maxX - minX
          const height = maxY - minY
          const scale = Math.min(50 / width, 50 / height) * 0.9
          
          // Draw objects to thumbnail
          thumbCtx.save()
          thumbCtx.translate(25, 25)
          thumbCtx.scale(scale, scale)
          thumbCtx.translate(-(minX + width / 2), -(minY + height / 2))
          
          layerObjects.forEach(obj => {
            obj.render(thumbCtx as any)
          })
          
          thumbCtx.restore()
        } else {
          // Empty layer - draw placeholder
          thumbCtx.fillStyle = '#ccc'
          thumbCtx.fillRect(0, 0, 50, 50)
        }
        
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
        activeLayer = get().addLayer({ type: 'image' })
      }
      
      const canvas = useCanvasStore.getState().fabricCanvas
      if (!canvas) return
      
      // Generate ID for the object if it doesn't have one
      const objectId = object.get('id' as any) as string || 
        `${object.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      object.set('id' as any, objectId)
      object.set('layerId' as any, activeLayer.id)
      
      // Add the object to canvas
      canvas.add(object)
      
      // Update layer's object list
      const currentObjects = activeLayer.objectIds || []
      get().updateLayer(activeLayer.id, { 
        objectIds: [...currentObjects, objectId] 
      })
      
      canvas.renderAll()
    }
  }))
) 