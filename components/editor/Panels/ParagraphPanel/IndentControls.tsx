'use client'

import { IText, Textbox } from 'fabric'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { IndentIncrease, IndentDecrease } from 'lucide-react'

interface IndentControlsProps {
  object: IText | Textbox
  onChange: <K extends keyof IText>(property: K, value: IText[K]) => void
}

// Extend IText with custom properties
interface ExtendedTextObject extends IText {
  leftIndent?: number
  rightIndent?: number
  firstLineIndent?: number
  textIndent?: number
}

export function IndentControls({ object, onChange }: IndentControlsProps) {
  // Cast to extended type for custom properties
  const extendedObject = object as ExtendedTextObject
  
  // Fabric.js doesn't have built-in indent properties, so we'll use custom ones
  const leftIndent = extendedObject.leftIndent || 0
  const rightIndent = extendedObject.rightIndent || 0
  const firstLineIndent = extendedObject.firstLineIndent || 0
  
  const handleIndentChange = (type: 'left' | 'right' | 'firstLine', value: number) => {
    // Update the custom property
    if (type === 'left') {
      extendedObject.leftIndent = value
    } else if (type === 'right') {
      extendedObject.rightIndent = value
    } else if (type === 'firstLine') {
      extendedObject.firstLineIndent = value
    }
    
    // For left indent, we can use padding
    if (type === 'left') {
      onChange('padding' as keyof IText, value as IText['padding'])
    }
    
    // Trigger re-render
    onChange('dirty' as keyof IText, true as IText['dirty'])
  }
  
  const adjustIndent = (type: 'left' | 'right' | 'firstLine', delta: number) => {
    const current = type === 'left' ? leftIndent : 
                   type === 'right' ? rightIndent : firstLineIndent
    const newValue = Math.max(0, current + delta)
    handleIndentChange(type, newValue)
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Indentation</Label>
      </div>
      
      {/* Left Indent */}
      <div className="flex items-center gap-2">
        <Label className="text-xs w-20">Left:</Label>
        <div className="flex items-center gap-1 flex-1">
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => adjustIndent('left', -10)}
          >
            <IndentDecrease className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={leftIndent}
            onChange={(e) => handleIndentChange('left', Number(e.target.value))}
            className="h-6 text-xs flex-1"
            min={0}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => adjustIndent('left', 10)}
          >
            <IndentIncrease className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Right Indent */}
      <div className="flex items-center gap-2">
        <Label className="text-xs w-20">Right:</Label>
        <div className="flex items-center gap-1 flex-1">
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => adjustIndent('right', -10)}
          >
            <IndentDecrease className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={rightIndent}
            onChange={(e) => handleIndentChange('right', Number(e.target.value))}
            className="h-6 text-xs flex-1"
            min={0}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => adjustIndent('right', 10)}
          >
            <IndentIncrease className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* First Line Indent */}
      <div className="flex items-center gap-2">
        <Label className="text-xs w-20">First Line:</Label>
        <div className="flex items-center gap-1 flex-1">
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => adjustIndent('firstLine', -10)}
          >
            <IndentDecrease className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            value={firstLineIndent}
            onChange={(e) => handleIndentChange('firstLine', Number(e.target.value))}
            className="h-6 text-xs flex-1"
            min={0}
          />
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            onClick={() => adjustIndent('firstLine', 10)}
          >
            <IndentIncrease className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
} 