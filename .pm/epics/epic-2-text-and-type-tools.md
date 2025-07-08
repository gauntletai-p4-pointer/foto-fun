# Epic 2: Text & Type Tools

## Developer Workflow Instructions

### GitHub Branch Strategy
1. **Branch Naming**: Create a feature branch named `epic-2-text-type-tools`
2. **Base Branch**: Branch off from `main`
3. **Commits**: Use conventional commits (e.g., `feat: add horizontal type tool`, `fix: font rendering issue`)
4. **Pull Request**:
   - Title: "Epic 2: Text & Type Tools Implementation"
   - Description: Reference this epic document and list completed items
   - Request review from at least one other developer
   - Ensure all CI checks pass before merging

### Development Guidelines
1. **Before Starting**:
   - Pull latest `main` branch
   - Run `bun install` to ensure dependencies are up to date
   - Coordinate with Epic 1 dev on BaseTool class availability

2. **During Development**:
   - Only modify files related to your epic
   - Run `bun lint && bun typecheck` frequently
   - Fix all errors/warnings in YOUR files only (not other epics' files)
   - NO eslint-disable comments or @ts-ignore suppressions allowed

3. **Testing Requirements**:
   - Test all text tools with various fonts
   - Test text editing, selection, and transformation
   - Test character/paragraph panels
   - Test text on path functionality
   - Test in both light and dark themes
   - Verify font loading and rendering
   - Document test scenarios in PR description

4. **Before Creating PR**:
   - Run `bun lint && bun typecheck` - must pass with 0 errors/warnings in your files
   - Test all functionality manually
   - Update this epic document marking completed items
   - Commit the updated epic document

### Epic Start Process

Before implementing text tools:

1. **Deep Dive Analysis** (Required)
   - Study existing canvas object handling in the codebase
   - Analyze how Fabric.js IText and Textbox work
   - Understand current font loading mechanisms
   - Document text rendering patterns
   - NO ASSUMPTIONS - verify everything in actual code

2. **Research Phase**
   - Study Photoshop's text tool behaviors in detail
   - Research web font rendering best practices
   - Investigate text performance optimizations
   - Compare Canvas vs SVG text rendering approaches

3. **Gap Identification**
   - Font management system needed
   - Text styling UI components
   - Character/paragraph panels
   - Text effects infrastructure

### Epic End Process

1. **Quality Validation**
   - Text rendering performance optimized
   - All fonts load correctly
   - Proper font fallbacks implemented
   - Comprehensive keyboard shortcut support

2. **Integration Testing**
   - Test with various fonts and sizes
   - Test international character support
   - Test text on path functionality
   - Test with different zoom levels

3. **Documentation**
   - Font system architecture
   - Text tool usage guide
   - Performance benchmarks

---

## Comprehensive Implementation Plan

### Key Findings from Analysis

1. **Tool Architecture (Epic 1)**:
   - All tools extend `BaseTool` with proper lifecycle management
   - State management uses `createToolState` for encapsulation
   - Command pattern for all undoable actions
   - Layer integration via `LayerAwareMixin`
   - Event handling through `addCanvasEvent` helpers

2. **AI Integration (Epic 5)**:
   - Adapter pattern for AI-compatible tools
   - Only parameter-based tools work with AI
   - Canvas bridge for context management
   - Tool registry with auto-discovery

3. **Current State**:
   - Text tool placeholder exists but not implemented
   - No font management system
   - No text-specific commands
   - Fabric.js has `IText` and `Textbox` classes ready

### Phase 1: Foundation & Architecture (Day 1)

#### 1.1 Create Base Text Tool Class
```typescript
// lib/editor/tools/base/BaseTextTool.ts
export abstract class BaseTextTool extends BaseTool {
  protected state = createToolState<TextToolState>({
    currentText: null as IText | null,
    isEditing: false,
    originalText: '',
    lastClickTime: 0,
    lastClickPosition: { x: 0, y: 0 }
  })
  
  // Common text tool behavior
  protected abstract createTextObject(x: number, y: number): IText | Textbox
  protected commitText(): void
  protected handleTextChanged(): void
  protected updateTextStyle(options: ToolOption[]): void
}
```

#### 1.2 Font Management System
```typescript
// lib/editor/fonts/FontManager.ts
export class FontManager {
  private static instance: FontManager
  private loadedFonts = new Set<string>()
  private fontCache = new Map<string, FontFace>()
  private systemFonts: string[] = []
  
  async loadFont(fontFamily: string, url?: string): Promise<void>
  async loadGoogleFont(fontFamily: string): Promise<void>
  getAvailableFonts(): FontInfo[]
  preloadCommonFonts(): void
  detectSystemFonts(): Promise<string[]>
}

// lib/editor/fonts/FontDatabase.ts
export const FONT_DATABASE = {
  system: ['Arial', 'Helvetica', 'Times New Roman', ...],
  google: ['Roboto', 'Open Sans', 'Lato', ...],
  adobe: ['Adobe Garamond', 'Myriad Pro', ...]
}
```

#### 1.3 Text-Specific Types
```typescript
// types/text.ts
export interface TextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number | string
  fontStyle: 'normal' | 'italic' | 'oblique'
  textAlign: 'left' | 'center' | 'right' | 'justify'
  lineHeight: number
  letterSpacing: number
  color: string
  backgroundColor?: string
  underline: boolean
  overline: boolean
  linethrough: boolean
  textDecoration: string
}

export interface CharacterStyle extends TextStyle {
  baseline: number
  superscript: boolean
  subscript: boolean
  allCaps: boolean
  smallCaps: boolean
}

export interface ParagraphStyle {
  align: 'left' | 'center' | 'right' | 'justify'
  indentLeft: number
  indentRight: number
  indentFirst: number
  spaceBefore: number
  spaceAfter: number
  lineHeight: number
}
```

### Phase 2: Core Text Tools Implementation (Days 2-3)

#### 2.1 Horizontal Type Tool
```typescript
// lib/editor/tools/text/HorizontalTypeTool.ts
class HorizontalTypeTool extends BaseTextTool {
  id = TOOL_IDS.TYPE_HORIZONTAL
  name = 'Horizontal Type Tool'
  icon = Type
  shortcut = 'T'
  cursor = 'text'
  
  protected setupTool(canvas: Canvas): void {
    canvas.selection = false
    this.addCanvasEvent('mouse:down', this.handleMouseDown)
    this.addCanvasEvent('text:changed', this.handleTextChanged)
    this.subscribeToToolOptions(this.updateTextStyle)
  }
  
  protected createTextObject(x: number, y: number): IText {
    const options = this.toolOptionsStore.getToolOptions(this.id)
    return new IText('', {
      left: x,
      top: y,
      fontFamily: this.getOptionValue('fontFamily') || 'Arial',
      fontSize: this.getOptionValue('fontSize') || 24,
      fill: this.getOptionValue('color') || '#000000',
      editable: true,
      cursorColor: '#000000',
      cursorWidth: 2
    })
  }
}
```

#### 2.2 Text Commands
```typescript
// lib/editor/commands/text/AddTextCommand.ts
export class AddTextCommand extends Command {
  constructor(
    private canvas: Canvas,
    private textObject: IText,
    private layerId?: string
  ) {
    super(`Add text`)
  }
  
  async execute(): Promise<void> {
    this.canvas.add(this.textObject)
    if (this.layerId) {
      LayerAwareMixin.addObjectToLayer.call(
        { canvas: this.canvas }, 
        this.textObject
      )
    }
  }
}

// lib/editor/commands/text/EditTextCommand.ts
export class EditTextCommand extends Command {
  constructor(
    private textObject: IText,
    private oldText: string,
    private newText: string
  ) {
    super(`Edit text`)
  }
  
  async execute(): Promise<void> {
    this.textObject.set('text', this.newText)
    this.textObject.canvas?.renderAll()
  }
  
  canMergeWith(other: Command): boolean {
    return other instanceof EditTextCommand && 
           other.textObject === this.textObject &&
           Math.abs(other.timestamp - this.timestamp) < 1000
  }
}
```

#### 2.3 Tool Options Configuration
```typescript
// In store/toolOptionsStore.ts - add to defaultToolOptions
[TOOL_IDS.TYPE_HORIZONTAL]: {
  toolId: TOOL_IDS.TYPE_HORIZONTAL,
  options: [
    {
      id: 'fontFamily',
      type: 'dropdown',
      label: 'Font',
      value: 'Arial',
      props: {
        options: [], // Populated by FontManager
        searchable: true,
        showPreview: true,
        async: true // Load fonts on demand
      }
    },
    {
      id: 'fontSize',
      type: 'number',
      label: 'Size',
      value: 24,
      props: { min: 8, max: 144, step: 1, unit: 'pt' }
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
    }
  ]
}
```

### Phase 3: Typography Panels (Days 3-4)

#### 3.1 Character Panel
```typescript
// components/editor/Panels/CharacterPanel/index.tsx
export function CharacterPanel() {
  const { fabricCanvas } = useCanvasStore()
  const activeObject = fabricCanvas?.getActiveObject()
  const isText = activeObject instanceof IText
  
  if (!isText) return null
  
  return (
    <div className="p-4 space-y-4">
      <FontSelector 
        value={activeObject.fontFamily} 
        onChange={(font) => updateTextProperty('fontFamily', font)}
      />
      <FontSizeInput value={activeObject.fontSize} />
      <FontStyleButtons object={activeObject} />
      <TextColorPicker value={activeObject.fill} />
      <LetterSpacingControl value={activeObject.charSpacing} />
      <LineHeightControl value={activeObject.lineHeight} />
    </div>
  )
}
```

#### 3.2 Font Selector Component
```typescript
// components/editor/Panels/CharacterPanel/FontSelector.tsx
export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [fonts, setFonts] = useState<FontInfo[]>([])
  const [loading, setLoading] = useState(false)
  const fontManager = FontManager.getInstance()
  
  useEffect(() => {
    loadAvailableFonts()
  }, [])
  
  const handleFontChange = async (fontFamily: string) => {
    setLoading(true)
    await fontManager.loadFont(fontFamily)
    onChange(fontFamily)
    setLoading(false)
  }
  
  return (
    <Select value={value} onValueChange={handleFontChange}>
      <SelectTrigger>
        <span style={{ fontFamily: value }}>{value}</span>
      </SelectTrigger>
      <SelectContent>
        {fonts.map(font => (
          <SelectItem 
            key={font.family} 
            value={font.family}
            style={{ fontFamily: font.family }}
          >
            {font.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### Phase 4: Advanced Features (Days 4-5)

#### 4.1 Text on Path Tool
```typescript
// lib/editor/tools/text/TypeOnPathTool.ts
class TypeOnPathTool extends BaseTextTool {
  id = TOOL_IDS.TYPE_ON_PATH
  name = 'Type on a Path Tool'
  
  private selectedPath: Path | null = null
  
  protected setupTool(canvas: Canvas): void {
    super.setupTool(canvas)
    this.addCanvasEvent('mouse:over', this.handleMouseOver)
  }
  
  private handleMouseOver(e: { target: FabricObject }): void {
    if (e.target instanceof Path) {
      this.canvas!.defaultCursor = 'text'
      this.selectedPath = e.target
    }
  }
  
  protected createTextObject(x: number, y: number): IText {
    if (!this.selectedPath) {
      return super.createTextObject(x, y)
    }
    
    // Create text that follows the path
    const textPath = new TextOnPath(this.selectedPath, {
      text: '',
      ...this.getTextOptions()
    })
    
    return textPath
  }
}
```

#### 4.2 Text Effects System
```typescript
// lib/editor/text/effects/TextWarp.ts
export class TextWarp {
  static warpStyles = {
    arc: (text: IText, amount: number) => { /* ... */ },
    bulge: (text: IText, amount: number) => { /* ... */ },
    wave: (text: IText, amount: number) => { /* ... */ },
    flag: (text: IText, amount: number) => { /* ... */ },
    fish: (text: IText, amount: number) => { /* ... */ }
  }
  
  static applyWarp(text: IText, style: keyof typeof TextWarp.warpStyles, amount: number): void {
    const warpFunction = this.warpStyles[style]
    if (warpFunction) {
      warpFunction(text, amount)
    }
  }
}
```

#### 4.3 3D Text Effects
```typescript
// lib/editor/text/effects/Text3D.ts
export class Text3D {
  static apply3DEffect(text: IText, options: Text3DOptions): void {
    const { depth, angle, perspective, material } = options
    
    // Create 3D extrusion effect
    const extrudedText = this.createExtrusion(text, depth, angle)
    
    // Apply material/texture
    this.applyMaterial(extrudedText, material)
    
    // Apply perspective transformation
    this.applyPerspective(extrudedText, perspective)
  }
  
  static createBevel(text: IText, options: BevelOptions): void {
    const { style, size, soften } = options
    // Create beveled edges for 3D appearance
  }
}

interface Text3DOptions {
  depth: number
  angle: number
  perspective: number
  material: 'plastic' | 'metal' | 'glass' | 'wood'
}

interface BevelOptions {
  style: 'inner' | 'outer' | 'emboss' | 'pillow'
  size: number
  soften: number
}
```

#### 4.4 Layer Styles (Text Effects)
```typescript
// lib/editor/text/effects/LayerStyles.ts
export class TextLayerStyles {
  static applyDropShadow(text: IText, options: DropShadowOptions): void {
    text.shadow = new Shadow({
      color: options.color,
      blur: options.blur,
      offsetX: options.distance * Math.cos(options.angle * Math.PI / 180),
      offsetY: options.distance * Math.sin(options.angle * Math.PI / 180),
      opacity: options.opacity
    })
  }
  
  static applyStroke(text: IText, options: StrokeOptions): void {
    text.stroke = options.color
    text.strokeWidth = options.width
    text.strokeLineJoin = 'round'
    text.strokeLineCap = 'round'
    
    // Handle inside/outside/center positioning
    if (options.position === 'outside') {
      text.paintFirst = 'stroke'
    } else if (options.position === 'inside') {
      // Use clipping to achieve inside stroke
      text.clipPath = this.createStrokeClipPath(text)
    }
  }
  
  static applyGlow(text: IText, options: GlowOptions): void {
    // Create outer glow effect using shadow with 0 offset
    text.shadow = new Shadow({
      color: options.color,
      blur: options.size,
      offsetX: 0,
      offsetY: 0,
      opacity: options.opacity
    })
    
    // For inner glow, create a separate effect
    if (options.type === 'inner') {
      this.applyInnerGlow(text, options)
    }
  }
  
  static applyGradientFill(text: IText, options: GradientOptions): void {
    const gradient = new Gradient({
      type: options.type,
      coords: this.calculateGradientCoords(text, options),
      colorStops: options.colorStops
    })
    
    text.fill = gradient
  }
  
  static applyPattern(text: IText, pattern: Pattern): void {
    text.fill = pattern
  }
}

interface DropShadowOptions {
  color: string
  opacity: number
  angle: number
  distance: number
  blur: number
  spread?: number
}

interface StrokeOptions {
  color: string
  width: number
  position: 'outside' | 'inside' | 'center'
  opacity?: number
  gradient?: GradientOptions
}

interface GlowOptions {
  type: 'outer' | 'inner'
  color: string
  size: number
  opacity: number
  technique?: 'softer' | 'precise'
}

interface GradientOptions {
  type: 'linear' | 'radial'
  angle?: number
  colorStops: Array<{ offset: number; color: string }>
}
```

#### 4.5 Text Effects Panel
```typescript
// components/editor/Panels/TextEffectsPanel/index.tsx
export function TextEffectsPanel() {
  const { fabricCanvas } = useCanvasStore()
  const [activeTextObject, setActiveTextObject] = useState<IText | null>(null)
  
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-sm">Text Effects</h3>
      
      {/* Warp Text */}
      <WarpTextSection object={activeTextObject} />
      
      {/* 3D Effects */}
      <Text3DSection object={activeTextObject} />
      
      {/* Layer Styles */}
      <LayerStylesSection object={activeTextObject} />
      
      {/* Presets */}
      <TextPresetsSection object={activeTextObject} />
    </div>
  )
}
```

#### 4.6 Text Styles & Presets
```typescript
// lib/editor/text/TextStyleManager.ts
export class TextStyleManager {
  private static styles = new Map<string, TextStyle>()
  
