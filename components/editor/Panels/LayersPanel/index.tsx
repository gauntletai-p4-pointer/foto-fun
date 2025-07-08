'use client'

import { useEffect, useState } from 'react'
import { useLayerStore } from '@/store/layerStore'
import { useHistoryStore } from '@/store/historyStore'
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Copy,
  MoreVertical,
  Layers,
  Image as ImageIcon,
  Type,
  Square,
  Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Layer, LayerType, BlendMode } from '@/types'
import { 
  CreateLayerCommand,
  RemoveLayerCommand,
  UpdateLayerCommand,
  ReorderLayersCommand
} from '@/lib/editor/commands/layer'

// Icons for different layer types
const layerTypeIcons: Record<LayerType, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  text: Type,
  shape: Square,
  adjustment: Palette,
  group: Layers
}

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

interface LayerItemProps {
  layer: Layer
  isActive: boolean
  onDragStart: (e: React.DragEvent, layer: Layer) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetLayer: Layer) => void
}

function LayerItem({ layer, isActive, onDragStart, onDragOver, onDrop }: LayerItemProps) {
  const { 
    updateLayer, 
    toggleLayerVisibility, 
    setActiveLayer,
    duplicateLayer
  } = useLayerStore()
  const { executeCommand } = useHistoryStore()
  
  const Icon = layerTypeIcons[layer.type]
  
  const handleVisibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleLayerVisibility(layer.id)
    executeCommand(new UpdateLayerCommand(layer.id, { visible: !layer.visible }))
  }
  
  const handleLockToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newLocked = !layer.locked
    updateLayer(layer.id, { locked: newLocked })
    executeCommand(new UpdateLayerCommand(layer.id, { locked: newLocked }))
  }
  
  const handleDuplicate = () => {
    const duplicated = duplicateLayer(layer.id)
    if (duplicated) {
      executeCommand(new CreateLayerCommand(duplicated))
    }
  }
  
  const handleDelete = () => {
    executeCommand(new RemoveLayerCommand(layer.id))
  }
  
  return (
    <div
      draggable={!layer.locked}
      onDragStart={(e) => onDragStart(e, layer)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, layer)}
      onClick={() => setActiveLayer(layer.id)}
      className={cn(
        "group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
        isActive ? "bg-primary/10" : "hover:bg-secondary/50",
        !layer.visible && "opacity-50"
      )}
    >
      {/* Layer icon */}
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      
      {/* Layer name */}
      <span className="flex-1 text-sm truncate">{layer.name}</span>
      
      {/* Layer controls */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Visibility toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleVisibilityToggle}
        >
          {layer.visible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>
        
        {/* Lock toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleLockToggle}
        >
          {layer.locked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </Button>
        
        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Layer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive"
              disabled={layer.locked}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Layer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function LayersPanel() {
  const { 
    layers, 
    activeLayerId, 
    getActiveLayer,
    addLayer,
    reorderLayers,
    setLayerOpacity,
    setLayerBlendMode
  } = useLayerStore()
  const { executeCommand } = useHistoryStore()
  
  const [draggedLayer, setDraggedLayer] = useState<Layer | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const activeLayer = getActiveLayer()
  
  // Initialize with a default layer if none exist
  useEffect(() => {
    if (layers.length === 0 && !hasInitialized) {
      setHasInitialized(true)
      const defaultLayer = addLayer({
        name: 'Background',
        type: 'image'
      })
      executeCommand(new CreateLayerCommand(defaultLayer))
    }
  }, [layers.length, addLayer, executeCommand, hasInitialized])
  
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
    if (!draggedLayer || draggedLayer.id === targetLayer.id) return
    
    const fromIndex = layers.findIndex(l => l.id === draggedLayer.id)
    const toIndex = layers.findIndex(l => l.id === targetLayer.id)
    
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderLayers(fromIndex, toIndex)
      executeCommand(new ReorderLayersCommand(fromIndex, toIndex))
    }
    
    setDraggedLayer(null)
  }
  
  const handleAddLayer = () => {
    const newLayer = addLayer({
      type: 'image'
    })
    executeCommand(new CreateLayerCommand(newLayer))
  }
  
  const handleOpacityChange = (value: number[]) => {
    if (!activeLayer) return
    setLayerOpacity(activeLayer.id, value[0])
    executeCommand(new UpdateLayerCommand(activeLayer.id, { opacity: value[0] }))
  }
  
  const handleBlendModeChange = (value: BlendMode) => {
    if (!activeLayer) return
    setLayerBlendMode(activeLayer.id, value)
    executeCommand(new UpdateLayerCommand(activeLayer.id, { blendMode: value }))
  }
  
  // Reverse the layers for display (top layer first)
  const displayLayers = [...layers].reverse()
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Layer controls */}
      <div className="p-3 border-b border-border space-y-3">
        {activeLayer && (
          <>
            {/* Opacity slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Opacity</label>
                <span className="text-xs text-muted-foreground">{activeLayer.opacity}%</span>
              </div>
              <Slider
                value={[activeLayer.opacity]}
                onValueChange={handleOpacityChange}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            
            {/* Blend mode dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Blend Mode</label>
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
          <div className="text-center text-muted-foreground text-sm py-8">
            <Layers className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No layers yet</p>
            <p className="mt-2 text-xs">Click the button below to add a layer</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayLayers.map(layer => (
              <LayerItem
                key={layer.id}
                layer={layer}
                isActive={layer.id === activeLayerId}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Add layer button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddLayer}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Layer
        </Button>
      </div>
    </div>
  )
} 