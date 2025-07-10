'use client'

import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { TypedCanvasStore, useCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import { AlignmentButtons } from './AlignmentButtons'
import { IndentControls } from './IndentControls'
import { SpacingControls } from './SpacingControls'
import { JustificationOptions } from './JustificationOptions'
import { TextDirectionControl } from './TextDirectionControl'
import { Button } from '@/components/ui/button'
import { AlignLeft } from 'lucide-react'

/**
 * Paragraph Panel - Advanced paragraph formatting controls
 * Shows when a text object is selected
 */
export function ParagraphPanel() {
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
        <AlignLeft className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to see paragraph options</p>
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
      <h3 className="font-semibold text-sm text-foreground">Paragraph</h3>
      
      {/* Text Alignment */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Alignment</label>
        <AlignmentButtons
          value={textStyle.textAlign || 'left'}
          onChange={(align: string) => updateTextProperty('textAlign', align)}
        />
      </div>

      {/* Indentation */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Indentation</label>
        <IndentControls
          object={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      {/* Spacing */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Spacing</label>
        <SpacingControls
          object={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      {/* Justification */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Justification</label>
        <JustificationOptions
          object={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      {/* Text Direction */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Text Direction</label>
        <TextDirectionControl
          value={textStyle.direction || 'ltr'}
          onChange={(direction) => updateTextProperty('direction', direction)}
        />
      </div>
      
      {/* Advanced Options */}
      <div className="pt-2 border-t">
        <Button variant="outline" size="sm" className="w-full">
          Paragraph Styles...
        </Button>
      </div>
    </div>
  )
} 