  static registerStyle(name: string, style: TextStyle): void {
    this.styles.set(name, style)
  }
  
  static applyStyle(text: IText, styleName: string): void {
    const style = this.styles.get(styleName)
    if (!style) return
    
    // Apply all style properties
    Object.assign(text, style.textProperties)
    
    // Apply effects
    if (style.effects) {
      this.applyEffects(text, style.effects)
    }
  }
  
  static getBuiltInStyles(): TextStyle[] {
    return [
      {
        name: 'Heading 1',
        textProperties: {
          fontSize: 48,
          fontWeight: 'bold',
          lineHeight: 1.2
        },
        effects: {
          dropShadow: { distance: 2, blur: 4, opacity: 0.3 }
        }
      },
      {
        name: 'Neon',
        textProperties: {
          fontSize: 36,
          fontFamily: 'Arial Black'
        },
        effects: {
          stroke: { color: '#fff', width: 2 },
          glow: { type: 'outer', color: '#0ff', size: 20, opacity: 0.8 }
        }
      },
      {
        name: '3D Metal',
        textProperties: {
          fontSize: 42,
          fontWeight: 'bold'
        },
        effects: {
          gradient: {
            type: 'linear',
            angle: 90,
            colorStops: [
              { offset: 0, color: '#666' },
              { offset: 0.5, color: '#fff' },
              { offset: 1, color: '#333' }
            ]
          },
          bevel: { style: 'emboss', size: 5 },
          dropShadow: { distance: 5, blur: 8, opacity: 0.5 }
        }
      }
    ]
  }
}

