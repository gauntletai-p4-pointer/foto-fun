# OpenShop MVP Specification & Development Roadmap

## Tech Stack
- **Next.js 15** (App Router)
- **React 19** 
- **TypeScript 5.3+**
- **Tailwind CSS v4**
- **shadcn/ui** (latest)
- **Fabric.js 6.0+**
- **GPU.js** (WebGL acceleration)
- **AI SDK v5** (Vercel)
- **Zustand 5.0+**

## MVP Overview

The MVP presents a complete Photoshop-like interface with all tools visible in their expected locations. Unimplemented tools display a "Coming Soon" modal when clicked, setting clear expectations while showcasing the full vision of the product.

## Interface Layout

### Application Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Menu Bar (File, Edit, Image, Layer, Select, Filter, View)   │
├─────────────────┬───────────────────────────┬───────────────┤
│                 │                             │               │
│  Tool Palette   │      Canvas Area           │  Panels       │
│  (2 columns)    │   (with rulers/guides)     │  - Layers     │
│                 │                             │  - Properties │
│  [M] [M]       │                             │  - History    │
│  [V] [V]       │                             │  - AI Chat    │
│  [L] [L]       │                             │               │
│  ...           │                             │               │
│                 │                             │               │
├─────────────────┴───────────────────────────┴───────────────┤
│ Options Bar (context-sensitive tool options)                 │
├─────────────────────────────────────────────────────────────┤
│ Status Bar (zoom %, document info, tips)                    │
└─────────────────────────────────────────────────────────────┘
```

## MVP Implementation Details

### 1. Core Canvas System

#### Canvas Implementation
```typescript
interface CanvasState {
  fabricCanvas: fabric.Canvas | null
  zoom: number // 1-3200%
  rotation: number // 0-360
  rulers: {
    visible: boolean
    units: 'pixels' | 'inches' | 'cm'
  }
  guides: Guide[]
  grid: {
    visible: boolean
    spacing: number
  }
}

