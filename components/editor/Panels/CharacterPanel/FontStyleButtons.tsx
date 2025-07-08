'use client'

import { IText, Textbox } from 'fabric'
import { Toggle } from '@/components/ui/toggle'
import { Bold, Italic, Underline } from 'lucide-react'

interface FontStyleButtonsProps {
  object: IText | Textbox
  onChange: <K extends keyof IText>(property: K, value: IText[K]) => void
}

export function FontStyleButtons({ object, onChange }: FontStyleButtonsProps) {
  const isBold = object.fontWeight === 'bold' || object.fontWeight === 700
  const isItalic = object.fontStyle === 'italic'
  const isUnderline = object.underline === true
  
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">Style</label>
      <div className="flex gap-1">
        <Toggle
          size="sm"
          pressed={isBold}
          onPressedChange={(pressed) => {
            onChange('fontWeight', pressed ? 'bold' : 'normal')
          }}
          aria-label="Toggle bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={isItalic}
          onPressedChange={(pressed) => {
            onChange('fontStyle', pressed ? 'italic' : 'normal')
          }}
          aria-label="Toggle italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        
        <Toggle
          size="sm"
          pressed={isUnderline}
          onPressedChange={(pressed) => {
            onChange('underline', pressed)
          }}
          aria-label="Toggle underline"
        >
          <Underline className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  )
} 