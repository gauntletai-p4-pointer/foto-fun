'use client'

import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'

interface LetterSpacingControlProps {
  value: number
  onChange: (spacing: number) => void
}

export function LetterSpacingControl({ value, onChange }: LetterSpacingControlProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0])
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue)) {
      onChange(newValue)
    }
  }
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">Letter Spacing</label>
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="h-6 w-16 text-xs text-center"
          step={10}
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={handleSliderChange}
        min={-200}
        max={1000}
        step={10}
        className="w-full"
      />
    </div>
  )
} 