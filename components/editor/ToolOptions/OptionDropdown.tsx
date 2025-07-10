'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ToolOption } from '@/lib/store/tools/EventToolStore'

interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  options: DropdownOption[]
}

interface OptionDropdownProps {
  option: ToolOption<string>
  onChange: (value: string) => void
}

export function OptionDropdown({ option, onChange }: OptionDropdownProps) {
  const props = option.props as DropdownProps | undefined
  const options = props?.options || []

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-foreground whitespace-nowrap">
        {option.label}:
      </label>
      <Select value={option.value} onValueChange={onChange}>
        <SelectTrigger className="h-8 min-w-[120px] bg-background text-foreground border-foreground/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 