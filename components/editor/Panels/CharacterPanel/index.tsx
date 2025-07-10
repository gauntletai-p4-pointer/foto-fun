'use client'

import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { TypedCanvasStore, useCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import Konva from 'konva'
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
  const [activeTextObject, setActiveTextObject] = useState<CanvasObject | null>(null)
  
  useEffect(() => {
    // Check if we have a text object selected
    const selectedObjects = canvasStore.getSelectedObjects()
    const textObject = selectedObjects.find(obj => obj.type === 'text' || obj.type === 'verticalText')
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

  const updateTextProperty = (property: string, value: unknown) => {
    if (!activeTextObject || !activeTextObject.node) return
    
    const textNode = activeTextObject.node as Konva.Text
    
    // Update the Konva text node properties
    switch (property) {
      case 'fontFamily':
        textNode.fontFamily(value as string)
        break
      case 'fontSize':
        textNode.fontSize(value as number)
        break
      case 'fill':
        textNode.fill(value as string)
        break
      case 'fontWeight':
        textNode.fontStyle(value as string)
        break
      case 'fontStyle':
        textNode.fontStyle(value as string)
        break
      case 'textDecoration':
        textNode.textDecoration(value as string)
        break
      case 'letterSpacing':
        textNode.letterSpacing(value as number)
        break
      case 'lineHeight':
        textNode.lineHeight(value as number)
        break
    }
    
    // Redraw the layer
    const layer = textNode.getLayer()
    if (layer) layer.batchDraw()
    
    // Update the canvas object data
    activeTextObject.data = textNode.text()
  }

  // Extract text properties from the Konva text node
  const textNode = activeTextObject.node as Konva.Text
  const textStyle = {
    fontFamily: textNode?.fontFamily() || 'Arial',
    fontSize: textNode?.fontSize() || 24,
    fill: (textNode?.fill() as string) || '#000000',
    fontStyle: textNode?.fontStyle() || 'normal',
    textDecoration: textNode?.textDecoration() || '',
    letterSpacing: textNode?.letterSpacing() || 0,
    lineHeight: textNode?.lineHeight() || 1.16
  }
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Character</h3>
      
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Font Family</label>
        <FontSelector
          value={textStyle.fontFamily}
          onChange={(font) => updateTextProperty('fontFamily', font)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Font Size</label>
        <FontSizeInput
          value={textStyle.fontSize}
          onChange={(size) => updateTextProperty('fontSize', size)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Font Style</label>
        <FontStyleButtons
          textObject={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Text Color</label>
        <TextColorPicker
          value={textStyle.fill}
          onChange={(color) => updateTextProperty('fill', color)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Letter Spacing</label>
        <LetterSpacingControl
          value={textStyle.letterSpacing}
          onChange={(spacing) => updateTextProperty('letterSpacing', spacing)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Line Height</label>
        <LineHeightControl
          value={textStyle.lineHeight}
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