'use client'

import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { TypedCanvasStore, useCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { FontSelector } from './FontSelector'
import { FontSizeInput } from './FontSizeInput'
import { FontStyleButtons } from './FontStyleButtons'
import { TextColorPicker } from './TextColorPicker'
import { LetterSpacingControl } from './LetterSpacingControl'
import { LineHeightControl } from './LineHeightControl'
import { Button } from '@/components/ui/button'
import { Type } from 'lucide-react'

/**
 * Character Panel - Advanced text formatting controls
 * Shows when a text object is selected
 */
export function CharacterPanel() {
  const canvasStore = useService<TypedCanvasStore>('CanvasStore')
  const canvasState = useCanvasStore(canvasStore)
  const [activeTextObject, setActiveTextObject] = useState<any | null>(null)
  
  useEffect(() => {
    // Check if we have a text object selected
    const selectedObjects = canvasStore.getSelectedObjects()
    const textObject = selectedObjects.find(obj => obj.type === 'text')
    setActiveTextObject(textObject || null)
  }, [canvasState.selection, canvasStore])
  
  if (!activeTextObject) {
    return (
      <div className="p-4 text-center text-foreground/60">
        <Type className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to see character options</p>
      </div>
    )
  }
  
  const updateTextProperty = (property: string, value: any) => {
    if (!activeTextObject) return
    
    // TODO: Update this to work with the new canvas system
    console.log('Update text property:', property, value, 'for object:', activeTextObject)
  }
  
  // Extract text properties from the object
  const textStyle = activeTextObject.style || {}
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Character</h3>
      
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Font Family</label>
        <FontSelector
          value={textStyle.fontFamily || 'Arial'}
          onChange={(font) => updateTextProperty('fontFamily', font)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Font Size</label>
        <FontSizeInput
          value={textStyle.fontSize || 24}
          onChange={(size) => updateTextProperty('fontSize', size)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Font Style</label>
        <FontStyleButtons
          object={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Text Color</label>
        <TextColorPicker
          value={textStyle.fill || '#000000'}
          onChange={(color) => updateTextProperty('fill', color)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Letter Spacing</label>
        <LetterSpacingControl
          value={textStyle.charSpacing || 0}
          onChange={(spacing) => updateTextProperty('charSpacing', spacing)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Line Height</label>
        <LineHeightControl
          value={textStyle.lineHeight || 1.16}
          onChange={(height) => updateTextProperty('lineHeight', height)}
        />
      </div>
      
      {/* Advanced Options */}
      <div className="pt-2 border-t border-foreground/10">
        <Button variant="outline" size="sm" className="w-full">
          More Options...
        </Button>
      </div>
    </div>
  )
} 