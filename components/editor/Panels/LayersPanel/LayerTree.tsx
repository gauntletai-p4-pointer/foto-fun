'use client'

import { useState } from 'react'
import { Layer } from '@/lib/editor/canvas/types'
import { EventLayerStore } from '@/lib/store/layers/EventLayerStore'
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Type,
  Square,
  Palette,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Icons for different layer types
const layerTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  raster: ImageIcon,
  vector: Square,
  text: Type,
  adjustment: Palette,
  group: Layers,
}

interface LayerTreeItemProps {
  layer: Layer
  isActive: boolean
  layerStore: EventLayerStore
  layers: Layer[]
  level: number
  onDragStart: (e: React.DragEvent, layer: Layer) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, layer: Layer) => void
  onDragEnter?: (e: React.DragEvent, layer: Layer) => void
  onDragLeave?: (e: React.DragEvent) => void
}

export function LayerTreeItem({ 
  layer, 
  isActive, 
  layerStore, 
  layers,
  level,
  onDragStart, 
  onDragOver, 
  onDrop,
  onDragEnter,
  onDragLeave
}: LayerTreeItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isGroup = layer.type === 'group'
  const isExpanded = isGroup ? layerStore.isGroupExpanded(layer.id) : false
  const children = layers.filter(l => l.parentId === layer.id)
  const hasChildren = children.length > 0
  
  const Icon = isGroup ? (isExpanded ? FolderOpen : Folder) : layerTypeIcons[layer.type] || Layers
  
  const handleVisibilityToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Emit layer visibility event
    console.log('Toggle visibility:', layer.id)
  }
  
  const handleLockToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Emit layer lock event
    console.log('Toggle lock:', layer.id)
  }
  
  const handleClick = () => {
    layerStore.setActiveLayer(layer.id)
  }
  
  const handleGroupToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGroup) {
      layerStore.toggleGroupExpansion(layer.id)
    }
  }
  
  const handleDragEnter = (e: React.DragEvent) => {
    if (isGroup) {
      setIsDragOver(true)
      onDragEnter?.(e, layer)
    }
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragOver(false)
    onDragLeave?.(e)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false)
    onDrop(e, layer)
  }
  
  return (
    <>
      <div
        draggable={!layer.locked}
        onDragStart={(e) => onDragStart(e, layer)}
        onDragOver={onDragOver}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          isActive ? "bg-primary/10 text-primary" : "hover:bg-foreground/5",
          !layer.visible && "opacity-50",
          isDragOver && isGroup && "bg-primary/20 ring-1 ring-primary/50"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/collapse for groups */}
        {isGroup ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={handleGroupToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-4" /> // Spacer for alignment
        )}
        
        {/* Layer icon */}
        <Icon className="w-4 h-4 flex-shrink-0" />
        
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
        </div>
      </div>
      
      {/* Render children if group is expanded */}
      {isGroup && isExpanded && hasChildren && (
        <div className="layer-group-children">
          {children.map(child => (
            <LayerTreeItem
              key={child.id}
              layer={child}
              isActive={layerStore.getState().activeLayerId === child.id}
              layerStore={layerStore}
              layers={layers}
              level={level + 1}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface LayerTreeProps {
  layers: Layer[]
  activeLayerId: string | null
  layerStore: EventLayerStore
  onDragStart: (e: React.DragEvent, layer: Layer) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, layer: Layer) => void
}

export function LayerTree({ 
  layers, 
  activeLayerId, 
  layerStore,
  onDragStart,
  onDragOver,
  onDrop
}: LayerTreeProps) {
  // Get root layers (no parent)
  const rootLayers = layers.filter(l => !l.parentId)
  
  return (
    <div className="layer-tree">
      {rootLayers.map(layer => (
        <LayerTreeItem
          key={layer.id}
          layer={layer}
          isActive={layer.id === activeLayerId}
          layerStore={layerStore}
          layers={layers}
          level={0}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ))}
    </div>
  )
} 