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
  
  [TOOL_IDS.EYEDROPPER]: {
    toolId: TOOL_IDS.EYEDROPPER,
    options: [
      {
        id: 'sampleAllLayers',
        type: 'checkbox',
        label: 'Sample All Layers',
        value: true
      }
    ]
  },
  
  [TOOL_IDS.QUICK_SELECTION]: {
    toolId: TOOL_IDS.QUICK_SELECTION,
    options: [
      {
        id: 'brushSize',
        type: 'slider',
        label: 'Brush Size',
        value: 20,
        props: {
          min: 5,
          max: 100,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'tolerance',
        type: 'slider',
        label: 'Tolerance',
        value: 25,
        props: {
          min: 0,
          max: 100,
          step: 1
        }
      },
      {
        id: 'autoExpand',
        type: 'checkbox',
        label: 'Auto-Expand',
        value: true
      },
      {
        id: 'edgeDetection',
        type: 'checkbox',
        label: 'Edge Detection',
        value: true
      }
    ]
  },
  
  // Adjustment tools
  [TOOL_IDS.BRIGHTNESS]: {
    toolId: TOOL_IDS.BRIGHTNESS,
    options: [
      {
        id: 'adjustment',
        type: 'slider',
        label: 'Brightness',
        value: 0,
        props: {
          min: -100,
          max: 100,
          step: 1,
          unit: '%'
        }
      }
    ]
  },
  
  [TOOL_IDS.CONTRAST]: {
    toolId: TOOL_IDS.CONTRAST,
    options: [
      {
        id: 'adjustment',
        type: 'slider',
        label: 'Contrast',
        value: 0,
        props: {
          min: -100,
          max: 100,
          step: 1,
          unit: '%'
        }
      }
    ]
  },
  
  [TOOL_IDS.SATURATION]: {
    toolId: TOOL_IDS.SATURATION,
    options: [
      {
        id: 'adjustment',
        type: 'slider',
        label: 'Saturation',
        value: 0,
        props: {
          min: -100,
          max: 100,
          step: 1,
          unit: '%'
        }
      }
    ]
  },
  
  [TOOL_IDS.HUE]: {
    toolId: TOOL_IDS.HUE,
    options: [
      {
        id: 'hue',
        type: 'slider',
        label: 'Hue Rotation',
        value: 0,
        props: { min: -180, max: 180, step: 1, unit: '°' }
      }
    ]
  },
  
  [TOOL_IDS.EXPOSURE]: {
    toolId: TOOL_IDS.EXPOSURE,
    options: [
      {
        id: 'exposure',
        type: 'slider',
        label: 'Exposure',
        value: 0,
        props: { min: -100, max: 100, step: 1, unit: '%' }
      }
    ]
  },
  
  [TOOL_IDS.COLOR_TEMPERATURE]: {
    toolId: TOOL_IDS.COLOR_TEMPERATURE,
    options: [
      {
        id: 'temperature',
        type: 'slider',
        label: 'Temperature',
        value: 0,
        props: { min: -100, max: 100, step: 1, unit: '%' }
      }
    ]
  },
  
  // Transform tools
  [TOOL_IDS.ROTATE]: {
    toolId: TOOL_IDS.ROTATE,
    options: [
      {
        id: 'angle',
        type: 'slider',
        label: 'Angle',
        value: 0,
        props: { min: -180, max: 180, step: 1, unit: '°' }
      },
      {
        id: 'quickRotate',
        type: 'button-group',
        label: 'Quick Rotate',
        value: null,
        props: {
          options: [
            { value: -90, label: '⟲ 90°' },
            { value: 90, label: '⟳ 90°' },
            { value: 180, label: '↻ 180°' }
          ]
        }
      }
    ]
  },
  
  [TOOL_IDS.FLIP]: {
    toolId: TOOL_IDS.FLIP,
    options: [
      {
        id: 'flipAction',
        type: 'button-group',
        label: 'Flip',
        value: null,
        props: {
          options: [
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' }
          ]
        }
      }
    ]
  },
  
  [TOOL_IDS.RESIZE]: {
    toolId: TOOL_IDS.RESIZE,
    options: [
      {
        id: 'mode',
        type: 'dropdown',
        label: 'Mode',
        value: 'percentage',
        props: {
          options: [
            { value: 'percentage', label: 'Percentage' },
            { value: 'absolute', label: 'Absolute Size' }
          ]
        }
      },
      {
        id: 'percentage',
        type: 'slider',
        label: 'Size',
        value: 100,
        props: { min: 10, max: 200, step: 5, unit: '%' }
      },
      {
        id: 'width',
        type: 'number',
        label: 'Width',
        value: 800,
        props: { min: 1, max: 4096, step: 1, unit: 'px' }
      },
      {
        id: 'height',
        type: 'number',
        label: 'Height',
        value: 600,
        props: { min: 1, max: 4096, step: 1, unit: 'px' }
      },
      {
        id: 'maintainAspectRatio',
        type: 'checkbox',
        label: 'Maintain Aspect Ratio',
        value: true
      }
    ]
  },
  
  // Filter tools
  [TOOL_IDS.BLUR]: {
    toolId: TOOL_IDS.BLUR,
    options: [
      {
        id: 'blur',
        type: 'slider',
        label: 'Blur Amount',
        value: 0,
        props: { min: 0, max: 100, step: 1, unit: '%' }
      }
    ]
  },
  
  [TOOL_IDS.SHARPEN]: {
    toolId: TOOL_IDS.SHARPEN,
    options: [
      {
        id: 'sharpen',
        type: 'slider',
        label: 'Sharpen Amount',
        value: 0,
        props: { min: 0, max: 100, step: 1, unit: '%' }
      }
    ]
  },
  
  [TOOL_IDS.GRAYSCALE]: {
    toolId: TOOL_IDS.GRAYSCALE,
    options: [
      {
        id: 'action',
        type: 'button-group',
        label: 'Grayscale',
        value: null,
        props: {
          options: [
            { value: 'toggle', label: 'Toggle Grayscale' }
          ]
        }
      }
    ]
  },
  
  [TOOL_IDS.SEPIA]: {
    toolId: TOOL_IDS.SEPIA,
    options: [
      {
        id: 'intensity',
        type: 'slider',
        label: 'Sepia Intensity',
        value: 0,
        props: { min: 0, max: 100, step: 1, unit: '%' }
      }
    ]
  },
  
  [TOOL_IDS.INVERT]: {
    toolId: TOOL_IDS.INVERT,
    options: [
      {
        id: 'action',
        type: 'button-group',
        label: 'Invert',
        value: null,
        props: {
          options: [
            { value: 'toggle', label: 'Toggle Invert' }
          ]
        }
      }
    ]
  },

  // Text tools
  [TOOL_IDS.TYPE_HORIZONTAL]: {
    toolId: TOOL_IDS.TYPE_HORIZONTAL,
    options: [
      {
        id: 'fontFamily',
        type: 'dropdown',
        label: 'Font',
        value: 'Arial',
        props: {
          options: [
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Courier New', label: 'Courier New' },
            { value: 'Verdana', label: 'Verdana' },
            { value: 'Trebuchet MS', label: 'Trebuchet MS' },
            { value: 'Comic Sans MS', label: 'Comic Sans MS' },
            { value: 'Impact', label: 'Impact' },
            { value: 'Palatino', label: 'Palatino' },
          ],
          searchable: true,
          showPreview: true
        }
      },
      {
        id: 'fontSize',
        type: 'number',
        label: 'Size',
        value: 24,
        props: {
          min: 8,
          max: 144,
          step: 1,
          unit: 'pt'
        }
      },
      {
        id: 'color',
        type: 'color',
        label: 'Color',
        value: '#000000'
      },
      {
        id: 'alignment',
        type: 'button-group',
        label: 'Alignment',
        value: 'left',
        props: {
          options: [
            { value: 'left', icon: 'AlignLeft' },
            { value: 'center', icon: 'AlignCenter' },
            { value: 'right', icon: 'AlignRight' },
            { value: 'justify', icon: 'AlignJustify' }
          ]
        }
      },
      {
        id: 'bold',
        type: 'checkbox',
        label: 'Bold',
        value: false,
        props: {
          icon: 'Bold'
        }
      },
      {
        id: 'italic',
        type: 'checkbox',
        label: 'Italic',
        value: false,
        props: {
          icon: 'Italic'
        }
      },
      {
        id: 'underline',
        type: 'checkbox',
        label: 'Underline',
        value: false,
        props: {
          icon: 'Underline'
        }
      }
    ]
  },
  
  [TOOL_IDS.TYPE_VERTICAL]: {
    toolId: TOOL_IDS.TYPE_VERTICAL,
    options: [
      {
        id: 'fontFamily',
        type: 'dropdown',
        label: 'Font',
        value: 'Arial',
        props: {
          options: [
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Courier New', label: 'Courier New' },
            { value: 'Verdana', label: 'Verdana' },
            { value: 'Trebuchet MS', label: 'Trebuchet MS' },
            { value: 'Comic Sans MS', label: 'Comic Sans MS' },
            { value: 'Impact', label: 'Impact' },
            { value: 'Palatino', label: 'Palatino' },
          ],
          searchable: true,
          showPreview: true
        }
      },
      {
        id: 'fontSize',
        type: 'number',
        label: 'Size',
        value: 24,
        props: {
          min: 8,
          max: 144,
          step: 1,
          unit: 'pt'
        }
      },
      {
        id: 'color',
        type: 'color',
        label: 'Color',
        value: '#000000'
      },
      {
        id: 'alignment',
        type: 'button-group',
        label: 'Alignment',
        value: 'left',
        props: {
          options: [
            { value: 'left', icon: 'AlignLeft' },
            { value: 'center', icon: 'AlignCenter' },
            { value: 'right', icon: 'AlignRight' },
            { value: 'justify', icon: 'AlignJustify' }
          ]
        }
      },
      {
        id: 'bold',
        type: 'checkbox',
        label: 'Bold',
        value: false,
        props: {
          icon: 'Bold'
        }
      },
      {
        id: 'italic',
        type: 'checkbox',
        label: 'Italic',
        value: false,
        props: {
          icon: 'Italic'
        }
      },
      {
        id: 'underline',
        type: 'checkbox',
        label: 'Underline',
        value: false,
        props: {
          icon: 'Underline'
        }
      }
    ]
  },
  
  [TOOL_IDS.TYPE_MASK]: {
    toolId: TOOL_IDS.TYPE_MASK,
    options: [
      {
        id: 'fontFamily',
        type: 'dropdown',
        label: 'Font',
        value: 'Arial',
        props: {
          options: [
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Courier New', label: 'Courier New' },
            { value: 'Verdana', label: 'Verdana' },
            { value: 'Trebuchet MS', label: 'Trebuchet MS' },
            { value: 'Comic Sans MS', label: 'Comic Sans MS' },
            { value: 'Impact', label: 'Impact' },
            { value: 'Palatino', label: 'Palatino' },
          ],
          searchable: true,
          showPreview: true
        }
      },
      {
        id: 'fontSize',
        type: 'number',
        label: 'Size',
        value: 24,
        props: {
          min: 8,
          max: 144,
          step: 1,
          unit: 'pt'
        }
      },
      {
        id: 'alignment',
        type: 'button-group',
        label: 'Alignment',
        value: 'left',
        props: {
          options: [
            { value: 'left', icon: 'AlignLeft' },
            { value: 'center', icon: 'AlignCenter' },
            { value: 'right', icon: 'AlignRight' },
            { value: 'justify', icon: 'AlignJustify' }
          ]
        }
      },
      {
        id: 'bold',
        type: 'checkbox',
        label: 'Bold',
        value: false,
        props: {
          icon: 'Bold'
        }
      },
      {
        id: 'italic',
        type: 'checkbox',
        label: 'Italic',
        value: false,
        props: {
          icon: 'Italic'
        }
      },
      {
        id: 'underline',
        type: 'checkbox',
        label: 'Underline',
        value: false,
        props: {
          icon: 'Underline'
        }
      }
    ]
  },
} 