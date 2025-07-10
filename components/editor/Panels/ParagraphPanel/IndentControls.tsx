'use client'

import { CanvasObject } from '@/lib/editor/canvas/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { IndentIncrease, IndentDecrease } from 'lucide-react'
import Konva from 'konva'

interface IndentControlsProps {
  textObject: CanvasObject | null
  onChange: (property: string, value: unknown) => void
}

export function IndentControls({ textObject, onChange }: IndentControlsProps) {
  if (!textObject || (textObject.type !== 'text' && textObject.type !== 'verticalText')) {
    return null
  }
  
  const textNode = textObject.node as Konva.Text
  if (!textNode) return null
  
  // Get indent values from metadata
  const leftIndent = textObject.metadata?.leftIndent || 0
  const rightIndent = textObject.metadata?.rightIndent || 0
  const firstLineIndent = textObject.metadata?.firstLineIndent || 0
  
  const handleIndentChange = (type: 'left' | 'right' | 'firstLine', value: number) => {
    // Update metadata with custom indent properties
    const metadata = textObject.metadata || {}
    if (type === 'left') {
      metadata.leftIndent = value
      // Also update padding for visual effect
      onChange('padding', value)
    } else if (type === 'right') {
      metadata.rightIndent = value
    } else if (type === 'firstLine') {
      metadata.firstLineIndent = value
    }
    onChange('metadata', metadata)
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