interface TextStyle {
  name: string
  textProperties: Partial<ITextProps>
  effects?: {
    dropShadow?: DropShadowOptions
    stroke?: StrokeOptions
    glow?: GlowOptions
    gradient?: GradientOptions
    bevel?: BevelOptions
    warp?: { style: string; amount: number }
    threeDimension?: Text3DOptions
  }
}
```

### Phase 5: AI Integration (Day 5)

#### 5.1 Text Tool AI Adapter
```typescript
// lib/ai/adapters/tools/addText.ts
export class AddTextToolAdapter extends BaseToolAdapter<AddTextInput, AddTextOutput> {
  tool = horizontalTypeTool
  aiName = 'addText'
  description = 'Add text to the image at specified position with styling'
  
  parameters = z.object({
    text: z.string().describe('The text content to add'),
    x: z.number().optional().describe('X position in pixels (default: center)'),
    y: z.number().optional().describe('Y position in pixels (default: center)'),
    fontSize: z.number().min(8).max(144).optional().describe('Font size in points'),
    fontFamily: z.string().optional().describe('Font family name'),
    color: z.string().optional().describe('Text color in hex format'),
    alignment: z.enum(['left', 'center', 'right']).optional()
  })
  
  async execute(params: AddTextInput, context: { canvas: Canvas }): Promise<AddTextOutput> {
    const { canvas } = context
    
    // Calculate position if not provided
    const x = params.x ?? canvas.getWidth() / 2
    const y = params.y ?? canvas.getHeight() / 2
    
    // Create text object
    const text = new IText(params.text, {
      left: x,
      top: y,
      fontSize: params.fontSize || 24,
      fontFamily: params.fontFamily || 'Arial',
      fill: params.color || '#000000',
      textAlign: params.alignment || 'center',
      originX: 'center',
      originY: 'center'
    })
    
    // Add to canvas with command
    const command = new AddTextCommand(canvas, text)
    await useHistoryStore.getState().executeCommand(command)
    
    return {
      success: true,
      objectId: text.get('id' as any) as string
    }
  }
}
```

### Phase 6: Testing & Performance (Day 6)

#### 6.1 Unit Tests
```typescript
// __tests__/tools/text/HorizontalTypeTool.test.ts
describe('HorizontalTypeTool', () => {
  let canvas: Canvas
  let tool: HorizontalTypeTool
  
  beforeEach(() => {
    canvas = new Canvas('test-canvas')
    tool = new HorizontalTypeTool()
    tool.onActivate(canvas)
  })
  
  it('should create text on click', () => {
    const event = createMouseEvent(100, 100)
    tool.handleMouseDown(event)
    
    const objects = canvas.getObjects()
    expect(objects).toHaveLength(1)
    expect(objects[0]).toBeInstanceOf(IText)
  })
  
  it('should apply font options', () => {
    useToolOptionsStore.getState().updateOption(
      TOOL_IDS.TYPE_HORIZONTAL,
      'fontFamily',
      'Georgia'
    )
    
    const event = createMouseEvent(100, 100)
    tool.handleMouseDown(event)
    
    const text = canvas.getObjects()[0] as IText
    expect(text.fontFamily).toBe('Georgia')
  })
})
```

#### 6.2 Performance Optimizations
```typescript
// lib/editor/text/TextRenderCache.ts
export class TextRenderCache {
  private cache = new Map<string, ImageData>()
  
