'use client'

import { useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventLayerStore } from '@/lib/store/layers/EventLayerStore'
import { 
  Plus, 
  Layers,
  FolderPlus,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Layer } from '@/lib/editor/canvas/types'
import type { BlendMode } from '@/types'
import { LayerTree } from './LayerTree'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'

// Blend modes for dropdown
const blendModes: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' }
]

export function LayersPanel() {
  const layerStore = useService<EventLayerStore>('LayerStore')
  const layerState = useStore(layerStore)
  const [draggedLayer, setDraggedLayer] = useState<Layer | null>(null)
  
  const layers = layerStore.getLayers()
  const activeLayer = layerStore.getActiveLayer()
  const activeLayerId = layerState.activeLayerId
  
  // Get canvas manager
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  const handleDragStart = (e: React.DragEvent, layer: Layer) => {
    setDraggedLayer(layer)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = (e: React.DragEvent, targetLayer: Layer) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedLayer || draggedLayer.id === targetLayer.id) {
      setDraggedLayer(null)
      return
    }
    
    // If dropping on a group, move the layer into the group
    if (targetLayer.type === 'group' && draggedLayer.parentId !== targetLayer.id) {
      canvasManager.setLayerParent(draggedLayer.id, targetLayer.id)
    } else {
      // Otherwise, reorder layers
      const fromIndex = layers.findIndex(l => l.id === draggedLayer.id)
      const toIndex = layers.findIndex(l => l.id === targetLayer.id)
      
      if (fromIndex !== -1 && toIndex !== -1) {
        canvasManager.reorderLayers(fromIndex, toIndex)
      }
    }
    
    setDraggedLayer(null)
  }
  
  const handleAddLayer = () => {
    canvasManager.addLayer({
      type: 'raster',
      name: `Layer ${layers.filter(l => l.type === 'raster').length + 1}`
    })
  }
  
  const handleAddGroup = () => {
    canvasManager.addLayer({
      type: 'group',
      name: `Group ${layers.filter(l => l.type === 'group').length + 1}`
    })
  }
  
  const handleOpacityChange = (value: number[]) => {
    if (!activeLayer) return
    // TODO: Emit layer opacity change event
    console.log('Update layer opacity:', activeLayer.id, value[0])
  }
  
  const handleBlendModeChange = (value: BlendMode) => {
    if (!activeLayer) return
    // TODO: Emit layer blend mode change event
    console.log('Update layer blend mode:', activeLayer.id, value)
  }
  
  // Reverse the layers for display (top layer first)
  const displayLayers = [...layers].reverse()
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Layer controls */}
      <div className="p-3 border-b border-foreground/10 space-y-3">
        {activeLayer && (
          <>
            {/* Opacity slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Opacity</label>
                <span className="text-xs text-foreground/60">{Math.round(activeLayer.opacity * 100)}%</span>
              </div>
              <Slider
                value={[activeLayer.opacity * 100]}
                onValueChange={handleOpacityChange}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            
            {/* Blend mode dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Blend Mode</label>
              <Select
                value={activeLayer.blendMode}
                onValueChange={handleBlendModeChange}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {blendModes.map(mode => (
                    <SelectItem key={mode.value} value={mode.value} className="text-xs">
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
      
      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayLayers.length === 0 ? (
          <div className="text-center text-foreground/60 text-sm py-8">
            <Layers className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No layers yet</p>
            <p className="mt-2 text-xs">Click the buttons below to add layers</p>
          </div>
        ) : (
          <LayerTree
            layers={displayLayers}
            activeLayerId={activeLayerId}
            layerStore={layerStore}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        )}
      </div>
      
      {/* Add layer buttons */}
      <div className="p-3 border-t border-foreground/10 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Layer
              <ChevronDown className="ml-auto h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleAddLayer}>
              <Layers className="mr-2 h-4 w-4" />
              New Layer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddGroup}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 