interface Guide {
  id: string
  orientation: 'horizontal' | 'vertical'
  position: number
  locked: boolean
}
```

#### Features
- **Zoom Levels**: 1%, 5%, 10%, 25%, 33%, 50%, 66%, 100%, 200%, 300%, 400%, 500%, 1600%, 3200%
- **Navigation**: 
  - Space + drag for pan
  - Ctrl/Cmd + '+'/'-' for zoom
  - Ctrl/Cmd + 0 for fit to screen
  - Ctrl/Cmd + 1 for 100%
- **Rulers & Guides**:
  - Drag from rulers to create guides
  - Snap to guides (5px threshold)
  - Lock/unlock guides
  - Clear all guides

### 2. Tool Palette (MVP Active Tools)

#### Selection Tools Group
- **[M] Rectangular Marquee Tool** ✅ ACTIVE
  - Options: Style (Normal/Fixed Ratio/Fixed Size), Feather, Anti-alias
  - Shift for square, Alt for center origin
  - Add/Subtract/Intersect modes
  
- **[M] Elliptical Marquee Tool** ✅ ACTIVE
  - Same options as rectangular
  - Shift for circle

- **[L] Lasso Tool** ❌ Coming Soon
- **[L] Polygonal Lasso Tool** ❌ Coming Soon
- **[L] Magnetic Lasso Tool** ❌ Coming Soon

#### Move & Transform Tools
- **[V] Move Tool** ✅ ACTIVE
  - Auto-select layer on click
  - Show transform controls
  - Align options in options bar

- **[V] Artboard Tool** ❌ Coming Soon

#### Crop & Slice Tools
- **[C] Crop Tool** ✅ ACTIVE
  - Ratio presets: Free, Original, 1:1, 4:3, 16:9, 2:3, 5:7
  - Straighten tool integrated
  - Delete/Hide cropped pixels option
  - Rule of thirds overlay

- **[C] Perspective Crop Tool** ❌ Coming Soon
- **[C] Slice Tool** ❌ Coming Soon
- **[C] Slice Select Tool** ❌ Coming Soon

#### Drawing Tools
- **[B] Brush Tool** ❌ Coming Soon
- **[B] Pencil Tool** ❌ Coming Soon
- **[B] Color Replacement Tool** ❌ Coming Soon
- **[B] Mixer Brush Tool** ❌ Coming Soon

#### Stamp & Healing Tools
- **[S] Clone Stamp Tool** ❌ Coming Soon
- **[S] Pattern Stamp Tool** ❌ Coming Soon
- **[J] Spot Healing Brush Tool** ❌ Coming Soon
- **[J] Healing Brush Tool** ❌ Coming Soon
- **[J] Patch Tool** ❌ Coming Soon
- **[J] Content-Aware Move Tool** ❌ Coming Soon
- **[J] Red Eye Tool** ❌ Coming Soon

#### Eraser Tools
- **[E] Eraser Tool** ❌ Coming Soon
- **[E] Background Eraser Tool** ❌ Coming Soon
- **[E] Magic Eraser Tool** ❌ Coming Soon

#### Paint Tools
- **[G] Gradient Tool** ❌ Coming Soon
- **[G] Paint Bucket Tool** ❌ Coming Soon
- **[G] 3D Material Drop Tool** ❌ Coming Soon

#### Type Tools
- **[T] Horizontal Type Tool** ❌ Coming Soon
- **[T] Vertical Type Tool** ❌ Coming Soon
- **[T] Horizontal Type Mask Tool** ❌ Coming Soon
- **[T] Vertical Type Mask Tool** ❌ Coming Soon

#### Shape Tools
- **[U] Rectangle Tool** ❌ Coming Soon
- **[U] Rounded Rectangle Tool** ❌ Coming Soon
- **[U] Ellipse Tool** ❌ Coming Soon
- **[U] Triangle Tool** ❌ Coming Soon
- **[U] Polygon Tool** ❌ Coming Soon
- **[U] Line Tool** ❌ Coming Soon
- **[U] Custom Shape Tool** ❌ Coming Soon

#### Navigation Tools
- **[H] Hand Tool** ✅ ACTIVE (Also accessible via Space key)
- **[Z] Zoom Tool** ✅ ACTIVE
  - Click to zoom in
  - Alt+Click to zoom out
  - Drag for zoom rectangle

### 3. Menu System (MVP Implementation)

#### File Menu
```typescript
interface FileMenuActions {
  'New...': () => void          // ✅ Opens new document dialog
  'Open...': () => void         // ✅ File picker for images
  'Open Recent': Submenu        // ✅ Last 10 files
  'Close': () => void           // ✅ Closes current document
  'Save': () => void            // ✅ Download current state
  'Save As...': () => void      // ✅ Format selection dialog
  'Export': {
    'Quick Export as PNG': () => void  // ✅
    'Export As...': () => void         // ✅ Full export dialog
  }
  'Place Embedded...': () => void // ❌ Coming Soon
  'Scripts': Submenu              // ❌ Coming Soon
}
```

**New Document Dialog**:
- Presets: Default, Photo, Print, Art & Illustration, Web, Mobile
- Width/Height inputs with unit selection
- Resolution (72, 150, 300 DPI presets)
- Color Mode: RGB (8 bit only in MVP)
- Background: White, Black, Transparent

**Export Dialog**:
- Formats: PNG, JPEG, WebP
- Quality slider (JPEG/WebP)
- Resize options
- Metadata options

#### Edit Menu
```typescript
interface EditMenuActions {
  'Undo': () => void           // ✅ Ctrl/Cmd+Z
  'Redo': () => void          // ✅ Ctrl/Cmd+Shift+Z
  'Cut': () => void           // ❌ Coming Soon
  'Copy': () => void          // ❌ Coming Soon
  'Paste': () => void         // ❌ Coming Soon
  'Free Transform': () => void // ✅ Ctrl/Cmd+T
  'Transform': {
    'Scale': () => void       // ✅
    'Rotate': () => void      // ✅
    'Skew': () => void        // ❌ Coming Soon
    'Distort': () => void     // ❌ Coming Soon
    'Perspective': () => void // ❌ Coming Soon
    'Rotate 180°': () => void // ✅
    'Rotate 90° CW': () => void  // ✅
    'Rotate 90° CCW': () => void // ✅
    'Flip Horizontal': () => void // ✅
    'Flip Vertical': () => void   // ✅
  }
}
```

#### Image Menu
```typescript
interface ImageMenuActions {
  'Adjustments': {
    'Brightness/Contrast...': () => void  // ✅
    'Levels...': () => void              // ❌ Coming Soon
    'Curves...': () => void              // ❌ Coming Soon
    'Exposure...': () => void            // ✅
    'Vibrance...': () => void            // ❌ Coming Soon
    'Hue/Saturation...': () => void      // ✅
    'Color Balance...': () => void       // ❌ Coming Soon
    'Black & White...': () => void       // ✅ (Grayscale)
    'Photo Filter...': () => void        // ❌ Coming Soon
    'Invert': () => void                 // ✅
  }
  'Image Size...': () => void            // ✅
  'Canvas Size...': () => void           // ✅
  'Image Rotation': {                    // Same as Edit > Transform
    '180°': () => void                   // ✅
    '90° CW': () => void                 // ✅
    '90° CCW': () => void                // ✅
    'Flip Canvas Horizontal': () => void // ✅
    'Flip Canvas Vertical': () => void   // ✅
  }
}
```

#### Filter Menu
```typescript
interface FilterMenuActions {
  'Last Filter': () => void           // ✅ Repeat last
  'Blur': {
    'Gaussian Blur...': () => void    // ✅
    'Motion Blur...': () => void      // ❌ Coming Soon
    'Radial Blur...': () => void      // ❌ Coming Soon
  }
  'Sharpen': {
    'Sharpen': () => void             // ✅
    'Sharpen More': () => void        // ✅
    'Smart Sharpen...': () => void    // ❌ Coming Soon
  }
  'Stylize': {
    'Emboss...': () => void           // ❌ Coming Soon
    'Find Edges': () => void          // ❌ Coming Soon
  }
  'Other': {
    'High Pass...': () => void        // ❌ Coming Soon
  }
}
```

### 4. Panels System

#### Layers Panel
```typescript
interface LayersPanelState {
  layers: Layer[]
  activeLayerId: string
  thumbnailSize: 'small' | 'medium' | 'large'
}

interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number // 0-100
  blendMode: 'normal' // MVP only supports normal
  type: 'image' | 'adjustment' | 'text' | 'shape'
  thumbnail: ImageData
}
```

**MVP Layer Features**:
- Single background layer (locked by default)
- Visibility toggle
- Opacity slider
- Delete layer button
- Layer naming (double-click)

#### Properties Panel
Shows context-sensitive information:
- **No Selection**: Document dimensions, color mode
- **Layer Selected**: Layer type, dimensions, position
- **Tool Active**: Tool-specific quick settings

#### History Panel
```typescript
interface HistoryState {
  entries: HistoryEntry[]
  currentIndex: number
  maxEntries: 50
}

interface HistoryEntry {
  id: string
  action: string // "Brightness/Contrast", "Crop", etc.
  timestamp: number
  thumbnail?: ImageData
}
```

#### AI Assistant Panel
```typescript
interface AIAssistantPanel {
  messages: ChatMessage[]
  suggestions: string[] // Context-aware suggestions
  isProcessing: boolean
  currentOperation?: string
}

// Suggested prompts in MVP:
const mvpSuggestions = [
  "Make the image brighter",
  "Increase the contrast",
  "Convert to black and white",
  "Apply a blur effect",
  "Sharpen the image",
  "Crop to square format",
  "Fix the exposure",
  "Make colors more vibrant"
]
```

### 5. AI Integration (MVP)

#### Available AI Tools
```typescript
const mvpAITools = {
  adjustBrightness: {
    name: 'adjustBrightness',
    description: 'Adjust image brightness by a specified amount',
    parameters: z.object({
      amount: z.number().min(-100).max(100)
        .describe('Brightness adjustment: -100 (darker) to 100 (brighter)')
    }),
    execute: async (canvas, { amount }) => {
      await applyBrightnessFilter(canvas, amount)
      addToHistory(`Brightness ${amount > 0 ? '+' : ''}${amount}`)
    }
  },
  
  adjustContrast: {
    name: 'adjustContrast',
    description: 'Adjust image contrast',
    parameters: z.object({
      amount: z.number().min(-100).max(100)
        .describe('Contrast adjustment: -100 (less) to 100 (more)')
    })
  },
  
  adjustSaturation: {
    name: 'adjustSaturation',
    description: 'Adjust color saturation',
    parameters: z.object({
      amount: z.number().min(-100).max(100)
        .describe('Saturation: -100 (grayscale) to 100 (vibrant)')
    })
  },
  
  adjustHue: {
    name: 'adjustHue',
    description: 'Rotate hue/colors',
    parameters: z.object({
      degrees: z.number().min(-180).max(180)
        .describe('Hue rotation in degrees')
    })
  },
  
  adjustExposure: {
    name: 'adjustExposure',
    description: 'Adjust exposure like a camera',
    parameters: z.object({
      stops: z.number().min(-3).max(3)
        .describe('Exposure in stops: -3 (darker) to 3 (brighter)')
    })
  },
  
  applyBlur: {
    name: 'applyBlur',
    description: 'Apply gaussian blur effect',
    parameters: z.object({
      radius: z.number().min(0).max(20)
        .describe('Blur radius in pixels')
    })
  },
  
  applySharpen: {
    name: 'applySharpen',
    description: 'Sharpen the image',
    parameters: z.object({
      amount: z.number().min(0).max(200)
        .describe('Sharpen strength: 0 (none) to 200 (maximum)')
    })
  },
  
  convertToGrayscale: {
    name: 'convertToGrayscale',
    description: 'Convert image to black and white',
    parameters: z.object({})
  },
  
  invertColors: {
    name: 'invertColors',
    description: 'Invert all colors (negative effect)',
    parameters: z.object({})
  },
  
  applyCrop: {
    name: 'applyCrop',
    description: 'Crop the image',
    parameters: z.object({
      aspectRatio: z.enum(['free', 'square', '16:9', '4:3', '3:2'])
        .optional()
        .describe('Aspect ratio for crop')
    })
  },
  
  rotate: {
    name: 'rotate',
    description: 'Rotate the image',
    parameters: z.object({
      degrees: z.number()
        .describe('Rotation angle (90, 180, 270 for quick rotations)')
    })
  },
  
  flip: {
    name: 'flip',
    description: 'Flip image horizontally or vertically',
    parameters: z.object({
      direction: z.enum(['horizontal', 'vertical'])
    })
  }
}
```

#### AI System Prompt
```typescript
const systemPrompt = `You are an expert photo editor assistant for OpenShop. You help users edit images using the available tools.

Current capabilities:
- Brightness, contrast, saturation, hue, and exposure adjustments
- Blur and sharpen filters
- Black & white conversion and color inversion
- Cropping with preset ratios
- Image rotation and flipping

When users ask for edits:
1. Acknowledge their request clearly
2. Use appropriate tools with sensible values
3. Explain what you're doing in simple terms
4. Suggest related edits if relevant

For features not yet available, kindly explain they're "coming soon" and suggest alternatives using available tools.

Always be helpful, concise, and friendly.`
```

### 6. Adjustment Dialogs (MVP)

#### Brightness/Contrast Dialog
```typescript
interface BrightnessContrastDialog {
  brightness: number    // -100 to +100, default 0
  contrast: number      // -100 to +100, default 0
  preview: boolean      // Live preview toggle
  
