'use client'

import { Slider } from '@/components/ui/slider'
import type { ToolOption } from '@/store/toolOptionsStore'

interface OptionSliderProps {
  option: ToolOption<number>
  onChange: (value: number) => void
}

export function OptionSlider({ option, onChange }: OptionSliderProps) {
  const { min = 0, max = 100, step = 1, unit = '' } = option.props || {}
  
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        {option.label}:
      </label>
      <Slider
        value={[option.value]}
        onValueChange={([value]) => onChange(value)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <span className="text-sm text-foreground min-w-[3ch] text-right">
        {option.value}{unit}
      </span>
    </div>
  )
} 