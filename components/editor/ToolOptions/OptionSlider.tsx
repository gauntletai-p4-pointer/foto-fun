'use client'

import { Slider } from '@/components/ui/slider'
import { RotateCcw } from 'lucide-react'
import type { ToolOption } from '@/store/toolOptionsStore'

interface OptionSliderProps {
  option: ToolOption<number>
  onChange: (value: number) => void
  defaultValue?: number
}

export function OptionSlider({ option, onChange, defaultValue = 0 }: OptionSliderProps) {
  const { min = 0, max = 100, step = 1, unit = '' } = option.props || {}
  const showReset = option.value !== defaultValue
  
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
      {showReset && (
        <button
          onClick={() => onChange(defaultValue)}
          className="p-1 hover:bg-accent rounded-md transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  )
} 