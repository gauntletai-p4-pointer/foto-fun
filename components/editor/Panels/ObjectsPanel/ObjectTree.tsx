'use client'

import { useState } from 'react'
import { CanvasObject } from '@/lib/editor/objects/types'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  ChevronRight,
  ChevronDown,
  Group as GroupIcon,
  Image as ImageIcon,
  Type,
  Square
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Icons for different object types
const objectTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  shape: Square,
  text: Type,
  group: GroupIcon,
}

interface ObjectTreeItemProps {
  object: CanvasObject
  isSelected: boolean
  canvasManager: CanvasManager
  objects: CanvasObject[]
  level: number
  onDragStart: (e: React.DragEvent, object: CanvasObject) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, object: CanvasObject) => void
  expandedGroups: Set<string>
  onToggleExpand: (objectId: string) => void
}

export function ObjectTreeItem({ 
  object, 
  isSelected, 
  canvasManager, 
  objects,
  level,
  onDragStart, 
  onDragOver, 
  onDrop,
  expandedGroups,
  onToggleExpand
}: ObjectTreeItemProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const isGroup = object.type === 'group'
  const isExpanded = isGroup && expandedGroups.has(object.id)
  const children = isGroup && object.children ? 
    objects.filter(o => object.children?.includes(o.id)) : []
  const hasChildren = children.length > 0
  
  const Icon = objectTypeIcons[object.type] || Square
  
  const handleVisibilityToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await canvasManager.updateObject(object.id, { visible: !object.visible })
  }
  
  const handleLockToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await canvasManager.updateObject(object.id, { locked: !object.locked })
  }
  
  const handleClick = () => {
    if (isSelected) {
      // If already selected, deselect
      canvasManager.selectObject('')
    } else {
      canvasManager.selectObject(object.id)
    }
  }
  
  const handleGroupToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isGroup) {
      onToggleExpand(object.id)
    }
  }
  
  const handleDragEnter = (e: React.DragEvent) => {
    if (isGroup) {
      setIsDragOver(true)
    }
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragOver(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false)
    onDrop(e, object)
  }
  
  return (
    <>
      <div
        draggable={!object.locked}
        onDragStart={(e) => onDragStart(e, object)}
        onDragOver={onDragOver}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-foreground/5",
          !object.visible && "opacity-50",
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
        
        {/* Object icon */}
        <Icon className="w-4 h-4 flex-shrink-0" />
        
        {/* Object name */}
        <span className="flex-1 text-sm truncate">{object.name}</span>
        
        {/* Object controls */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Visibility toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleVisibilityToggle}
          >
            {object.visible ? (
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
            {object.locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Unlock className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Render children if group is expanded */}
      {isGroup && isExpanded && hasChildren && (
        <div className="object-group-children">
          {children.map(child => (
            <ObjectTreeItem
              key={child.id}
              object={child}
              isSelected={isSelected}
              canvasManager={canvasManager}
              objects={objects}
              level={level + 1}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              expandedGroups={expandedGroups}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface ObjectTreeProps {
  objects: CanvasObject[]
  selectedObjectIds: Set<string>
  canvasManager: CanvasManager
  onDragStart: (e: React.DragEvent, object: CanvasObject) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, object: CanvasObject) => void
}

export function ObjectTree({ 
  objects, 
  selectedObjectIds, 
  canvasManager,
  onDragStart,
  onDragOver,
  onDrop
}: ObjectTreeProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  const toggleExpand = (objectId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(objectId)) {
      newExpanded.delete(objectId)
    } else {
      newExpanded.add(objectId)
    }
    setExpandedGroups(newExpanded)
  }
  
  // Get root objects (not in any group)
  const rootObjects = objects.filter(obj => {
    // Check if this object is a child of any group
    return !objects.some(parent => 
      parent.type === 'group' && parent.children?.includes(obj.id)
    )
  })
  
  return (
    <div className="object-tree">
      {rootObjects.map(object => (
        <ObjectTreeItem
          key={object.id}
          object={object}
          isSelected={selectedObjectIds.has(object.id)}
          canvasManager={canvasManager}
          objects={objects}
          level={0}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          expandedGroups={expandedGroups}
          onToggleExpand={toggleExpand}
        />
      ))}
    </div>
  )
} 