  // Buttons
  onOK: () => void
  onCancel: () => void
  onReset: () => void
}
```

#### Hue/Saturation Dialog
```typescript
interface HueSaturationDialog {
  hue: number          // -180 to +180, default 0
  saturation: number   // -100 to +100, default 0
  lightness: number    // -100 to +100, default 0
  colorize: boolean    // Colorize mode
  
  preview: boolean
}
```

#### Image Size Dialog
```typescript
interface ImageSizeDialog {
  width: number
  height: number
  units: 'pixels' | 'inches' | 'cm'
  resolution: number    // DPI
  resampleMethod: 'automatic' | 'bilinear' | 'bicubic'
  constrainProportions: boolean
}
```

### 7. Keyboard Shortcuts (MVP)

```typescript
const mvpKeyboardShortcuts = {
  // File operations
  'Ctrl/Cmd+N': 'New document',
  'Ctrl/Cmd+O': 'Open file',
  'Ctrl/Cmd+S': 'Save',
  'Ctrl/Cmd+Shift+S': 'Save As',
  'Ctrl/Cmd+Shift+E': 'Export As',
  
  // Edit operations
  'Ctrl/Cmd+Z': 'Undo',
  'Ctrl/Cmd+Shift+Z': 'Redo',
  'Ctrl/Cmd+T': 'Free Transform',
  
  // View operations
  'Ctrl/Cmd+0': 'Fit to screen',
  'Ctrl/Cmd+1': '100% zoom',
  'Ctrl/Cmd++': 'Zoom in',
  'Ctrl/Cmd+-': 'Zoom out',
  'Space': 'Hand tool (temporary)',
  
  // Tools
  'V': 'Move tool',
  'M': 'Marquee tools',
  'C': 'Crop tool',
  'Z': 'Zoom tool',
  'H': 'Hand tool',
  
  // Panels
  'F7': 'Toggle Layers panel',
  'F8': 'Toggle Info panel',
}
```

### 8. GPU.js Filter Implementation

```typescript
class GPUFilters {
  private gpu: GPU
  
