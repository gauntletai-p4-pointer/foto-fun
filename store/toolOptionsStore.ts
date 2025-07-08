import { create } from 'zustand'
import { TOOL_IDS } from '@/constants'

export type OptionType = 'slider' | 'checkbox' | 'dropdown' | 'number' | 'button-group'

export interface ToolOption<T = any> {
  id: string
  type: OptionType
  label: string
  value: T
  props?: Record<string, any> // Type-specific props (min, max, options, etc.)
}

export interface ToolOptionsConfig {
  toolId: string
  options: ToolOption[]
}

interface ToolOptionsStore {
  options: Map<string, ToolOptionsConfig>
  
  registerToolOptions: (config: ToolOptionsConfig) => void
  updateOption: (toolId: string, optionId: string, value: any) => void
  getToolOptions: (toolId: string) => ToolOption[] | undefined
  getOptionValue: <T = any>(toolId: string, optionId: string) => T | undefined
}

export const useToolOptionsStore = create<ToolOptionsStore>((set, get) => ({
  options: new Map(),
  
  registerToolOptions: (config) => {
    set((state) => {
      const newOptions = new Map(state.options)
      newOptions.set(config.toolId, config)
      return { options: newOptions }
    })
  },
  
  updateOption: (toolId, optionId, value) => {
    set((state) => {
      const toolConfig = state.options.get(toolId)
      if (!toolConfig) return state
      
      const updatedOptions = toolConfig.options.map(opt => 
        opt.id === optionId ? { ...opt, value } : opt
      )
      
      const newOptions = new Map(state.options)
      newOptions.set(toolId, { ...toolConfig, options: updatedOptions })
      
      return { options: newOptions }
    })
  },
  
  getToolOptions: (toolId) => {
    return get().options.get(toolId)?.options
  },
  
  getOptionValue: <T = any>(toolId: string, optionId: string): T | undefined => {
    const options = get().options.get(toolId)?.options
    return options?.find(opt => opt.id === optionId)?.value as T
  }
}))

// Default tool options
export const defaultToolOptions: Record<string, ToolOptionsConfig> = {
  [TOOL_IDS.MOVE]: {
    toolId: TOOL_IDS.MOVE,
    options: [
      {
        id: 'autoSelect',
        type: 'checkbox',
        label: 'Auto-Select',
        value: true,
        props: {
          tooltip: 'Automatically select layers when clicking'
        }
      },
      {
        id: 'showTransform',
        type: 'checkbox',
        label: 'Show Transform Controls',
        value: true
      },
      {
        id: 'alignmentGuides',
        type: 'checkbox',
        label: 'Show Alignment Guides',
        value: false
      }
    ]
  },
  
  [TOOL_IDS.MARQUEE_RECT]: {
    toolId: TOOL_IDS.MARQUEE_RECT,
    options: [
      {
        id: 'mode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        props: {
          options: [
            { value: 'new', label: 'New', icon: 'Square' },
            { value: 'add', label: 'Add', icon: 'SquarePlus' },
            { value: 'subtract', label: 'Subtract', icon: 'SquareMinus' },
            { value: 'intersect', label: 'Intersect', icon: 'SquareDot' }
          ]
        }
      },
      {
        id: 'feather',
        type: 'number',
        label: 'Feather',
        value: 0,
        props: {
          min: 0,
          max: 250,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'antiAlias',
        type: 'checkbox',
        label: 'Anti-alias',
        value: true
      }
    ]
  }
} 