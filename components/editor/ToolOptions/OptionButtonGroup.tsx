'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Square, SquarePlus, SquareMinus, Circle, Plus, Minus, X, Wand2, Lasso } from 'lucide-react'
import type { ToolOption } from '@/store/toolOptionsStore'

// Map icon names to components
const iconMap = {
  Square,
  SquarePlus,
  SquareMinus,
  SquareDot: Circle, // Using Circle as a substitute for SquareDot
  Circle,
  Plus,
  Minus,
  X,
  Wand2,
  Lasso,
} as const

interface ButtonOption {
  value: string
  label: string
  icon?: keyof typeof iconMap
}

interface OptionButtonGroupProps {
  option: ToolOption<string>
  onChange: (value: string) => void
}

export function OptionButtonGroup({ option, onChange }: OptionButtonGroupProps) {
  const options = (option.props?.options || []) as ButtonOption[]
  
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        {option.label}:
      </label>
      <ToggleGroup
        type="single"
        value={option.value}
        onValueChange={onChange}
        className="justify-start"
      >
        {options.map((opt) => {
          const Icon = opt.icon ? iconMap[opt.icon] : null
          return (
            <ToggleGroupItem
              key={opt.value}
              value={opt.value}
              aria-label={opt.label}
              className="h-8 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted hover:text-foreground"
            >
              {Icon ? <Icon className="h-4 w-4" /> : opt.label}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
} 