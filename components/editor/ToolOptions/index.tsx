'use client'

import { useEffect, useState } from 'react'
import { useService } from '@/lib/core/AppInitializer'
import { EventToolStore, ToolOption } from '@/lib/store/tools/EventToolStore'
import { OptionCheckbox } from './OptionCheckbox'
import { OptionNumber } from './OptionNumber'
import { OptionButtonGroup } from './OptionButtonGroup'
import { OptionSlider } from './OptionSlider'
import { OptionColor } from './OptionColor'
import { OptionDropdown } from './OptionDropdown'
import { VintageEffectsOptions } from './VintageEffectsOptions'
import { TOOL_IDS } from '@/constants'
import { defaultToolOptions } from './defaultToolOptions'
import { vintageEffectsTool } from '@/lib/editor/tools/filters/vintageEffectsTool'

export function ToolOptions() {
  const toolStore = useService<EventToolStore>('ToolStore')
  const activeTool = toolStore.getActiveTool()
  const [modifiers, setModifiers] = useState({ shift: false, alt: false })
  
  // Register default options on mount
  useEffect(() => {
    Object.values(defaultToolOptions).forEach(config => {
      toolStore.registerToolOptions(config)
    })
  }, [toolStore])
  
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
  
  const handleOptionChange = (optionId: string, value: unknown) => {
    if (activeTool) {
      toolStore.updateOption(activeTool.id, optionId, value)
    }
  }
  
  if (!activeTool) return null
  
  // Special handling for vintage effects tool
  if (activeTool.id === 'vintage-effects') {
    return (
      <div className="flex items-center gap-6 px-4">
        <VintageEffectsOptions
          tool={vintageEffectsTool}
          onChange={handleOptionChange}
        />
      </div>
    )
  }
  
  const options = toolStore.getToolOptions(activeTool.id)
  if (!options || options.length === 0) return null
  
  const renderOption = (option: ToolOption) => {
    const key = `${activeTool.id}-${option.id}`
    
    switch (option.type) {
      case 'checkbox':
        return (
          <OptionCheckbox
            key={key}
            option={option as ToolOption<boolean>}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'number':
        return (
          <OptionNumber
            key={key}
            option={option as ToolOption<number>}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'button-group':
        return (
          <OptionButtonGroup
            key={key}
            option={option as ToolOption<string>}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'slider':
        return (
          <OptionSlider
            key={key}
            option={option as ToolOption<number>}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'color':
        return (
          <OptionColor
            key={key}
            option={option as ToolOption<string>}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      case 'dropdown':
        return (
          <OptionDropdown
            key={key}
            option={option as ToolOption<string>}
            onChange={(value) => handleOptionChange(option.id, value)}
          />
        )
      
      default:
        return null
    }
  }
  
  // Show modifier hints for marquee tool
  const showModifierHints = activeTool.id === TOOL_IDS.MARQUEE_RECT
  
  return (
    <div className="flex items-center gap-6 px-4">
      {options.map(renderOption)}
      
      {showModifierHints && (
        <div className="flex items-center gap-4 ml-auto mr-4 text-xs text-foreground/60">
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