  getCacheKey(text: IText): string {
    return `${text.text}_${text.fontFamily}_${text.fontSize}_${text.fill}`
  }
  
  get(text: IText): ImageData | null {
    return this.cache.get(this.getCacheKey(text)) || null
  }
  
  set(text: IText, imageData: ImageData): void {
    const key = this.getCacheKey(text)
    this.cache.set(key, imageData)
    
    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }
}
```

### Implementation Timeline

**Day 1**: Foundation
- BaseTextTool class
- Font management system
- Text-specific types and constants

**Day 2**: Core Tools
- HorizontalTypeTool implementation
- VerticalTypeTool implementation
- Text commands (Add, Edit, Style)

**Day 3**: UI Components
- Character Panel
- Paragraph Panel
- Font selector with preview

**Day 4**: Advanced Features
- Type on Path tool
- Type Mask tool
- Text warping effects

**Day 5**: Integration
- AI adapter for text tools
- Text styles/presets system
- Performance optimizations

**Day 6**: Testing & Polish
- Unit tests
- Integration tests
- Performance benchmarks
- Documentation

### Key Technical Decisions

1. **Font Loading Strategy**
   - Lazy load fonts on demand
   - Cache loaded fonts
   - Preload common fonts
   - Use font-display: swap for performance

2. **Text State Management**
   - Encapsulated in tool state
   - Commands for all text changes
   - Merge similar edits within 1 second

3. **AI Integration**
   - Only addText is AI-compatible
   - Natural language for positioning ("top-left", "center")
   - Style presets ("heading", "caption", "watermark")

4. **Performance Considerations**
   - Text render caching for repeated text
   - Debounce text property updates
   - Virtual scrolling for font lists
   - Web workers for text effects

This plan follows all established patterns from Epic 1 and Epic 5, ensuring consistency and maintainability while delivering a comprehensive text editing system.

---

## Overview
This epic covers implementation of all text-related tools in FotoFun, from basic text placement to advanced typography features. These tools are essential for creating text overlays, titles, and typographic designs.

## Prerequisites
Before starting these tools, ensure:
- [ ] Base Tool Class is implemented (from Epic 1)
- [ ] Command Pattern/History system is working
- [ ] Basic layer system is functional
- [ ] Tool Options Store is understood

## Required Patterns from Epic 1

### MUST Follow These Standards
All text tools MUST adhere to the patterns established in Epic 1:

1. **Tool Architecture**
   - Extend from `BaseTool` or `BaseTypeTool` class
   - NO module-level state - use encapsulated class properties
   - Use `ToolStateManager` for complex state
   - Implement proper lifecycle methods

2. **Event Management**
   - Use `addEventListener` helper from `BaseTool`
   - Use `addCanvasEvent` for Fabric.js events
   - NEVER manually track event listeners
   - All events auto-cleanup on deactivate

3. **Command Pattern**
   - Every text modification creates a command
   - Use `executeCommand()` not direct canvas manipulation
   - Commands must be reversible for undo/redo

4. **State Management**
   ```typescript
   // ❌ WRONG - Module-level state
   let currentText: IText | null = null
   
   // ✅ CORRECT - Encapsulated state
   class TypeTool extends BaseTool {
     private state = {
       currentText: null as IText | null,
       isEditing: false,
       lastPosition: { x: 0, y: 0 }
     }
   }
   ```

5. **Resource Cleanup**
   - Override `cleanup()` to handle tool-specific cleanup
   - Remove any temporary objects from canvas
   - Clear any tool-specific state

6. **Performance Requirements**
   - Text rendering must complete in < 16ms
   - Use `performanceMonitor.track()` for operations
   - Debounce rapid text updates

### Example: Proper Text Tool Structure
```typescript
export class HorizontalTypeTool extends BaseTool {
  id = TOOL_IDS.TYPE_HORIZONTAL
  name = 'Horizontal Type Tool'
  icon = Type
  shortcut = 'T'
  
