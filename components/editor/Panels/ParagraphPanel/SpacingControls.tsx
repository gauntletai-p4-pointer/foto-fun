'use client'

import { IText, Textbox } from 'fabric'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface SpacingControlsProps {
  object: IText | Textbox
  onChange: <K extends keyof IText>(property: K, value: IText[K]) => void
}

// Extend IText with custom spacing properties
interface ExtendedTextObject extends IText {
  spaceBefore?: number
  spaceAfter?: number
}

export function SpacingControls({ object, onChange }: SpacingControlsProps) {
  // Cast to extended type
  const extendedObject = object as ExtendedTextObject
  
  // Line height (leading)
  const lineHeight = object.lineHeight || 1.16
  
  // Paragraph spacing (custom properties)
  const spaceBefore = extendedObject.spaceBefore || 0
  const spaceAfter = extendedObject.spaceAfter || 0
  
  const handleLineHeightChange = (value: number) => {
    onChange('lineHeight', value as IText['lineHeight'])
  }
  
  const handleSpacingChange = (type: 'before' | 'after', value: number) => {
    // Update the custom property
    if (type === 'before') {
      extendedObject.spaceBefore = value
    } else {
      extendedObject.spaceAfter = value
    }
    
    // Trigger re-render
    onChange('dirty' as keyof IText, true as IText['dirty'])
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Spacing</Label>
      </div>
      
      {/* Line Height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Line Height</Label>
          <span className="text-xs text-foreground/60">
            {(lineHeight * 100).toFixed(0)}%
          </span>
        </div>
        <Slider
          value={[lineHeight]}
          onValueChange={([value]) => handleLineHeightChange(value)}
          min={0.5}
          max={3}
          step={0.05}
          className="w-full"
        />
      </div>
      
      {/* Space Before */}
      <div className="flex items-center gap-2">
        <Label className="text-xs w-24">Before:</Label>
        <Input
          type="number"
          value={spaceBefore}
          onChange={(e) => handleSpacingChange('before', Number(e.target.value))}
          className="h-6 text-xs"
          min={0}
          max={100}
          step={1}
        />
        <span className="text-xs text-foreground/60">pt</span>
      </div>
      
      {/* Space After */}
      <div className="flex items-center gap-2">
        <Label className="text-xs w-24">After:</Label>
        <Input
          type="number"
          value={spaceAfter}
          onChange={(e) => handleSpacingChange('after', Number(e.target.value))}
          className="h-6 text-xs"
          min={0}
          max={100}
          step={1}
        />
        <span className="text-xs text-foreground/60">pt</span>
      </div>
    </div>
  )
} 