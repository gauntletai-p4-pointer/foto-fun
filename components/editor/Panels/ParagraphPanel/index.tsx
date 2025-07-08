'use client'

import { useEffect, useState } from 'react'
import { IText, Textbox } from 'fabric'
import { useCanvasStore } from '@/store/canvasStore'
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
  const { fabricCanvas } = useCanvasStore()
  const [activeTextObject, setActiveTextObject] = useState<IText | Textbox | null>(null)
  
  useEffect(() => {
    if (!fabricCanvas) return
    
    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject()
      if (activeObject && (activeObject instanceof IText || activeObject instanceof Textbox)) {
        setActiveTextObject(activeObject)
      } else {
        setActiveTextObject(null)
      }
    }
    
    // Initial check
    handleSelection()
    
    // Listen for selection changes
    fabricCanvas.on('selection:created', handleSelection)
    fabricCanvas.on('selection:updated', handleSelection)
    fabricCanvas.on('selection:cleared', () => setActiveTextObject(null))
    
    return () => {
      fabricCanvas.off('selection:created', handleSelection)
      fabricCanvas.off('selection:updated', handleSelection)
      fabricCanvas.off('selection:cleared')
    }
  }, [fabricCanvas])
  
  if (!activeTextObject) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <AlignLeft className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p>Select text to see paragraph options</p>
      </div>
    )
  }
  
  const updateTextProperty = <K extends keyof IText>(property: K, value: IText[K]) => {
    if (!activeTextObject || !fabricCanvas) return
    
    activeTextObject.set(property, value)
    fabricCanvas.renderAll()
    
    // Fire modified event for history tracking
    fabricCanvas.fire('object:modified', { target: activeTextObject })
  }
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm text-foreground">Paragraph</h3>
      
      {/* Text Alignment */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Alignment</label>
        <AlignmentButtons
          value={activeTextObject.textAlign || 'left'}
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
          value={(activeTextObject.direction === 'ltr' || activeTextObject.direction === 'rtl') ? activeTextObject.direction : 'ltr'}
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