  constructor() {
    this.gpu = new GPU({ mode: 'gpu' })
  }
  
  createBrightnessContrastKernel(width: number, height: number) {
    return this.gpu.createKernel(function(
      pixels: number[][][],
      brightness: number,
      contrast: number
    ) {
      const pixel = pixels[this.thread.y][this.thread.x]
      
      // Apply contrast
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
      let r = factor * (pixel[0] - 128) + 128
      let g = factor * (pixel[1] - 128) + 128
      let b = factor * (pixel[2] - 128) + 128
      
      // Apply brightness
      r += brightness
      g += brightness
      b += brightness
      
      // Clamp values
      this.color(
        Math.max(0, Math.min(1, r / 255)),
        Math.max(0, Math.min(1, g / 255)),
        Math.max(0, Math.min(1, b / 255)),
        pixel[3] / 255
      )
    })
    .setOutput([width, height])
    .setGraphical(true)
  }
  
  createGaussianBlurKernel(width: number, height: number) {
    // Gaussian blur implementation
    return this.gpu.createKernel(function(
      pixels: number[][][],
      radius: number
    ) {
      // Blur algorithm implementation
    })
    .setOutput([width, height])
    .setGraphical(true)
  }
}
```

### 9. State Management Structure

```typescript
// store/editorStore.ts
interface EditorStore {
  // Canvas state
  canvas: fabric.Canvas | null
  zoom: number
  rotation: number
  
  // Document state
  document: {
    width: number
    height: number
    resolution: number
    colorMode: 'RGB'
    name: string
  }
  
  // Layer state
  layers: Layer[]
  activeLayerId: string | null
  
  // History state
  history: HistoryEntry[]
  historyIndex: number
  
  // Tool state
  activeTool: ToolType
  toolSettings: Record<ToolType, any>
  
  // UI state
  panels: {
    layers: boolean
    properties: boolean
    history: boolean
    aiAssistant: boolean
  }
  
  // AI state
  aiMessages: ChatMessage[]
  aiProcessing: boolean
  
  // Actions
  actions: {
    // Canvas actions
    setCanvas: (canvas: fabric.Canvas) => void
    setZoom: (zoom: number) => void
    
    // Document actions
    createNewDocument: (settings: DocumentSettings) => void
    openImage: (file: File) => void
    saveDocument: (format: ExportFormat) => void
    
    // Layer actions
    addLayer: (layer: Layer) => void
    deleteLayer: (id: string) => void
    setActiveLayer: (id: string) => void
    updateLayerProperty: (id: string, property: string, value: any) => void
    
    // History actions
    addHistoryEntry: (entry: HistoryEntry) => void
    undo: () => void
    redo: () => void
    
    // Tool actions
    setActiveTool: (tool: ToolType) => void
    updateToolSetting: (tool: ToolType, setting: string, value: any) => void
    
    // AI actions
    sendAIMessage: (message: string) => void
    executeAITool: (tool: string, params: any) => void
  }
}
```

### 10. Error Handling & User Feedback

```typescript
interface NotificationSystem {
  showToast: (message: string, type: 'info' | 'success' | 'error') => void
  showModal: (config: ModalConfig) => void
  showProgress: (operation: string, progress: number) => void
}

