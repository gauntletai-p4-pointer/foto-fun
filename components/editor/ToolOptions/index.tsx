'use client'

import { useEffect, useState } from 'react'
import { useToolStore } from '@/store/toolStore'
import { useToolOptionsStore, defaultToolOptions } from '@/store/toolOptionsStore'
import { OptionCheckbox } from './OptionCheckbox'
import { OptionNumber } from './OptionNumber'
import { OptionButtonGroup } from './OptionButtonGroup'
import { OptionSlider } from './OptionSlider'
import { OptionColor } from './OptionColor'
import { OptionDropdown } from './OptionDropdown'
import type { ToolOption } from '@/store/toolOptionsStore'
import { TOOL_IDS } from '@/constants'

export function ToolOptions() {
  const activeTool = useToolStore((state) => state.activeTool)
  const { getToolOptions, updateOption, registerToolOptions } = useToolOptionsStore()
  const [modifiers, setModifiers] = useState({ shift: false, alt: false })
  
  // Register default options on mount
  useEffect(() => {
    Object.values(defaultToolOptions).forEach(config => {
      registerToolOptions(config)
    })
  }, [registerToolOptions])
  
  // Track modifier keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setModifiers({
        shift: e.shiftKey,
        alt: e.altKey
      })
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      setModifiers({
        shift: e.shiftKey,
        alt: e.altKey
      })
    }
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  if (!activeTool) return null
  
  const options = getToolOptions(activeTool)
  if (!options || options.length === 0) return null
  
  const handleOptionChange = (optionId: string, value: unknown) => {
    updateOption(activeTool, optionId, value)
  }
  
  const renderOption = (option: ToolOption) => {
    const key = `${activeTool}-${option.id}`
    
    switch (option.type) {
      case 'checkbox':
        return (
          <OptionCheckbox
            key={key}
            option={option}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'number':
        return (
          <OptionNumber
            key={key}
            option={option}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'button-group':
        return (
          <OptionButtonGroup
            key={key}
            option={option}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'slider':
        return (
          <OptionSlider
            key={key}
            option={option}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'color':
        return (
          <OptionColor
            key={key}
            option={option}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'dropdown':
        return (
          <OptionDropdown
            key={key}
            option={option}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      default:
        return null
    }
  }
  
  // Show modifier hints for marquee tool
  const showModifierHints = activeTool === TOOL_IDS.MARQUEE_RECT
  
  return (
    <div className="flex items-center gap-6 px-4">
      {options.map(renderOption)}
      
      {showModifierHints && (
        <div className="flex items-center gap-4 ml-auto mr-4 text-xs text-muted-foreground">
          <span className={modifiers.shift ? 'text-foreground font-medium' : ''}>
            Shift: Square
          </span>
          <span className={modifiers.alt ? 'text-foreground font-medium' : ''}>
            Alt: Center
          </span>
        </div>
      )}
    </div>
  )
} 