  // Encapsulated state
  private state = {
    currentText: null as IText | null,
    isEditing: false,
    originalText: ''
  }
  
  protected setupTool(canvas: Canvas): void {
    // Use helper methods for event management
    this.addCanvasEvent('mouse:down', this.handleMouseDown)
    this.addCanvasEvent('text:changed', this.handleTextChanged)
    
    // Subscribe to options changes
    this.subscribeToToolOptions((options) => {
      this.updateTextStyle(options)
    })
  }
  
  protected cleanup(canvas: Canvas): void {
    // Commit any pending text
    if (this.state.isEditing) {
      this.commitText()
    }
    
    // Base class handles event cleanup automatically
  }
  
  private handleMouseDown = (e: FabricEvent): void => {
    this.performanceMonitor.track('text-creation', () => {
      // Text creation logic
      const text = this.createTextObject(e.pointer)
      
      // Use command pattern
      const command = new AddTextCommand(this.canvas!, text)
      this.executeCommand(command)
    })
  }
  
  private commitText(): void {
    if (!this.state.currentText) return
    
    // Create command for the text change
    const command = new ModifyTextCommand(
      this.canvas!,
      this.state.currentText,
      this.state.originalText,
      this.state.currentText.text!
    )
    
    this.executeCommand(command)
    
    // Clear state
    this.state.currentText = null
    this.state.isEditing = false
  }
}
```

## Tools to Implement

### Core Type Tools
1. **Horizontal Type Tool (T)**
**MVP Version**
- Click to place text cursor
- Type to add text
- Basic font selection (system fonts)
- Font size control (8-144pt)
- Text color picker
- Left/Center/Right alignment
- Click and drag to create text box

**Full Photoshop Parity**
- Character panel integration
- Paragraph panel integration
- Font preview in dropdown
- Font favorites/recent fonts
- OpenType features
- Kerning/tracking controls
- Leading controls
- Baseline shift
- All caps/small caps
- Superscript/subscript
- Anti-aliasing options (None, Sharp, Crisp, Strong, Smooth)
- Text on a path
- Warp text effects
- Text styles/presets

2. **Vertical Type Tool (T)**
**MVP Version**
- Same as horizontal but vertical orientation
- Asian typography basic support
- Vertical alignment options

**Full Photoshop Parity**
- Full Asian typography features
- Tate-chu-yoko (horizontal in vertical)
- Kinsoku rules
- Mojikumi settings
- Vertical metrics adjustments

3. **Type Mask Tool (T)**
**MVP Version**
- Create selection in shape of text
- Same text controls as regular type tool
- Convert to selection on commit

**Full Photoshop Parity**
- All type tool features but creates selection
- Quick mask integration
- Save/load type selections

4. **Type on Path Tool**
**MVP Version**
- Click on path to add text
- Text follows path curve
- Adjust starting point
- Flip text to other side

**Full Photoshop Parity**
- Multiple text blocks on same path
- Adjust text spacing on curves
- Gravity effects
- Path text effects
- Convert between path text and regular text

### History & Annotation Tools
5. **History Brush Tool (Y)**
   - MVP: Paint from a history state
   - Full: Opacity, blend modes, brush dynamics
   - Files: `/lib/tools/historyBrushTool.ts`

6. **Art History Brush Tool (Y)**
   - MVP: Stylized painting from history
   - Full: Style options, fidelity, area, spacing
   - Files: `/lib/tools/artHistoryBrushTool.ts`

7. **Note Tool (I)**
   - MVP: Add text annotations to document
   - Full: Author info, timestamps, categories
   - Files: `/lib/tools/noteTool.ts`, `/components/panels/NotesPanel.tsx`

## Implementation Guide

### Base Type Tool Class
```typescript
import { BaseTool } from './base/BaseTool'
import { Type } from 'lucide-react'
import { IText, Canvas } from 'fabric'

abstract class BaseTypeTool extends BaseTool {
  // Properly encapsulated state
  protected state = {
    currentText: null as IText | null,
    isEditing: false,
    originalText: '',
    lastClickTime: 0
  }
  
  cursor = 'text'
  
  protected setupTool(canvas: Canvas): void {
    // Disable object selection while typing
    canvas.selection = false
    
    // Set up text defaults from options
    this.updateTextDefaults()
    
    // Use BaseTool's event management
    this.addCanvasEvent('mouse:down', this.handleMouseDown)
    this.addCanvasEvent('selection:created', this.handleSelectionCreated)
    
    // Subscribe to option changes
    this.subscribeToToolOptions((options) => {
      this.updateTextDefaults()
    })
  }
  
  protected cleanup(canvas: Canvas): void {
    // Commit any active text
    if (this.state.currentText && this.state.isEditing) {
      this.commitText()
    }
    
    // Re-enable selection
    canvas.selection = true
    
    // BaseTool handles event cleanup automatically
  }
  
  protected handleMouseDown = (e: any): void => {
    // Track performance
    this.performanceMonitor.track('text-mouse-down', () => {
      if (this.state.isEditing) {
        // Click outside text commits it
        this.commitText()
        return
      }
      
      // Create new text at click position
      const pointer = this.canvas!.getPointer(e.e)
      this.createText(pointer.x, pointer.y)
    })
  }
  
  protected abstract createText(x: number, y: number): void
  
  protected commitText(): void {
    if (!this.state.currentText || !this.canvas) return
    
    // Only create command if text actually changed
    if (this.state.currentText.text !== this.state.originalText) {
      // Record command for undo/redo
      const command = new ModifyTextCommand(
        this.canvas,
        this.state.currentText,
        this.state.originalText,
        this.state.currentText.text || ''
      )
      
      this.executeCommand(command)
    }
    
    // Reset state
    this.state.currentText = null
    this.state.isEditing = false
    this.state.originalText = ''
  }
  
  protected updateTextDefaults(): void {
    const options = this.toolOptionsStore.getToolOptions(this.id)
    // Apply font, size, color, etc. to new text
  }
  
