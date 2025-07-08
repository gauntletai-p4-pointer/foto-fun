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

- [ ] Horizontal Type Tool (MVP)
- [ ] Vertical Type Tool (MVP)
- [ ] Type Mask Tool (MVP)
- [ ] Character Panel UI
- [ ] Paragraph Panel UI
- [ ] Font Manager service
- [ ] Text commands for undo/redo
- [ ] Tool options configuration
- [ ] Unit tests (80% coverage)
- [ ] Manual test documentation
- [ ] Performance benchmarks
- [ ] Horizontal Type Tool (Full)
- [ ] Vertical Type Tool (Full)
- [ ] Type Mask Tool (Full)
- [ ] Type on Path Tool
- [ ] Text warping effects
- [ ] OpenType features panel
- [ ] Text styles/presets system

## File Organization

### New Files to Create
```
/lib/tools/
  baseTypeTool.ts          # Base class for all type tools
  horizontalTypeTool.ts    # Standard text tool
  verticalTypeTool.ts      # Vertical text variant
  typeMaskTool.ts          # Text selection tool
  typeOnPathTool.ts        # Text on curves
  historyBrushTool.ts      # Paint from history states
  artHistoryBrushTool.ts   # Stylized history painting
  noteTool.ts              # Document annotations

/lib/text/
  textEngine.ts            # Core text rendering
  fontManager.ts           # Font loading and management
  textMeasurement.ts       # Text metrics calculations
  pathText.ts              # Text on path algorithms
  textEffects.ts           # Text layer effects

/components/panels/
  CharacterPanel.tsx       # Font, size, style controls
  ParagraphPanel.tsx       # Alignment, spacing controls
  GlyphsPanel.tsx          # Special character picker
  NotesPanel.tsx           # View/manage annotations

/components/text/
  TextEditor.tsx           # In-canvas text editing
  FontPicker.tsx           # Font selection dropdown
  TextStylePresets.tsx     # Quick style buttons

/lib/history/
  historyBrush.ts          # History brush engine
  artHistoryStyles.ts      # Art history brush styles
```

### Updates to Existing Files 