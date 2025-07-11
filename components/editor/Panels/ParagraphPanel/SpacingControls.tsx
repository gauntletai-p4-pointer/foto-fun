'use client'

import type { CanvasObject } from '@/lib/editor/objects/types'
import { getMetadataValue } from '@/lib/editor/canvas/types'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import Konva from 'konva'

interface SpacingControlsProps {
  textObject: CanvasObject | null
  textStyle: {
    lineHeight: number
  }
  onChange: (property: string, value: unknown) => void
}

export function SpacingControls({ textObject, textStyle, onChange }: SpacingControlsProps) {
  if (!textObject || (textObject.type !== 'text' && textObject.type !== 'verticalText')) {
    return null
  }
  
  // Line height (leading)
  const lineHeight = textStyle.lineHeight || 1.16
  
  // Paragraph spacing (custom properties from metadata)
  const spaceBefore = getMetadataValue(textObject, 'spaceBefore', 0) as number
  const spaceAfter = getMetadataValue(textObject, 'spaceAfter', 0) as number
  
  const handleLineHeightChange = (value: number) => {
    onChange('lineHeight', value)
  }
  
  const handleSpacingChange = (type: 'before' | 'after', value: number) => {
    // Update metadata with custom spacing properties
    const metadata = textObject.metadata || {}
    if (type === 'before') {
      metadata.spaceBefore = value
    } else {
      metadata.spaceAfter = value
    }
    onChange('metadata', metadata)
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