  protected handleSelectionCreated = (e: any): void => {
    // Handle when user selects existing text
    if (e.selected[0] instanceof IText) {
      this.state.currentText = e.selected[0]
      this.state.originalText = e.selected[0].text || ''
    }
  }
}
```

### Horizontal Type Tool Implementation
```typescript
export class HorizontalTypeTool extends BaseTypeTool {
  id = TOOL_IDS.TYPE_HORIZONTAL
  name = 'Horizontal Type Tool'
  icon = Type
  shortcut = 'T'
  
  protected createText(x: number, y: number): void {
    const options = this.options.getToolOptions(this.id)
    
    this.state.currentText = new IText('', {
      left: x,
      top: y,
      fontFamily: options?.fontFamily || 'Arial',
      fontSize: options?.fontSize || 24,
      fill: options?.color || '#000000',
      textAlign: options?.alignment || 'left',
      editable: true,
      cursorColor: '#000000',
      cursorWidth: 2,
    })
    
    this.canvas!.add(this.state.currentText)
    this.canvas!.setActiveObject(this.state.currentText)
    
    // Enter edit mode
    this.state.currentText.enterEditing()
    this.state.currentText.selectAll()
    this.state.isEditing = true
    
    // Listen for text changes
    this.state.currentText.on('changed', this.handleTextChanged)
    this.state.currentText.on('editing:exited', this.handleEditingExited)
  }
  
  private handleTextChanged = (): void => {
    // Update character count in status bar
    // Apply auto-sizing if enabled
  }
  
  private handleEditingExited = (): void => {
    this.commitText()
  }
}
```

### Text Command for Undo/Redo
```typescript
export class AddTextCommand implements Command {
  constructor(
    private canvas: Canvas,
    private textObject: IText,
    private text: string
  ) {}
  
  async execute(): Promise<void> {
    this.canvas.add(this.textObject)
    this.canvas.setActiveObject(this.textObject)
    this.canvas.renderAll()
  }
  
  async undo(): Promise<void> {
    this.canvas.remove(this.textObject)
    this.canvas.renderAll()
  }
  
  async redo(): Promise<void> {
    await this.execute()
  }
  
  get description(): string {
    return `Add text: "${this.text.substring(0, 20)}..."`
  }
}
```

### Tool Options Configuration
```typescript
export const typeToolOptions: ToolOptionsConfig = {
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
          // Add more fonts
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
}
```

### Character Panel Component
```typescript
export function CharacterPanel() {
  const activeObject = useActiveObject()
  const isText = activeObject instanceof IText
  
  if (!isText) return null
  
  return (
    <div className="character-panel">
      <FontSelector value={activeObject.fontFamily} />
      <FontSizeInput value={activeObject.fontSize} />
      <FontStyleButtons />
      
      <Divider />
      
      <LeadingControl value={activeObject.lineHeight} />
      <KerningControl value={activeObject.charSpacing} />
      <TrackingControl />
      
      <Divider />
      
      <BaselineShiftControl />
      <TextTransformOptions />
      <AntiAliasDropdown />
    </div>
  )
}
```

## Testing Guidelines

### Manual Testing Checklist

#### Basic Functionality
1. **Text Creation**
   - [ ] Click to place cursor
   - [ ] Type text appears at cursor
   - [ ] Click and drag creates text box
   - [ ] Text wraps in text box

2. **Text Editing**
   - [ ] Double-click to edit existing text
   - [ ] Cursor navigation (arrows, home/end)
   - [ ] Text selection (shift+arrows, ctrl+a)
   - [ ] Copy/paste works

3. **Formatting**
   - [ ] Font family changes apply
   - [ ] Font size changes apply
   - [ ] Color picker works
   - [ ] Bold/italic/underline toggle
   - [ ] Alignment options work

4. **Edge Cases**
   - [ ] Very long text performance
   - [ ] Unicode/emoji support
   - [ ] RTL language support
   - [ ] Text at canvas edges

5. **Integration**
   - [ ] Undo/redo text changes
   - [ ] Text appears in layers panel
   - [ ] Transform tools work on text
   - [ ] Text exports correctly

### Automated Testing
```typescript
describe('HorizontalTypeTool', () => {
  let canvas: Canvas
  let tool: HorizontalTypeTool
  
  beforeEach(() => {
    canvas = new Canvas('test-canvas')
    tool = new HorizontalTypeTool()
    tool.onActivate(canvas)
  })
  
  it('should create text on click', () => {
    const event = createMouseEvent(100, 100)
    tool.handleMouseDown(event)
    
    const objects = canvas.getObjects()
    expect(objects).toHaveLength(1)
    expect(objects[0]).toBeInstanceOf(IText)
  })
  
  it('should apply font options', () => {
    // Set font options
    useToolOptionsStore.getState().updateOption(
      TOOL_IDS.TYPE_HORIZONTAL,
      'fontFamily',
      'Georgia'
    )
    
    const event = createMouseEvent(100, 100)
    tool.handleMouseDown(event)
    
    const text = canvas.getObjects()[0] as IText
    expect(text.fontFamily).toBe('Georgia')
  })
  
  it('should record history on commit', () => {
    const historySpy = jest.spyOn(tool, 'recordCommand')
    
    // Create and commit text
    tool.handleMouseDown(createMouseEvent(100, 100))
    tool.commitText()
    
    expect(historySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Add text')
      })
    )
  })
})
```

## Performance Considerations

### Font Loading
```typescript
class FontManager {
  private loadedFonts = new Set<string>()
  private fontCache = new Map<string, FontFace>()
  
  async loadFont(fontFamily: string): Promise<void> {
    if (this.loadedFonts.has(fontFamily)) return
    
    try {
      const font = new FontFace(fontFamily, `url(/fonts/${fontFamily}.woff2)`)
      await font.load()
      document.fonts.add(font)
      this.loadedFonts.add(fontFamily)
      this.fontCache.set(fontFamily, font)
    } catch (error) {
      console.error(`Failed to load font: ${fontFamily}`, error)
      // Fall back to system font
    }
  }
  
