'use client'

import { Slider } from '@/components/ui/slider'
import { RotateCcw } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { ToolOption } from '@/store/toolOptionsStore'

// Simple throttle implementation
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: any[] | null = null
  let lastCallTime = 0

  const throttled = (...args: any[]) => {
    const now = Date.now()
    lastArgs = args

    if (now - lastCallTime >= delay) {
      lastCallTime = now
      func(...args)
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        if (lastArgs) {
          lastCallTime = Date.now()
          func(...lastArgs)
          lastArgs = null
        }
        timeoutId = null
      }, delay - (now - lastCallTime))
    }
  }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
  }

  return throttled as T & { cancel: () => void }
}

interface OptionSliderProps {
  option: ToolOption<number>
  onChange: (value: number) => void
  defaultValue?: number
}

export function OptionSlider({ option, onChange, defaultValue = 0 }: OptionSliderProps) {
  const { min = 0, max = 100, step = 1, unit = '' } = option.props || {}
  const showReset = option.value !== defaultValue
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Throttle onChange to improve performance during dragging
  const throttledOnChange = useCallback(
    throttle((value: number) => {
      onChange(value)
    }, 16), // ~60fps
    [onChange]
  )
  
  // Track shift key for fine control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false)
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const increment = e.shiftKey ? step * 10 : step
          const delta = e.key === 'ArrowUp' ? increment : -increment
          const newValue = Math.max(min, Math.min(max, option.value + delta))
          onChange(newValue)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [option.value, step, min, max, onChange])
  
  // Calculate step based on shift key (fine control)
  const currentStep = isShiftPressed && isDragging ? step * 0.1 : step
  
  // Handle double-click to reset
  const handleDoubleClick = () => {
    onChange(defaultValue)
  }
  
  // Handle slider changes
  const handleSliderChange = ([value]: number[]) => {
    if (isDragging) {
      throttledOnChange(value)
    } else {
      onChange(value)
    }
  }
  
  // Handle input field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value >= min && value <= max) {
      onChange(value)
    }
  }
  
  // Handle input blur to ensure valid value
  const handleInputBlur = () => {
    const value = Math.max(min, Math.min(max, option.value))
    if (value !== option.value) {
      onChange(value)
    }
  }
  
  return (
    <div className="flex items-center gap-3">
      <label 
        className="text-sm font-medium text-foreground whitespace-nowrap min-w-[80px] cursor-pointer"
        onClick={() => inputRef.current?.focus()}
      >
        {option.label}:
      </label>
      <div 
        ref={sliderRef}
        className="w-[180px]"
        onDoubleClick={handleDoubleClick}
      >
        <Slider
          value={[option.value]}
          onValueChange={handleSliderChange}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => {
            setIsDragging(false)
            throttledOnChange.cancel()
            onChange(option.value) // Ensure final value is set
          }}
          min={min}
          max={max}
          step={currentStep}
          className="w-full cursor-pointer"
        />
      </div>
      <input
        ref={inputRef}
        type="number"
        value={option.value}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        className="w-[60px] text-sm text-foreground text-right tabular-nums bg-transparent border border-input rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring hover:border-input/80 transition-colors"
        min={min}
        max={max}
        step={step}
        title="Use arrow keys to adjust. Hold Shift for larger increments."
      />
      <span className="text-sm text-foreground/60 min-w-[20px]">
        {unit}
      </span>
      <div className="w-6 flex items-center justify-center">
        {showReset && (
          <button
            onClick={() => onChange(defaultValue)}
            className="p-1 hover:bg-primary/10 rounded-md transition-all opacity-60 hover:opacity-100"
            title="Reset to default"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
} 