'use client'

import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { TypedCanvasStore, useCanvasStore } from '@/lib/store/canvas/TypedCanvasStore'
import type { CanvasObject } from '@/lib/editor/canvas/types'
import Konva from 'konva'
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
        <AlignLeft className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to see paragraph options</p>
      </div>
    )
  }

  const updateTextProperty = (property: string, value: unknown) => {
    if (!activeTextObject || !activeTextObject.node) return
    
    const textNode = activeTextObject.node as Konva.Text
    
    // Update the Konva text node properties
    switch (property) {
      case 'textAlign':
      case 'align':
        textNode.align(value as string)
        break
      case 'lineHeight':
        textNode.lineHeight(value as number)
        break
      case 'letterSpacing':
        textNode.letterSpacing(value as number)
        break
      case 'width':
        textNode.width(value as number)
        break
      // Note: Konva doesn't have direct support for all paragraph features
      // Some features would need custom implementation
      default:
        console.log('Paragraph property not implemented for Konva:', property, value)
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
    textAlign: textNode?.align() || 'left',
    lineHeight: textNode?.lineHeight() || 1.2,
    letterSpacing: textNode?.letterSpacing() || 0,
    width: textNode?.width() || 200,
    direction: 'ltr' as 'ltr' | 'rtl' // Konva doesn't have built-in RTL support
  }
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Paragraph</h3>
      
      {/* Text Alignment */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Alignment</label>
        <AlignmentButtons
          value={textStyle.textAlign}
          onChange={(align: string) => updateTextProperty('textAlign', align)}
        />
      </div>

      {/* Indentation */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Indentation</label>
        <IndentControls
          textObject={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      {/* Spacing */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Spacing</label>
        <SpacingControls
          textObject={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      {/* Justification */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Justification</label>
        <JustificationOptions
          textObject={activeTextObject}
          onChange={updateTextProperty}
        />
      </div>

      {/* Text Direction */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Text Direction</label>
        <TextDirectionControl
          value={textStyle.direction}
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