  preloadCommonFonts(): void {
    const commonFonts = ['Arial', 'Helvetica', 'Times New Roman']
    commonFonts.forEach(font => this.loadFont(font))
  }
}
```

### Text Rendering Optimization
- Use `textBackgroundColor` sparingly (performance impact)
- Limit real-time preview for expensive operations
- Cache text metrics for repeated calculations
- Use `dirty: true` flag to control re-renders

## Advanced Features Implementation Notes

### Text on Path
```typescript
class TextOnPath {
  constructor(
    private text: string,
    private path: fabric.Path
  ) {}
  
  generateTextPath(): fabric.Group {
    const pathLength = this.path.getTotalLength()
    const charSpacing = pathLength / this.text.length
    
    const chars = this.text.split('').map((char, i) => {
      const charPos = this.path.getPointAtLength(i * charSpacing)
      const angle = this.path.getAngleAtLength(i * charSpacing)
      
      return new fabric.IText(char, {
        left: charPos.x,
        top: charPos.y,
        angle: angle,
        fontSize: this.fontSize,
        fontFamily: this.fontFamily
      })
    })
    
    return new fabric.Group(chars)
  }
}
```

### Text Warping
```typescript
enum WarpStyle {
  Arc = 'arc',
  Bulge = 'bulge',
  Wave = 'wave',
  Flag = 'flag',
  Fish = 'fish'
}

class TextWarper {
  warp(text: IText, style: WarpStyle, amount: number): fabric.Path {
    const path = this.generateWarpPath(text, style, amount)
    return this.applyTextToPath(text, path)
  }
}
```

## File Organization for Epic 2

### Text Tool Files to Create

#### 1. Tool Implementations
```
lib/
├── tools/
│   ├── text/
│   │   ├── base/
│   │   │   ├── BaseTypeTool.ts         # Base class for all text tools
│   │   │   └── TextToolUtils.ts        # Shared text utilities
│   │   ├── HorizontalTypeTool.ts       # Main text tool
│   │   ├── VerticalTypeTool.ts         # Vertical text
│   │   ├── TypeMaskTool.ts             # Text selection mask
│   │   ├── TypeOnPathTool.ts           # Text on paths
│   │   └── index.ts
```

#### 2. Text Commands
```
lib/
├── commands/
│   ├── text/
│   │   ├── AddTextCommand.ts           # Add new text
│   │   ├── EditTextCommand.ts          # Edit existing text
│   │   ├── TransformTextCommand.ts     # Transform text object
│   │   ├── TextStyleCommand.ts         # Change text styling
│   │   └── index.ts
```

#### 3. Font Management
```
lib/
├── fonts/
│   ├── FontManager.ts                   # Font loading and caching
│   ├── FontDatabase.ts                  # Available fonts registry
│   ├── FontPreview.ts                   # Font preview generator
│   └── index.ts

public/
├── fonts/                               # Font files (.woff2)
│   ├── Arial.woff2
│   ├── Helvetica.woff2
│   └── ... (other fonts)
```

#### 4. Text Effects
```
lib/
├── text/
│   ├── effects/
│   │   ├── TextWarp.ts                  # Warp effects
│   │   ├── TextPath.ts                  # Path following
│   │   ├── TextOutline.ts               # Stroke/outline
│   │   ├── TextShadow.ts                # Drop shadow
│   │   └── index.ts
│   ├── formatting/
│   │   ├── TextFormatter.ts             # Format engine
│   │   ├── LineBreaker.ts               # Line breaking
│   │   ├── Hyphenation.ts               # Word hyphenation
│   │   └── index.ts
```

#### 5. Typography Panels
```
components/
├── panels/
│   ├── CharacterPanel/
│   │   ├── index.tsx                    # Main character panel
│   │   ├── FontSelector.tsx             # Font dropdown
│   │   ├── FontSizeInput.tsx            # Size control
│   │   ├── FontStyleButtons.tsx         # Bold/italic/underline
│   │   ├── TextColorPicker.tsx          # Color selection
│   │   ├── LetterSpacing.tsx            # Tracking/kerning
│   │   ├── LineHeight.tsx               # Leading control
│   │   └── TextTransform.tsx            # Case options
│   │
│   ├── ParagraphPanel/
│   │   ├── index.tsx                    # Main paragraph panel
│   │   ├── AlignmentButtons.tsx         # Text alignment
│   │   ├── IndentControls.tsx           # Indentation
│   │   ├── SpacingControls.tsx          # Before/after spacing
│   │   ├── JustificationOptions.tsx     # Justify settings
│   │   └── HyphenationOptions.tsx       # Hyphenation rules
│   │
│   ├── GlyphsPanel/
│   │   ├── index.tsx                    # Glyphs/symbols panel
│   │   ├── GlyphGrid.tsx                # Character grid
│   │   ├── GlyphSearch.tsx              # Search glyphs
│   │   └── RecentGlyphs.tsx             # Recently used
```

#### 6. Tool Options Components
```
components/
├── editor/
│   ├── OptionsBar/
│   │   ├── options/
│   │   │   ├── text/
│   │   │   │   ├── TextToolOptions.tsx  # Type tool options
│   │   │   │   ├── FontDropdown.tsx     # Custom font selector
│   │   │   │   ├── TextAlignment.tsx    # Alignment buttons
│   │   │   │   └── AntiAliasDropdown.tsx # AA options
```

#### 7. Text Styles System
```
lib/
├── text/
│   ├── styles/
│   │   ├── TextStyle.ts                 # Style definition
│   │   ├── TextStyleManager.ts          # Style management
│   │   ├── TextStylePresets.ts          # Built-in styles
│   │   └── index.ts

store/
├── textStyleStore.ts                    # Text styles state
```

#### 8. Constants Updates
```
constants/
├── index.ts                             # Add:
├── text.ts                              # New file with:
                                        # - FONT_SIZES
                                        # - LINE_HEIGHTS
                                        # - LETTER_SPACINGS
                                        # - DEFAULT_FONTS
                                        # - ANTI_ALIAS_MODES
                                        # - TEXT_TRANSFORMS
```

#### 9. Types Updates
```
types/
├── index.ts                             # Add:
├── text.ts                              # New file with:
                                        # - TextStyle interface
                                        # - FontInfo interface
                                        # - TextAlignment enum
                                        # - TextTransform enum
                                        # - CharacterStyle interface
                                        # - ParagraphStyle interface
