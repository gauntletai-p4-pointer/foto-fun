import React from 'react'
import { useCanvasStore } from '@/store/canvasStore'
import { useLayerStore } from '@/store/layerStore'
import { useObjectRegistryStore } from '@/store/objectRegistryStore'
import { LayerAwareSelectionManager } from '@/lib/editor/selection/LayerAwareSelectionManager'
import { Target, Layers } from 'lucide-react'

export const SelectionOptions: React.FC = () => {
  const { selectionManager } = useCanvasStore()
  const { layers } = useLayerStore()
  const objectRegistry = useObjectRegistryStore()
  
  if (!selectionManager || !(selectionManager instanceof LayerAwareSelectionManager)) {
    return null
  }
  
  const selectionMode = selectionManager.getSelectionMode()
  const activeObjectId = selectionManager.getActiveObjectId()
  
  // Find the layer containing the active object
  const activeLayer = activeObjectId 
    ? layers.find(layer => layer.id === activeObjectId)
    : null
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 text-sm">
      <div className="flex items-center gap-1">
        {selectionMode === 'object' && <Target className="h-4 w-4 text-blue-500" />}
        {selectionMode === 'layer' && <Layers className="h-4 w-4 text-green-500" />}
        <span className="text-gray-600">Mode:</span>
        <span className="font-medium capitalize">{selectionMode}</span>
      </div>
      
      {activeObjectId && (
        <>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Target:</span>
            <span className="font-medium">
              {activeLayer ? activeLayer.name : `Object ${activeObjectId.slice(0, 8)}`}
            </span>
          </div>
        </>
      )}
    </div>
  )
} 