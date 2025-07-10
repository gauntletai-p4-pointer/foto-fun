'use client'

import { CanvasObject } from '@/lib/editor/canvas/types'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import Konva from 'konva'

interface JustificationOptionsProps {
  textObject: CanvasObject | null
  onChange: (property: string, value: unknown) => void
}

export function JustificationOptions({ textObject, onChange }: JustificationOptionsProps) {
  if (!textObject || (textObject.type !== 'text' && textObject.type !== 'verticalText')) {
    return null
  }
  
  const textNode = textObject.node as Konva.Text
  if (!textNode) return null
  
  // Custom justification properties from metadata
  const justifyLastLine = textObject.metadata?.justifyLastLine || false
  const wordSpacing = textObject.metadata?.wordSpacing || 'normal'
  const hyphenation = textObject.metadata?.hyphenation || false
  
  const handleJustifyLastLineChange = (checked: boolean) => {
    const metadata = textObject.metadata || {}
    metadata.justifyLastLine = checked
    onChange('metadata', metadata)
  }
  
  const handleWordSpacingChange = (value: string) => {
    const metadata = textObject.metadata || {}
    metadata.wordSpacing = value
    onChange('metadata', metadata)
  }
  
  const handleHyphenationChange = (checked: boolean) => {
    const metadata = textObject.metadata || {}
    metadata.hyphenation = checked
    onChange('metadata', metadata)
  }
  
  // Only show these options when text is justified
  const isJustified = textNode.align() === 'justify'
  
  if (!isJustified) {
    return null
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Justification</Label>
      </div>
      
      {/* Justify Last Line */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="justify-last-line"
          checked={justifyLastLine}
          onCheckedChange={handleJustifyLastLineChange}
        />
        <Label
          htmlFor="justify-last-line"
          className="text-xs font-normal cursor-pointer"
        >
          Justify last line
        </Label>
      </div>
      
      {/* Word Spacing */}
      <div className="space-y-2">
        <Label className="text-xs">Word Spacing</Label>
        <Select value={wordSpacing} onValueChange={handleWordSpacingChange}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tight">Tight</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="loose">Loose</SelectItem>
            <SelectItem value="very-loose">Very Loose</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Hyphenation */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hyphenation"
          checked={hyphenation}
          onCheckedChange={handleHyphenationChange}
        />
        <Label
          htmlFor="hyphenation"
          className="text-xs font-normal cursor-pointer"
        >
          Enable hyphenation
        </Label>
      </div>
    </div>
  )
} 