```

#### 10. Hooks for Text Tools
```
hooks/
├── useTextTool.ts                       # Text tool state hook
├── useFontLoader.ts                     # Font loading hook
├── useTextSelection.ts                  # Text selection hook
├── useTextMetrics.ts                    # Text measurement hook
```

### Asian Typography Support (Full Version)
```
lib/
├── text/
│   ├── asian/
│   │   ├── VerticalMetrics.ts          # Vertical text metrics
│   │   ├── TateChuYoko.ts              # Horizontal in vertical
│   │   ├── Kinsoku.ts                   # Line breaking rules
│   │   ├── Mojikumi.ts                  # Character spacing
│   │   └── index.ts
```

### Testing Structure
```
__tests__/
├── tools/
│   ├── text/
│   │   ├── HorizontalTypeTool.test.ts
│   │   ├── VerticalTypeTool.test.ts
│   │   ├── TypeMaskTool.test.ts
│   │   └── TypeOnPathTool.test.ts
│   ├── commands/
│   │   └── text/
│   │       ├── AddTextCommand.test.ts
│   │       └── EditTextCommand.test.ts
```

### Implementation Order

1. **Week 1: Core Text Tool**
   - BaseTypeTool class
   - HorizontalTypeTool
   - Basic text commands
   - Font manager setup

2. **Week 2: Text Panels**
   - Character panel
   - Paragraph panel
   - Tool options integration

3. **Week 3: Advanced Features**
   - Vertical type tool
   - Type mask tool
   - Text styles system

4. **Week 4: Polish & Full Features**
   - Type on path
   - Text warping
   - Asian typography
   - Performance optimization

## Deliverables Checklist

### Core Text Tools
- [x] Horizontal Type Tool (MVP)
- [x] Vertical Type Tool (MVP)
- [x] Type Mask Tool (MVP)
- [ ] Type on Path Tool
- [x] Font Manager service
- [x] Text commands for undo/redo
- [x] Tool options configuration

### Typography Panels
- [x] Character Panel UI
- [x] Paragraph Panel UI
- [ ] Glyphs Panel UI
- [ ] Text Effects Panel UI

### Advanced Text Effects
- [ ] Text warping effects (arc, bulge, wave, flag, fish)
- [ ] 3D text effects (extrusion, bevel, perspective)
- [ ] Layer styles (drop shadow, stroke, glow, gradient)
- [ ] Text styles/presets system
- [ ] OpenType features support

### Testing & Documentation
- [ ] Unit tests (80% coverage)
- [ ] Manual test documentation
- [ ] Performance benchmarks
- [ ] AI integration for text tools

## Progress Summary

### Phase 1: Foundation & Architecture ✅
- Created BaseTextTool class with encapsulated state
- Implemented FontManager singleton for font loading
- Created FontDatabase with system and Google fonts
- Defined comprehensive text types (TextStyle, CharacterStyle, ParagraphStyle)
- Established text command structure (AddTextCommand, EditTextCommand)

### Phase 2: Core Text Tools ✅
- **HorizontalTypeTool**: Complete with all basic features
  - Click to place text cursor
  - Type to add/edit text
  - Font, size, color, alignment controls
  - Bold, italic, underline support
  - Layer integration
  - Fixed canvas rendering issues (no more disappearing images)
- **VerticalTypeTool**: Complete with vertical text support
  - 90-degree rotation for vertical orientation
  - Asian typography considerations
  - Same formatting options as horizontal
- **TypeMaskTool**: Complete with selection creation
  - Creates text-shaped selections
  - Visual indicator (dashed outline)
  - Integrates with SelectionManager
  - Works with all selection modes

### Phase 3: Typography Panels (Partial) ⏳
- **Character Panel**: Complete ✅
  - FontSelector with system/Google fonts
  - FontSizeInput with increment/decrement
  - FontStyleButtons (bold, italic, underline)
  - TextColorPicker with presets
  - LetterSpacingControl with slider
  - LineHeightControl with percentage display
  - Fixed text color visibility in light/dark modes
- **Paragraph Panel**: Complete ✅
  - AlignmentButtons for text alignment
  - IndentControls for left/right/first line indentation
  - SpacingControls for line height and paragraph spacing
  - JustificationOptions for text justification
  - TextDirectionControl for LTR/RTL
- **Glyphs Panel**: Not started ❌
- **Text Effects Panel**: Partial ⏳
  - Drop shadow effects ✅
  - Stroke effects ✅
  - Glow effects (inner/outer) ✅
  - Gradient fills ✅
  - Text presets (Neon, Shadow, Outline) ✅
  - Text warping ❌
  - 3D effects ❌

### Phase 4: Advanced Features (Partial) ⏳
- **Type on Path Tool**: Not started ❌
- **Text warping effects**: Not started ❌
- **3D text effects**: Not started ❌
- **OpenType features**: Not started ❌
- **Text styles/presets system**: Basic implementation ✅
  - TextLayerStyles class implemented
  - Basic presets working
  - Save/load custom styles ❌

### Phase 5: AI Integration (Not Started) ❌
- AddText AI adapter
- Natural language text placement
- Style presets for AI

### Phase 6: Testing & Performance (Not Started) ❌
- Unit tests
- Integration tests
- Performance optimization
- Documentation

## Technical Improvements Made

### Canvas Rendering Fixes
- Fixed issue where adding text made images disappear
- Removed duplicate canvas.add() calls throughout text creation flow
- Made syncLayersToCanvas() non-destructive to prevent canvas clearing
- Fixed layer type detection to create appropriate layers (text vs image)
- Updated AddObjectCommand to check for existing objects
- Fixed similar issues in brush tool

### UI/UX Improvements
- Fixed text color visibility in both light and dark modes
- Added proper text-foreground classes to all labels
- Ensured consistent styling across all panels

## Next Steps

1. **Complete Phase 3**:
   - Create Glyphs Panel for special characters
   - Add text warping to Text Effects Panel
   - Add 3D effects to Text Effects Panel

2. **Complete Phase 4**:
   - Implement Type on Path Tool
   - Add full OpenType features support
   - Complete text styles save/load system

3. **Phase 5 - AI Integration**:
   - Create AI adapter for text tools
   - Implement natural language text placement

4. **Phase 6 - Testing**:
   - Write comprehensive unit tests
   - Performance optimization
   - Create documentation