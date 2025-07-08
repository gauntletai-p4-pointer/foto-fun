'use client'

import { IText, Textbox } from 'fabric'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface JustificationOptionsProps {
  object: IText | Textbox
  onChange: <K extends keyof IText>(property: K, value: IText[K]) => void
}

// Extend IText with custom justification properties
interface ExtendedTextObject extends IText {
  justifyLastLine?: boolean
  wordSpacing?: string
  hyphenation?: boolean
}

export function JustificationOptions({ object, onChange }: JustificationOptionsProps) {
  // Cast to extended type
  const extendedObject = object as ExtendedTextObject
  
  // Custom justification properties
  const justifyLastLine = extendedObject.justifyLastLine || false
  const wordSpacing = extendedObject.wordSpacing || 'normal'
  const hyphenation = extendedObject.hyphenation || false
  
  const handleJustifyLastLineChange = (checked: boolean) => {
    extendedObject.justifyLastLine = checked
    onChange('dirty' as keyof IText, true as IText['dirty'])
  }
  
  const handleWordSpacingChange = (value: string) => {
    extendedObject.wordSpacing = value
    onChange('dirty' as keyof IText, true as IText['dirty'])
  }
  
  const handleHyphenationChange = (checked: boolean) => {
    extendedObject.hyphenation = checked
    onChange('dirty' as keyof IText, true as IText['dirty'])
  }
  
  // Only show these options when text is justified
  const isJustified = object.textAlign === 'justify'
  
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