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
        defaultValue: true,
        props: {
          tooltip: 'Automatically select layers when clicking'
        }
      },
      {
        id: 'autoSelectType',
        type: 'dropdown',
        label: 'Auto-Select Type',
        value: 'layer',
        defaultValue: 'layer',
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
        defaultValue: true,
        props: {
          tooltip: 'Display bounding box with transform handles'
        }
      },
      {
        id: 'showSmartGuides',
        type: 'checkbox',
        label: 'Show Smart Guides',
        value: true,
        defaultValue: true,
        props: {
          tooltip: 'Show alignment guides when moving objects'
        }
      },
      {
        id: 'alignmentGuides',
        type: 'checkbox',
        label: 'Show Alignment Guides',
        value: false,
        defaultValue: false,
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
        defaultValue: 'new',
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
        defaultValue: 0,
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
        value: true,
        defaultValue: true
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
        defaultValue: 'free',
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
        defaultValue: 'thirds',
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
        defaultValue: false,
        props: {
          tooltip: 'Make crop destructive (cannot be undone)'
        }
      },
      {
        id: 'shieldOpacity',
        type: 'slider',
        label: 'Shield Opacity',
        value: 50,
        defaultValue: 50,
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
        value: '#000000',
        defaultValue: '#000000'
      },
      {
        id: 'size',
        type: 'slider',
        label: 'Size',
        value: 10,
        defaultValue: 10,
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
        defaultValue: 100,
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
        defaultValue: 100,
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
        value: true,
        defaultValue: true
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
        defaultValue: 0,
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
        defaultValue: 0,
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
        defaultValue: 0,
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
        defaultValue: 0,
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
        defaultValue: 0,
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
        defaultValue: 0,
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
        defaultValue: '',
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
        defaultValue: 'horizontal',
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
        defaultValue: 100,
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
        defaultValue: 100,
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
        value: true,
        defaultValue: true
      },
      {
        id: 'unit',
        type: 'dropdown',
        label: 'Unit',
        value: 'pixels',
        defaultValue: 'pixels',
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
        defaultValue: 0,
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
        defaultValue: 0,
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
        defaultValue: 'toggle',
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
        defaultValue: 'toggle',
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
        defaultValue: 'brownie',
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
  
  // Paint tools
  [TOOL_IDS.ERASER]: {
    toolId: TOOL_IDS.ERASER,
    options: [
      {
        id: 'mode',
        type: 'dropdown',
        label: 'Mode',
        value: 'brush',
        defaultValue: 'brush',
        props: {
          options: [
            { value: 'brush', label: 'Brush' },
            { value: 'pencil', label: 'Pencil' },
            { value: 'block', label: 'Block' },
            { value: 'background', label: 'Background Eraser' }
          ]
        }
      },
      {
        id: 'size',
        type: 'slider',
        label: 'Size',
        value: 20,
        defaultValue: 20,
        props: {
          min: 1,
          max: 200,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'tolerance',
        type: 'slider',
        label: 'Tolerance',
        value: 32,
        defaultValue: 32,
        props: {
          min: 0,
          max: 255,
          step: 1,
          tooltip: 'For Background Eraser mode'
        }
      }
    ]
  },
  
  [TOOL_IDS.CLONE_STAMP]: {
    toolId: TOOL_IDS.CLONE_STAMP,
    options: [
      {
        id: 'size',
        type: 'slider',
        label: 'Size',
        value: 50,
        defaultValue: 50,
        props: {
          min: 10,
          max: 300,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'opacity',
        type: 'slider',
        label: 'Opacity',
        value: 100,
        defaultValue: 100,
        props: {
          min: 0,
          max: 100,
          step: 1,
          unit: '%'
        }
      },
      {
        id: 'aligned',
        type: 'checkbox',
        label: 'Aligned',
        value: true,
        defaultValue: true,
        props: {
          tooltip: 'Keep source point aligned with cursor'
        }
      },
      {
        id: 'sampleAllLayers',
        type: 'checkbox',
        label: 'Sample All Layers',
        value: false,
        defaultValue: false
      }
    ]
  },
  
  [TOOL_IDS.HEALING_BRUSH]: {
    toolId: TOOL_IDS.HEALING_BRUSH,
    options: [
      {
        id: 'mode',
        type: 'dropdown',
        label: 'Mode',
        value: 'normal',
        defaultValue: 'normal',
        props: {
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'spot', label: 'Spot Healing' }
          ]
        }
      },
      {
        id: 'size',
        type: 'slider',
        label: 'Size',
        value: 30,
        defaultValue: 30,
        props: {
          min: 5,
          max: 200,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'hardness',
        type: 'slider',
        label: 'Hardness',
        value: 50,
        defaultValue: 50,
        props: {
          min: 0,
          max: 100,
          step: 1,
          unit: '%'
        }
      }
    ]
  },
  
  [TOOL_IDS.GRADIENT]: {
    toolId: TOOL_IDS.GRADIENT,
    options: [
      {
        id: 'type',
        type: 'dropdown',
        label: 'Type',
        value: 'linear',
        defaultValue: 'linear',
        props: {
          options: [
            { value: 'linear', label: 'Linear' },
            { value: 'radial', label: 'Radial' },
            { value: 'angle', label: 'Angle' },
            { value: 'reflected', label: 'Reflected' },
            { value: 'diamond', label: 'Diamond' }
          ]
        }
      },
      {
        id: 'opacity',
        type: 'slider',
        label: 'Opacity',
        value: 100,
        defaultValue: 100,
        props: {
          min: 0,
          max: 100,
          step: 1,
          unit: '%'
        }
      },
      {
        id: 'reverse',
        type: 'checkbox',
        label: 'Reverse',
        value: false,
        defaultValue: false
      },
      {
        id: 'dither',
        type: 'checkbox',
        label: 'Dither',
        value: false,
        defaultValue: false,
        props: {
          tooltip: 'Reduce banding in gradients'
        }
      }
    ]
  },
  
  // AI-Native tools
  [TOOL_IDS.AI_IMAGE_GENERATION]: {
    toolId: TOOL_IDS.AI_IMAGE_GENERATION,
    options: [
      {
        id: 'model',
        type: 'dropdown',
        label: 'Model',
        value: 'stable-diffusion',
        defaultValue: 'stable-diffusion',
        props: {
          options: [
            { value: 'stable-diffusion', label: 'Stable Diffusion' },
            { value: 'dall-e', label: 'DALL-E' },
            { value: 'midjourney', label: 'Midjourney' }
          ]
        }
      },
      {
        id: 'width',
        type: 'number',
        label: 'Width',
        value: 512,
        defaultValue: 512,
        props: {
          min: 256,
          max: 1024,
          step: 64,
          unit: 'px'
        }
      },
      {
        id: 'height',
        type: 'number',
        label: 'Height',
        value: 512,
        defaultValue: 512,
        props: {
          min: 256,
          max: 1024,
          step: 64,
          unit: 'px'
        }
      },
      {
        id: 'steps',
        type: 'slider',
        label: 'Steps',
        value: 50,
        defaultValue: 50,
        props: {
          min: 10,
          max: 150,
          step: 10
        }
      },
      {
        id: 'guidance',
        type: 'slider',
        label: 'Guidance Scale',
        value: 7.5,
        defaultValue: 7.5,
        props: {
          min: 1,
          max: 20,
          step: 0.5
        }
      }
    ]
  },
  
  // Selection tools
  [TOOL_IDS.MARQUEE_ELLIPSE]: {
    toolId: TOOL_IDS.MARQUEE_ELLIPSE,
    options: [
      {
        id: 'selectionMode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        defaultValue: 'new',
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
        defaultValue: 0,
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
        value: true,
        defaultValue: true
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
        defaultValue: 'new',
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
        defaultValue: 0,
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
        value: true,
        defaultValue: true
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
        defaultValue: 32,
        props: {
          min: 0,
          max: 255,
          step: 1
        }
      },
      {
        id: 'selectionMode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        defaultValue: 'new',
        props: {
          options: [
            { value: 'new', label: 'New Selection', icon: 'Wand2' },
            { value: 'add', label: 'Add to Selection', icon: 'Plus' },
            { value: 'subtract', label: 'Subtract from Selection', icon: 'Minus' },
            { value: 'intersect', label: 'Intersect Selection', icon: 'X' }
          ]
        }
      },
      {
        id: 'sampleAllLayers',
        type: 'checkbox',
        label: 'Sample All Layers',
        value: false,
        defaultValue: false
      },
      {
        id: 'contiguous',
        type: 'checkbox',
        label: 'Contiguous',
        value: true,
        defaultValue: true
      }
    ]
  },
  
  [TOOL_IDS.QUICK_SELECTION]: {
    toolId: TOOL_IDS.QUICK_SELECTION,
    options: [
      {
        id: 'size',
        type: 'slider',
        label: 'Size',
        value: 30,
        defaultValue: 30,
        props: {
          min: 1,
          max: 200,
          step: 1,
          unit: 'px'
        }
      },
      {
        id: 'selectionMode',
        type: 'button-group',
        label: 'Selection Mode',
        value: 'new',
        defaultValue: 'new',
        props: {
          options: [
            { value: 'new', label: 'New Selection', icon: 'Wand2' },
            { value: 'add', label: 'Add to Selection', icon: 'Plus' },
            { value: 'subtract', label: 'Subtract from Selection', icon: 'Minus' }
          ]
        }
      },
      {
        id: 'sampleAllLayers',
        type: 'checkbox',
        label: 'Sample All Layers',
        value: false,
        defaultValue: false
      }
    ]
  },
  
  // Navigation tools
  [TOOL_IDS.HAND]: {
    toolId: TOOL_IDS.HAND,
    options: [
      {
        id: 'scrollAllWindows',
        type: 'checkbox',
        label: 'Scroll All Windows',
        value: false,
        defaultValue: false
      }
    ]
  },
  
  [TOOL_IDS.ZOOM]: {
    toolId: TOOL_IDS.ZOOM,
    options: [
      {
        id: 'zoomMode',
        type: 'button-group',
        label: 'Zoom Mode',
        value: 'in',
        defaultValue: 'in',
        props: {
          options: [
            { value: 'in', label: 'Zoom In', icon: 'Plus' },
            { value: 'out', label: 'Zoom Out', icon: 'Minus' }
          ]
        }
      },
      {
        id: 'resizeWindowToFit',
        type: 'checkbox',
        label: 'Resize Window To Fit',
        value: false,
        defaultValue: false
      },
      {
        id: 'zoomAllWindows',
        type: 'checkbox',
        label: 'Zoom All Windows',
        value: false,
        defaultValue: false
      }
    ]
  },
  
  // Sampling tools
  [TOOL_IDS.EYEDROPPER]: {
    toolId: TOOL_IDS.EYEDROPPER,
    options: [
      {
        id: 'sampleSize',
        type: 'dropdown',
        label: 'Sample Size',
        value: 'point',
        defaultValue: 'point',
        props: {
          options: [
            { value: 'point', label: 'Point Sample' },
            { value: '3x3', label: '3x3 Average' },
            { value: '5x5', label: '5x5 Average' },
            { value: '11x11', label: '11x11 Average' },
            { value: '31x31', label: '31x31 Average' }
          ]
        }
      },
      {
        id: 'sampleAllLayers',
        type: 'checkbox',
        label: 'Sample All Layers',
        value: true,
        defaultValue: true
      },
      {
        id: 'showSamplingRing',
        type: 'checkbox',
        label: 'Show Sampling Ring',
        value: true,
        defaultValue: true
      }
    ]
  },
  
  // Type tools
  [TOOL_IDS.TYPE_HORIZONTAL]: {
    toolId: TOOL_IDS.TYPE_HORIZONTAL,
    options: [
      {
        id: 'fontFamily',
        type: 'dropdown',
        label: 'Font',
        value: 'Arial',
        defaultValue: 'Arial',
        props: {
          options: [
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Verdana', label: 'Verdana' },
            { value: 'Courier New', label: 'Courier New' }
          ]
        }
      },
      {
        id: 'fontSize',
        type: 'number',
        label: 'Size',
        value: 60,
        defaultValue: 60,
        props: {
          min: 6,
          max: 1296,
          step: 1,
          unit: 'pt'
        }
      },
      {
        id: 'color',
        type: 'color',
        label: 'Color',
        value: '#000000',
        defaultValue: '#000000'
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
        defaultValue: 'Arial',
        props: {
          options: [
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Verdana', label: 'Verdana' },
            { value: 'Courier New', label: 'Courier New' }
          ]
        }
      },
      {
        id: 'fontSize',
        type: 'number',
        label: 'Size',
        value: 60,
        defaultValue: 60,
        props: {
          min: 6,
          max: 1296,
          step: 1,
          unit: 'pt'
        }
      },
      {
        id: 'color',
        type: 'color',
        label: 'Color',
        value: '#000000',
        defaultValue: '#000000'
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
        defaultValue: 'Arial',
        props: {
          options: [
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Verdana', label: 'Verdana' },
            { value: 'Courier New', label: 'Courier New' }
          ]
        }
      },
      {
        id: 'fontSize',
        type: 'number',
        label: 'Size',
        value: 60,
        defaultValue: 60,
        props: {
          min: 6,
          max: 1296,
          step: 1,
          unit: 'pt'
        }
      }
    ]
  },
  
  [TOOL_IDS.TYPE_ON_PATH]: {
    toolId: TOOL_IDS.TYPE_ON_PATH,
    options: [
      {
        id: 'fontFamily',
        type: 'dropdown',
        label: 'Font',
        value: 'Arial',
        defaultValue: 'Arial',
        props: {
          options: [
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Times New Roman', label: 'Times New Roman' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Verdana', label: 'Verdana' },
            { value: 'Courier New', label: 'Courier New' }
          ]
        }
      },
      {
        id: 'fontSize',
        type: 'number',
        label: 'Size',
        value: 60,
        defaultValue: 60,
        props: {
          min: 6,
          max: 1296,
          step: 1,
          unit: 'pt'
        }
      },
      {
        id: 'color',
        type: 'color',
        label: 'Color',
        value: '#000000',
        defaultValue: '#000000'
      },
      {
        id: 'pathOffset',
        type: 'slider',
        label: 'Path Offset',
        value: 0,
        defaultValue: 0,
        props: {
          min: -100,
          max: 100,
          step: 1,
          unit: '%'
        }
      }
    ]
  },

  // AI Tool Options
  [TOOL_IDS.AI_BACKGROUND_REMOVAL]: {
    toolId: TOOL_IDS.AI_BACKGROUND_REMOVAL,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'SAM 2 Large',
              description: 'Exceptional quality - handles hair and complex edges',
              cost: 0.003,
              quality: 'exceptional'
            },
            fast: {
              name: 'RemBG',
              description: 'Good quality - fast for clean backgrounds',
              cost: 0.0005,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'createNewObject',
        type: 'checkbox',
        label: 'Create New Object',
        value: false,
        defaultValue: false,
        props: {
          tooltip: 'Create a new object instead of modifying the original'
        }
      }
    ]
  },

  [TOOL_IDS.AI_OBJECT_REMOVAL]: {
    toolId: TOOL_IDS.AI_OBJECT_REMOVAL,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'LaMa',
              description: 'Best quality object removal',
              cost: 0.002,
              quality: 'exceptional'
            },
            alternative: {
              name: 'SD Inpainting',
              description: 'Alternative removal method',
              cost: 0.001,
              quality: 'very-good'
            }
          }
        }
      }
    ]
  },

  [TOOL_IDS.AI_STYLE_TRANSFER]: {
    toolId: TOOL_IDS.AI_STYLE_TRANSFER,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'High Quality',
              description: 'Best style transfer quality',
              cost: 0.003,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast',
              description: 'Quick style transfer',
              cost: 0.001,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'strength',
        type: 'slider',
        label: 'Style Strength',
        value: 0.8,
        defaultValue: 0.8,
        props: {
          min: 0.1,
          max: 1.0,
          step: 0.1
        }
      },
      {
        id: 'preserveColors',
        type: 'checkbox',
        label: 'Preserve Colors',
        value: false,
        defaultValue: false
      }
    ]
  },

  [TOOL_IDS.AI_VARIATION]: {
    toolId: TOOL_IDS.AI_VARIATION,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'High Quality',
              description: 'Best variation quality',
              cost: 0.003,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast',
              description: 'Quick variations',
              cost: 0.001,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'variationStrength',
        type: 'slider',
        label: 'Variation Strength',
        value: 0.7,
        defaultValue: 0.7,
        props: {
          min: 0.1,
          max: 1.0,
          step: 0.1
        }
      },
      {
        id: 'count',
        type: 'number',
        label: 'Count',
        value: 2,
        defaultValue: 2,
        props: {
          min: 1,
          max: 4,
          step: 1
        }
      }
    ]
  },

  [TOOL_IDS.AI_RELIGHTING]: {
    toolId: TOOL_IDS.AI_RELIGHTING,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'High Quality',
              description: 'Best relighting quality',
              cost: 0.004,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast',
              description: 'Quick relighting',
              cost: 0.002,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'intensity',
        type: 'slider',
        label: 'Light Intensity',
        value: 1.0,
        defaultValue: 1.0,
        props: {
          min: 0.1,
          max: 2.0,
          step: 0.1
        }
      },
      {
        id: 'softness',
        type: 'slider',
        label: 'Light Softness',
        value: 0.5,
        defaultValue: 0.5,
        props: {
          min: 0.0,
          max: 1.0,
          step: 0.1
        }
      },
      {
        id: 'colorTemperature',
        type: 'dropdown',
        label: 'Color Temperature',
        value: 'neutral',
        defaultValue: 'neutral',
        props: {
          options: [
            { value: 'warm', label: 'Warm' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'cool', label: 'Cool' }
          ]
        }
      }
    ]
  },

  [TOOL_IDS.AI_UPSCALING]: {
    toolId: TOOL_IDS.AI_UPSCALING,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'Real-ESRGAN',
              description: 'Best upscaling quality',
              cost: 0.005,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast Upscaler',
              description: 'Quick upscaling',
              cost: 0.002,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'scaleFactor',
        type: 'dropdown',
        label: 'Scale Factor',
        value: 4,
        defaultValue: 4,
        props: {
          options: [
            { value: 2, label: '2x' },
            { value: 4, label: '4x' },
            { value: 8, label: '8x' }
          ]
        }
      },
      {
        id: 'enhanceDetails',
        type: 'checkbox',
        label: 'Enhance Details',
        value: true,
        defaultValue: true
      },
      {
        id: 'preserveSharpness',
        type: 'checkbox',
        label: 'Preserve Sharpness',
        value: true,
        defaultValue: true
      }
    ]
  },

  [TOOL_IDS.AI_FACE_ENHANCEMENT]: {
    toolId: TOOL_IDS.AI_FACE_ENHANCEMENT,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'GFPGAN',
              description: 'Best face enhancement quality',
              cost: 0.003,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast Enhancement',
              description: 'Quick face enhancement',
              cost: 0.001,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'enhancementScale',
        type: 'slider',
        label: 'Enhancement Scale',
        value: 2,
        defaultValue: 2,
        props: {
          min: 1,
          max: 4,
          step: 1
        }
      },
      {
        id: 'autoDetect',
        type: 'checkbox',
        label: 'Auto Detect Faces',
        value: true,
        defaultValue: true
      }
    ]
  },

  [TOOL_IDS.AI_INPAINTING]: {
    toolId: TOOL_IDS.AI_INPAINTING,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'SD Inpainting',
              description: 'Best inpainting quality',
              cost: 0.003,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast Inpaint',
              description: 'Quick inpainting',
              cost: 0.001,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'brushSize',
        type: 'slider',
        label: 'Brush Size',
        value: 20,
        defaultValue: 20,
        props: {
          min: 5,
          max: 100,
          step: 1,
          unit: 'px'
        }
      }
    ]
  },

  [TOOL_IDS.AI_OUTPAINTING]: {
    toolId: TOOL_IDS.AI_OUTPAINTING,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'SD Outpainting',
              description: 'Best outpainting quality',
              cost: 0.004,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast Outpaint',
              description: 'Quick outpainting',
              cost: 0.002,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'expandSize',
        type: 'number',
        label: 'Expand Size',
        value: 256,
        defaultValue: 256,
        props: {
          min: 32,
          max: 512,
          step: 32,
          unit: 'px'
        }
      },
      {
        id: 'direction',
        type: 'dropdown',
        label: 'Direction',
        value: 'all',
        defaultValue: 'all',
        props: {
          options: [
            { value: 'all', label: 'All Directions' },
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' }
          ]
        }
      },
      {
        id: 'seamlessBlend',
        type: 'checkbox',
        label: 'Seamless Blend',
        value: true,
        defaultValue: true
      }
    ]
  },

  [TOOL_IDS.AI_SEMANTIC_SELECTION]: {
    toolId: TOOL_IDS.AI_SEMANTIC_SELECTION,
    options: [
      {
        id: 'modelTier',
        type: 'model-quality',
        label: 'Quality',
        value: 'best',
        defaultValue: 'best',
        props: {
          tiers: {
            best: {
              name: 'GroundingDINO',
              description: 'Best semantic understanding',
              cost: 0.002,
              quality: 'exceptional'
            },
            fast: {
              name: 'Fast Detection',
              description: 'Quick semantic detection',
              cost: 0.001,
              quality: 'good'
            }
          }
        }
      },
      {
        id: 'threshold',
        type: 'slider',
        label: 'Confidence Threshold',
        value: 0.3,
        defaultValue: 0.3,
        props: {
          min: 0.1,
          max: 1.0,
          step: 0.1
        }
      },
      {
        id: 'mode',
        type: 'dropdown',
        label: 'Selection Mode',
        value: 'new',
        defaultValue: 'new',
        props: {
          options: [
            { value: 'new', label: 'New Selection' },
            { value: 'add', label: 'Add to Selection' },
            { value: 'subtract', label: 'Subtract from Selection' },
            { value: 'intersect', label: 'Intersect Selection' }
          ]
        }
      }
    ]
  }
} 