// "Coming Soon" handler
function handleComingSoonTool(toolName: string) {
  showModal({
    title: `${toolName} - Coming Soon`,
    content: `The ${toolName} tool is not available in this version. 
              It will be added in a future update.`,
    buttons: [
      {
        label: 'OK',
        action: 'close',
        variant: 'primary'
      },
      {
        label: 'Learn More',
        action: () => window.open('/roadmap#' + toolName),
        variant: 'secondary'
      }
    ]
  })
}
```

## Development Phases

### Phase 1: MVP (Current)
**Timeline**: 2-3 months

**Completed Features**:
- ✅ Complete UI shell with all tools visible
- ✅ Canvas system with zoom/pan
- ✅ Basic selection tools (Rectangle, Ellipse)
- ✅ Move and basic transform tools
- ✅ Crop tool with presets
- ✅ Basic adjustments (Brightness/Contrast, Hue/Saturation, Exposure)
- ✅ Basic filters (Blur, Sharpen, Grayscale, Invert)
- ✅ Single layer support
- ✅ History/Undo system
- ✅ File operations (New, Open, Save, Export)
- ✅ AI Assistant with natural language editing

### Phase 2: Enhanced Editing
**Timeline**: 2-3 months

**Planned Features**:
- Drawing tools (Brush, Pencil, Eraser)
- Paint tools (Gradient, Paint Bucket)
- Text tool with font selection
- Shape tools (Rectangle, Ellipse, Line, etc.)
- Advanced adjustments (Curves, Levels, Color Balance)
- Advanced filters (Lens Correction, Smart Blur)
- Multiple layer support
- Basic blend modes
- Clone/Healing tools

### Phase 3: Professional Features
**Timeline**: 3-4 months

**Planned Features**:
- Advanced selection tools (Magic Wand, Quick Selection, Color Range)
- Layer effects (Drop Shadow, Stroke, etc.)
- Adjustment layers
- Layer masks and clipping masks
- Smart objects
- Advanced blend modes
- Content-aware fill
- Advanced AI features (Background removal, Face enhancement)
- Pen tool and paths

### Phase 4: Advanced Features & Polish
**Timeline**: 3-4 months

**Planned Features**:
- Actions and automation
- Plugin system
- Batch processing
- Advanced export options
- Version history
- Collaboration features
- Performance optimizations
- Mobile/tablet support
- Custom workspaces
- JavaScript API for extensions

## MVP Success Metrics

### Technical Metrics
- Page load time < 3 seconds
- Canvas operation latency < 100ms
- Memory usage < 500MB for typical sessions
- Support for images up to 4K resolution

### User Metrics
- 5,000 users in first month
- Average session time > 10 minutes
- 50% of users try AI assistant
- < 5% crash rate

### Community Metrics
- 100+ GitHub stars in first month
- 10+ contributors
- Active Discord community
- Weekly blog posts about development

## Security & Privacy

### MVP Security Features
- All processing happens client-side
- No image data sent to servers (except AI operations)
- AI requests use secure HTTPS
- No user tracking or analytics in MVP
- Open source codebase for transparency

### AI Privacy
- Images sent to AI are processed and immediately discarded
- No training on user images
- Clear privacy policy and terms of service
- Option to disable AI features entirely

## Browser Requirements

### Minimum Requirements
- Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- 4GB RAM
- GPU with WebGL 2.0 support
- 1920x1080 or higher resolution recommended

### Optimal Experience
- 8GB+ RAM
- Dedicated GPU
- Latest browser versions
- Hardware acceleration enabled