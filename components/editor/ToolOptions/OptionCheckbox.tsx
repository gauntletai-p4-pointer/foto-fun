'use client'

import { Checkbox } from '@/components/ui/checkbox'
import type { ToolOption } from '@/store/toolOptionsStore'

interface OptionCheckboxProps {
  option: ToolOption<boolean>
  onChange: (value: boolean) => void
}

export function OptionCheckbox({ option, onChange }: OptionCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={option.id}
        checked={option.value}
        onCheckedChange={onChange}
      />
      <label
        htmlFor={option.id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {option.label}
      </label>
    </div>
  )
} 