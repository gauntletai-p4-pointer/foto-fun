'use client'

import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useService } from '@/lib/core/AppInitializer'
import { useStore } from '@/lib/store/base/BaseStore'
import { EventSelectionStore } from '@/lib/store/selection/EventSelectionStore'
import { CanvasManager } from '@/lib/editor/canvas/CanvasManager'
import { getMetadataValue } from '@/lib/editor/canvas/types'

const WORD_SPACING_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'tight', label: 'Tight (-10%)' },
  { value: 'loose', label: 'Loose (+10%)' },
  { value: 'very-tight', label: 'Very Tight (-20%)' },
  { value: 'very-loose', label: 'Very Loose (+20%)' },
]

export function JustificationOptions() {
  const selectionStore = useService<EventSelectionStore>('SelectionStore')
  const canvasManager = useService<CanvasManager>('CanvasManager')
  
  const selectionState = useStore(selectionStore)
  
  // Get selected text objects
  const selectedTextObjects = Array.from(selectionState.selectedObjectIds)
    .map(id => canvasManager.getObject(id))
    .filter(obj => obj && obj.type === 'text')
  
  // Get current values from first selected text object
  const firstTextObject = selectedTextObjects[0]
  const justifyLastLine = firstTextObject ? getMetadataValue(firstTextObject, 'justifyLastLine') || false : false
  const wordSpacing = firstTextObject ? getMetadataValue(firstTextObject, 'wordSpacing') || 'normal' : 'normal'
  const hyphenation = firstTextObject ? getMetadataValue(firstTextObject, 'hyphenation') || false : false
  
  const handleJustifyLastLineChange = (checked: boolean) => {
    selectedTextObjects.forEach(obj => {
      if (!obj) return
      canvasManager.updateObject(obj.id, {
        metadata: { ...obj.metadata, justifyLastLine: checked }
      })
    })
  }
  
  const handleWordSpacingChange = (value: string) => {
    selectedTextObjects.forEach(obj => {
      if (!obj) return
      canvasManager.updateObject(obj.id, {
        metadata: { ...obj.metadata, wordSpacing: value }
      })
    })
  }
  
  const handleHyphenationChange = (checked: boolean) => {
    selectedTextObjects.forEach(obj => {
      if (!obj) return
      canvasManager.updateObject(obj.id, {
        metadata: { ...obj.metadata, hyphenation: checked }
      })
    })
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Justification</h3>
      
      {/* Justify Last Line */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="justify-last-line"
          checked={!!justifyLastLine}
          onCheckedChange={handleJustifyLastLineChange}
          disabled={selectedTextObjects.length === 0}
        />
        <Label htmlFor="justify-last-line" className="text-xs">
          Justify last line
        </Label>
      </div>
      
      {/* Word Spacing */}
      <div className="space-y-2">
        <Label htmlFor="word-spacing" className="text-xs">Word Spacing</Label>
        <Select 
          value={String(wordSpacing)} 
          onValueChange={handleWordSpacingChange}
          disabled={selectedTextObjects.length === 0}
        >
          <SelectTrigger id="word-spacing" className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORD_SPACING_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Hyphenation */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hyphenation"
          checked={!!hyphenation}
          onCheckedChange={handleHyphenationChange}
          disabled={selectedTextObjects.length === 0}
        />
        <Label htmlFor="hyphenation" className="text-xs">
          Hyphenation
        </Label>
      </div>
    </div>
  )
} 