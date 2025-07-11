'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventTextStore } from '@/lib/store/text/EventTextStore'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { getMetadataValue } from '@/lib/editor/canvas/types'

export function IndentControls() {
  const textStore = useService<EventTextStore>('TextStore')
  const selectionStore = useService<EventSelectionStore>('SelectionStore')
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  const selectionState = useStore(selectionStore)
  
  // Get selected text objects
  const selectedTextObjects = Array.from(selectionState.selectedObjectIds)
    .map(id => canvasManager.getObjectById(id))
    .filter(obj => obj && obj.type === 'text')
  
  // Get current indentation values from first selected text object
  const firstTextObject = selectedTextObjects[0]
  const leftIndent = firstTextObject ? getMetadataValue(firstTextObject, 'leftIndent', 0) : 0
  const rightIndent = firstTextObject ? getMetadataValue(firstTextObject, 'rightIndent', 0) : 0
  const firstLineIndent = firstTextObject ? getMetadataValue(firstTextObject, 'firstLineIndent', 0) : 0
  
  const handleIndentChange = (type: 'left' | 'right' | 'firstLine', value: number) => {
    selectedTextObjects.forEach(obj => {
      if (!obj) return
      
      const updates: Record<string, number> = {}
      if (type === 'left') updates.leftIndent = value
      if (type === 'right') updates.rightIndent = value
      if (type === 'firstLine') updates.firstLineIndent = value
      
      canvasManager.updateObject(obj.id, {
        metadata: { ...obj.metadata, ...updates }
      })
    })
  }
  
  const adjustIndent = (type: 'left' | 'right' | 'firstLine', delta: number) => {
    const current = type === 'left' ? leftIndent : type === 'right' ? rightIndent : firstLineIndent
    const newValue = Math.max(0, Number(current) + delta)
    handleIndentChange(type, newValue)
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Indentation</h3>
      
      {/* Left Indent */}
      <div className="space-y-2">
        <Label htmlFor="left-indent" className="text-xs">Left Indent</Label>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => adjustIndent('left', -10)}
            disabled={selectedTextObjects.length === 0}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Input
            id="left-indent"
            type="number"
            min="0"
            value={leftIndent}
            onChange={(e) => handleIndentChange('left', Number(e.target.value))}
            className="h-8 text-xs"
            disabled={selectedTextObjects.length === 0}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => adjustIndent('left', 10)}
            disabled={selectedTextObjects.length === 0}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Right Indent */}
      <div className="space-y-2">
        <Label htmlFor="right-indent" className="text-xs">Right Indent</Label>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => adjustIndent('right', -10)}
            disabled={selectedTextObjects.length === 0}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Input
            id="right-indent"
            type="number"
            min="0"
            value={rightIndent}
            onChange={(e) => handleIndentChange('right', Number(e.target.value))}
            className="h-8 text-xs"
            disabled={selectedTextObjects.length === 0}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => adjustIndent('right', 10)}
            disabled={selectedTextObjects.length === 0}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* First Line Indent */}
      <div className="space-y-2">
        <Label htmlFor="first-line-indent" className="text-xs">First Line</Label>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => adjustIndent('firstLine', -10)}
            disabled={selectedTextObjects.length === 0}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Input
            id="first-line-indent"
            type="number"
            value={firstLineIndent}
            onChange={(e) => handleIndentChange('firstLine', Number(e.target.value))}
            className="h-8 text-xs"
            disabled={selectedTextObjects.length === 0}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => adjustIndent('firstLine', 10)}
            disabled={selectedTextObjects.length === 0}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
} 