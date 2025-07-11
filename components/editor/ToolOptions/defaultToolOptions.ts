import { ToolOptionsConfig } from '@/lib/store/tools/EventToolStore'
import { TOOL_IDS } from '@/constants'

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
        id: 'autoSelectType',
        type: 'dropdown',
        label: 'Auto-Select Type',
        value: 'layer',
        props: {
          options: [
            { value: 'layer', label: 'Layer' },
            { value: 'group', label: 'Group' }
          ],
          tooltip: 'Choose whether to select individual layers or entire groups'
        }
      },
      {
        id: 'showTransform',
        type: 'checkbox',
        label: 'Show Transform Controls',
        value: true,
        props: {
          tooltip: 'Display bounding box with transform handles'
        }
      },
      {
        id: 'showSmartGuides',
        type: 'checkbox',
        label: 'Show Smart Guides',
        value: true,
        props: {
          tooltip: 'Show alignment guides when moving objects'
        }
      },
      {
        id: 'alignmentGuides',
        type: 'checkbox',
        label: 'Show Alignment Guides',
        value: false,
        props: {
          tooltip: 'Show persistent alignment guides'
        }
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
            { value: '5:7', label: '5:7' },
            { value: '2:3', label: '2:3' },
            { value: '9:16', label: '9:16' }
          ]
        }
      },
      {
        id: 'overlayType',
        type: 'dropdown',
        label: 'Overlay',
        value: 'thirds',
        props: {
          options: [
            { value: 'none', label: 'None' },
            { value: 'thirds', label: 'Rule of Thirds' },
            { value: 'grid', label: 'Grid' },
            { value: 'golden', label: 'Golden Ratio' }
          ]
        }
      },
      {
        id: 'deletePixels',
        type: 'checkbox',
        label: 'Delete Cropped Pixels',
        value: false,
        props: {
          tooltip: 'Make crop destructive (cannot be undone)'
        }
      },
      {
        id: 'shieldOpacity',
        type: 'slider',
        label: 'Shield Opacity',
        value: 50,
        props: {
          min: 0,
          max: 100,
          step: 10,
          unit: '%'
        }
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
          unit: '%',
          showValue: true
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
          unit: '%',
          showValue: true
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
          unit: '%',
          showValue: true
        }
      }
    ]
  },
  
  [TOOL_IDS.HUE]: {
    toolId: TOOL_IDS.HUE,
    options: [
      {
        id: 'rotation',
        type: 'slider',
        label: 'Hue',
        value: 0,
        props: {
          min: -180,
          max: 180,
          step: 1,
          unit: '°',
          showValue: true
        }
      }
    ]
  },
  
  [TOOL_IDS.EXPOSURE]: {
    toolId: TOOL_IDS.EXPOSURE,
    options: [
      {
        id: 'adjustment',
        type: 'slider',
        label: 'Exposure',
        value: 0,
        props: {
          min: -3,
          max: 3,
          step: 0.1,
          unit: 'EV',
          showValue: true
        }
      }
    ]
  },
  
  // Transform tools
  [TOOL_IDS.ROTATE]: {
    toolId: TOOL_IDS.ROTATE,
    options: [
      {
        id: 'angle',
        type: 'number',
        label: 'Angle',
        value: 0,
        props: {
          min: -360,
          max: 360,
          step: 1,
          unit: '°'
        }
      },
      {
        id: 'preset',
        type: 'button-group',
        label: 'Rotate',
        value: '',
        props: {
          options: [
            { value: '90', label: '90° CW', icon: 'RotateCw' },
            { value: '-90', label: '90° CCW', icon: 'RotateCcw' },
            { value: '180', label: '180°', icon: 'RefreshCw' }
          ]
        }
      }
    ]
  },
  [TOOL_IDS.FLIP]: {
    toolId: TOOL_IDS.FLIP,
    options: [
      {
        id: 'direction',
        type: 'button-group',
        label: 'Flip',
        value: 'horizontal',
        props: {
          options: [
            { value: 'horizontal', label: 'Horizontal', icon: 'FlipHorizontal' },
            { value: 'vertical', label: 'Vertical', icon: 'FlipVertical' }
          ]
        }
      }
    ]
  },
  [TOOL_IDS.RESIZE]: {
    toolId: TOOL_IDS.RESIZE,
    options: [
      {
        id: 'width',
        type: 'number',
        label: 'Width',
        value: 100,
        props: {
          min: 1,
          max: 10000,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'height',
        type: 'number',
        label: 'Height',
        value: 100,
        props: {
          min: 1,
          max: 10000,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'maintainAspectRatio',
        type: 'checkbox',
        label: 'Maintain Aspect Ratio',
        value: true
      },
      {
        id: 'unit',
        type: 'dropdown',
        label: 'Unit',
        value: 'pixels',
        props: {
          options: [
            { value: 'pixels', label: 'Pixels' },
            { value: 'percent', label: 'Percent' }
          ]
        }
      }
    ]
  },
  
  // Filter tools
  [TOOL_IDS.BLUR]: {
    toolId: TOOL_IDS.BLUR,
    options: [
      {
        id: 'radius',
        type: 'slider',
        label: 'Blur Radius',
        value: 0,
        props: {
          min: 0,
          max: 50,
          step: 1,
          unit: 'px',
          showValue: true
        }
      }
    ]
  },
  
  [TOOL_IDS.SHARPEN]: {
    toolId: TOOL_IDS.SHARPEN,
    options: [
      {
        id: 'amount',
        type: 'slider',
        label: 'Sharpen Amount',
        value: 0,
        props: {
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
          showValue: true
        }
      }
    ]
  },
  
  [TOOL_IDS.GRAYSCALE]: {
    toolId: TOOL_IDS.GRAYSCALE,
    options: [
      {
        id: 'apply',
        type: 'button-group',
        label: 'Grayscale',
        value: 'toggle',
        props: {
          options: [
            { value: 'toggle', label: 'Toggle On/Off' }
          ]
        }
      }
    ]
  },
  
  [TOOL_IDS.INVERT]: {
    toolId: TOOL_IDS.INVERT,
    options: [
      {
        id: 'apply',
        type: 'button-group',
        label: 'Invert',
        value: 'toggle',
        props: {
          options: [
            { value: 'toggle', label: 'Toggle On/Off' }
          ]
        }
      }
    ]
  },
  
  'vintage-effects': {
    toolId: 'vintage-effects',
    options: [
      {
        id: 'effect',
        type: 'dropdown',
        label: 'Effect',
        value: 'brownie',
        props: {
          options: [
            { value: 'brownie', label: 'Brownie' },
            { value: 'vintage-pinhole', label: 'Vintage Pinhole' },
            { value: 'kodachrome', label: 'Kodachrome' },
            { value: 'technicolor', label: 'Technicolor' },
            { value: 'polaroid', label: 'Polaroid' }
          ]
        }
      }
    ]
  },
  
  // AI-Native tools
  // Add more tool options as needed
} 