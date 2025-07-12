'use client'

import { useState, useEffect } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { ObjectStore } from '@/lib/store/objects/ObjectStore'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { 
  Plus, 
  Square,
  Type,
  Image as ImageIcon,
  ChevronDown,
  Group,
  Ungroup
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
import type { CanvasObject, ShapeData, TextData } from '@/lib/editor/objects/types'
import type { BlendMode } from '@/types'
import { ObjectTree } from './ObjectTree'

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

export function ObjectsPanel() {
  const objectStore = useService<ObjectStore>('ObjectStore')
  const canvasManager = useService<CanvasManager>('CanvasManager')
  const [draggedObject, setDraggedObject] = useState<CanvasObject | null>(null)
  const [objectState, setObjectState] = useState(objectStore.getState())
  
  // Subscribe to object store changes
  useEffect(() => {
    const unsubscribe = objectStore.subscribe(setObjectState)
    return unsubscribe
  }, [objectStore])
  
  const objects = objectStore.getObjectsInOrder()
  const selectedObjects = objectStore.getSelectedObjects()
  const activeObject = selectedObjects.length === 1 ? selectedObjects[0] : null
  
  const handleDragStart = (e: React.DragEvent, object: CanvasObject) => {
    setDraggedObject(object)
    e.dataTransfer.effectAllowed = 'move'
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = async (e: React.DragEvent, targetObject: CanvasObject) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedObject || draggedObject.id === targetObject.id) {
      setDraggedObject(null)
      return
    }
    
    // If dropping on a group, move the object into the group
    if (targetObject.type === 'group' && !targetObject.children?.includes(draggedObject.id)) {
      await canvasManager.moveObjectToGroup(draggedObject.id, targetObject.id)
    } else {
      // Otherwise, reorder objects by z-index
      const draggedZ = draggedObject.zIndex
      const targetZ = targetObject.zIndex
      
      // Update z-indices to move dragged object after target
      await canvasManager.updateObject(draggedObject.id, { zIndex: targetZ })
      
      // Shift other objects as needed
      for (const obj of objects) {
        if (obj.id !== draggedObject.id && obj.zIndex >= targetZ && obj.zIndex < draggedZ) {
          await canvasManager.updateObject(obj.id, { zIndex: obj.zIndex + 1 })
        }
      }
    }
    
    setDraggedObject(null)
  }
  
  const handleAddShape = async () => {
    const shapeData: ShapeData = {
      type: 'rectangle',
      fill: '#000000',
      stroke: '#000000',
      strokeWidth: 0
    }
    
    await canvasManager.addObject({
      type: 'shape',
      name: `Shape ${objects.filter(o => o.type === 'shape').length + 1}`,
      data: shapeData
    })
  }
  
  const handleAddText = async () => {
    const textData: TextData = {
      content: 'New Text',
      font: 'Arial',
      fontSize: 24,
      color: '#000000',
      align: 'left'
    }
    
    await canvasManager.addObject({
      type: 'text',
      name: `Text ${objects.filter(o => o.type === 'text').length + 1}`,
      data: textData
    })
  }
  
  const handleAddImage = () => {
    // This would open a file picker or image generation dialog
    console.log('Add image - implement file picker')
  }
  
  const handleGroup = async () => {
    if (selectedObjects.length < 2) return
    
    const selectedIds = selectedObjects.map(obj => obj.id)
    const groupId = await canvasManager.addObject({
      type: 'group',
      name: `Group ${objects.filter(o => o.type === 'group').length + 1}`,
      children: selectedIds
    })
    
    // Move objects to group
    for (const id of selectedIds) {
      await canvasManager.moveObjectToGroup(id, groupId)
    }
    
    // Select the new group
    canvasManager.selectObject(groupId)
  }
  
  const handleUngroup = async () => {
    if (!activeObject || activeObject.type !== 'group') return
    
    const children = activeObject.children || []
    
    // Move children to root
    for (const childId of children) {
      await canvasManager.moveObjectToRoot(childId)
    }
    
    // Remove the group
    await canvasManager.removeObject(activeObject.id)
    
    // Select the ungrouped objects
    canvasManager.selectMultiple(children)
  }
  
  const handleOpacityChange = async (value: number[]) => {
    if (!activeObject) return
    await canvasManager.updateObject(activeObject.id, { opacity: value[0] / 100 })
  }
  
  const handleBlendModeChange = async (value: BlendMode) => {
    if (!activeObject) return
    await canvasManager.updateObject(activeObject.id, { blendMode: value })
  }
  
  // Reverse the objects for display (top object first)
  const displayObjects = [...objects].reverse()
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Object controls */}
      <div className="p-3 border-b border-foreground/10 space-y-3">
        {activeObject && (
          <>
            {/* Opacity slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Opacity</label>
                <span className="text-xs text-foreground/60">{Math.round(activeObject.opacity * 100)}%</span>
              </div>
              <Slider
                value={[activeObject.opacity * 100]}
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
                value={activeObject.blendMode}
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
        
        {/* Group/Ungroup buttons */}
        {selectedObjects.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleGroup}
          >
            <Group className="mr-2 h-4 w-4" />
            Group Objects
          </Button>
        )}
        
        {activeObject?.type === 'group' && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleUngroup}
          >
            <Ungroup className="mr-2 h-4 w-4" />
            Ungroup
          </Button>
        )}
      </div>
      
      {/* Object list */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayObjects.length === 0 ? (
          <div className="text-center text-foreground/60 text-sm py-8">
            <Square className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No objects yet</p>
            <p className="mt-2 text-xs">Click the buttons below to add objects</p>
          </div>
        ) : (
          <ObjectTree
            objects={displayObjects}
            selectedObjectIds={objectState.selectedObjectIds}
            canvasManager={canvasManager}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        )}
      </div>
      
      {/* Add object buttons */}
      <div className="p-3 border-t border-foreground/10 space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Object
              <ChevronDown className="ml-auto h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleAddShape}>
              <Square className="mr-2 h-4 w-4" />
              Shape
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddText}>
              <Type className="mr-2 h-4 w-4" />
              Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddImage}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 