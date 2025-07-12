'use client'

import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { TypedCanvasStore, useCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { ObjectManager } from '@/lib/editor/canvas/services/ObjectManager'
import { useEffect, useState } from 'react'

export function StatusBar() {
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  const canvasState = useCanvasStore(canvasStore)
  const selectionStore = useService<EventSelectionStore>('SelectionStore')
  const selectionState = useStore(selectionStore)
  const objectManager = useService<ObjectManager>('ObjectManager')
  
  // Track object count
  const [objectCount, setObjectCount] = useState(0)
  const [selectedObjects, setSelectedObjects] = useState<Array<{ type: string; width: number; height: number }>>([])
  
  // Update object count periodically
  useEffect(() => {
    const updateObjectInfo = () => {
      const objects = objectManager.getAllObjects()
      setObjectCount(objects.length)
      
      // Get selected object details
      const selectedIds = Array.from(selectionState.selectedObjectIds)
      const selected = selectedIds.map(id => objectManager.getObject(id)).filter(Boolean)
      setSelectedObjects(selected.map(obj => ({
        type: obj!.type,
        width: Math.round(obj!.width * obj!.scaleX),
        height: Math.round(obj!.height * obj!.scaleY)
      })))
    }
    
    updateObjectInfo()
    const interval = setInterval(updateObjectInfo, 500) // Update every 500ms
    
    return () => clearInterval(interval)
  }, [objectManager, selectionState.selectedObjectIds])
  
  // Format selected object info
  const getSelectionInfo = () => {
    if (selectedObjects.length === 0) return null
    if (selectedObjects.length === 1) {
      const obj = selectedObjects[0]
      return `${obj.type.charAt(0).toUpperCase() + obj.type.slice(1)} ${obj.width}×${obj.height}px`
    }
    return `${selectedObjects.length} objects selected`
  }
  
  return (
    <div className="h-6 bg-background border-t border-foreground/10 flex items-center px-4 text-xs text-foreground/60">
      <div className="flex items-center gap-4">
        <span>{objectCount} {objectCount === 1 ? 'object' : 'objects'}</span>
        {selectionState.selectedObjectIds.size > 0 && (
          <>
            <span>·</span>
            <span>{selectionState.selectedObjectIds.size} selected</span>
          </>
        )}
        {getSelectionInfo() && (
          <>
            <span>·</span>
            <span>{getSelectionInfo()}</span>
          </>
        )}
        <span>·</span>
        <span>{Math.round(canvasState.zoom * 100)}%</span>
      </div>
      <div className="flex-1" />
    </div>
  )
} 