import { create } from 'zustand'
import { TOOL_IDS } from '@/constants'

export type OptionType = 'slider' | 'checkbox' | 'dropdown' | 'number' | 'button-group' | 'color'

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
        id: 'selectionMode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        props: {
          options: [
            { value: 'new', label: 'New Selection', icon: 'Square' },
            { value: 'add', label: 'Add to Selection', icon: 'Plus' },
            { value: 'subtract', label: 'Subtract from Selection', icon: 'Minus' },
            { value: 'intersect', label: 'Intersect Selection', icon: 'X' }
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
  },
  
  [TOOL_IDS.MARQUEE_ELLIPSE]: {
    toolId: TOOL_IDS.MARQUEE_ELLIPSE,
    options: [
      {
        id: 'selectionMode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        props: {
          options: [
            { value: 'new', label: 'New Selection', icon: 'Circle' },
            { value: 'add', label: 'Add to Selection', icon: 'Plus' },
            { value: 'subtract', label: 'Subtract from Selection', icon: 'Minus' },
            { value: 'intersect', label: 'Intersect Selection', icon: 'X' }
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
  },
  
  [TOOL_IDS.LASSO]: {
    toolId: TOOL_IDS.LASSO,
    options: [
      {
        id: 'selectionMode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        props: {
          options: [
            { value: 'new', label: 'New Selection', icon: 'Lasso' },
            { value: 'add', label: 'Add to Selection', icon: 'Plus' },
            { value: 'subtract', label: 'Subtract from Selection', icon: 'Minus' },
            { value: 'intersect', label: 'Intersect Selection', icon: 'X' }
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
  },
  
  [TOOL_IDS.MAGIC_WAND]: {
    toolId: TOOL_IDS.MAGIC_WAND,
    options: [
      {
        id: 'tolerance',
        type: 'slider',
        label: 'Tolerance',
        value: 32,
        props: {
          min: 0,
          max: 255,
          step: 1
        }
      },
      {
        id: 'contiguous',
        type: 'checkbox',
        label: 'Contiguous',
        value: true
      },
      {
        id: 'selectionMode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        props: {
          options: [
            { value: 'new', label: 'New Selection', icon: 'Wand2' },
            { value: 'add', label: 'Add to Selection', icon: 'Plus' },
            { value: 'subtract', label: 'Subtract from Selection', icon: 'Minus' },
            { value: 'intersect', label: 'Intersect Selection', icon: 'X' }
          ]
        }
      }
    ]
  },
  
  [TOOL_IDS.CROP]: {
    toolId: TOOL_IDS.CROP,
    options: [
      {
        id: 'aspectRatio',
        type: 'dropdown',
        label: 'Aspect Ratio',
        value: 'free',
        props: {
          options: [
            { value: 'free', label: 'Free' },
            { value: 'square', label: 'Square (1:1)' },
            { value: '16:9', label: '16:9' },
            { value: '4:3', label: '4:3' },
            { value: '3:2', label: '3:2' },
            { value: '5:7', label: '5:7' }
          ]
        }
      },
      {
        id: 'showGuides',
        type: 'checkbox',
        label: 'Show Guides',
        value: true
      }
    ]
  },
  
  [TOOL_IDS.ZOOM]: {
    toolId: TOOL_IDS.ZOOM,
    options: [
      {
        id: 'zoomStep',
        type: 'number',
        label: 'Zoom Step',
        value: 25,
        props: {
          min: 10,
          max: 100,
          step: 5,
          unit: '%'
        }
      },
      {
        id: 'animateZoom',
        type: 'checkbox',
        label: 'Animate Zoom',
        value: false
      }
    ]
  },
  
  [TOOL_IDS.BRUSH]: {
    toolId: TOOL_IDS.BRUSH,
    options: [
      {
        id: 'color',
        type: 'color',
        label: 'Color',
        value: '#000000'
      },
      {
        id: 'size',
        type: 'slider',
        label: 'Size',
        value: 10,
        props: {
          min: 1,
          max: 100,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'opacity',
        type: 'slider',
        label: 'Opacity',
        value: 100,
        props: {
          min: 0,
          max: 100,
          step: 1,
          unit: '%'
        }
      },
      {
        id: 'hardness',
        type: 'slider',
        label: 'Hardness',
        value: 100,
        props: {
          min: 0,
          max: 100,
          step: 1,
          unit: '%'
        }
      },
      {
        id: 'smoothing',
        type: 'checkbox',
        label: 'Smoothing',
        value: true
      }
    ]
  },
  
  [TOOL_IDS.ERASER]: {
    toolId: TOOL_IDS.ERASER,
    options: [
      {
        id: 'size',
        type: 'slider',
        label: 'Size',
        value: 20,
        props: {
          min: 1,
          max: 200,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'hardness',
        type: 'slider',
        label: 'Hardness',
        value: 100,
        props: {
          min: 0,
          max: 100,
          step: 1,
          unit: '%'
        }
      }
    ]
  }
} 