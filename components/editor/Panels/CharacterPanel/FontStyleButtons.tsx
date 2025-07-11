'use client'

import Konva from 'konva'
import type { CanvasObject } from '@/lib/editor/objects/types'
import { Toggle } from '@/components/ui/toggle'
import { Bold, Italic, Underline } from 'lucide-react'

interface FontStyleButtonsProps {
  textObject: CanvasObject | null
  textStyle: {
    fontStyle: string
    textDecoration: string
  }
  onChange: (property: string, value: unknown) => void
}

export function FontStyleButtons({ textObject, textStyle, onChange }: FontStyleButtonsProps) {
  if (!textObject || (textObject.type !== 'text' && textObject.type !== 'verticalText')) {
    return null
  }
  
  const fontStyle = textStyle.fontStyle || 'normal'
  const textDecoration = textStyle.textDecoration || ''
  
  // Parse font style for bold/italic
  const isBold = fontStyle.includes('bold')
  const isItalic = fontStyle.includes('italic')
  const isUnderline = textDecoration.includes('underline')
  
  const updateFontStyle = (bold: boolean, italic: boolean) => {
    let newStyle = 'normal'
    if (bold && italic) newStyle = 'bold italic'
    else if (bold) newStyle = 'bold'
    else if (italic) newStyle = 'italic'
    
    onChange('fontStyle', newStyle)
  }
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">Style</label>
      <div className="flex gap-1">
        <Toggle
          size="sm"
          pressed={isBold}
          onPressedChange={(pressed) => {
            updateFontStyle(pressed, isItalic)
          }}
          aria-label="Toggle bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={isItalic}
          onPressedChange={(pressed) => {
            updateFontStyle(isBold, pressed)
          }}
          aria-label="Toggle italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={isUnderline}
          onPressedChange={(pressed) => {
            onChange('textDecoration', pressed ? 'underline' : '')
          }}
          aria-label="Toggle underline"
        >
          <Underline className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  )
} 