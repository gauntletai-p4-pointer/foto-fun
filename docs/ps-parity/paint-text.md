## Painting & Drawing Tools - Detailed Breakdown

### **Brush Tool (B)**
**Core Mechanics:**
- Paints with foreground color
- Pressure sensitivity with tablets (size, opacity, flow)
- Right-click or Control-click: quick brush picker

**Brush Settings Panel:**
- **Brush Tip Shape**: Hardness, angle, roundness, spacing
- **Shape Dynamics**: Size/angle/roundness jitter
- **Scattering**: Spread strokes randomly
- **Texture**: Apply texture to strokes
- **Dual Brush**: Combine two brushes
- **Color Dynamics**: Hue/saturation/brightness variation
- **Transfer**: Opacity/flow dynamics
- **Brush Pose**: Tilt/rotation/pressure effects
- **Noise**: Adds randomness
- **Wet Edges**: Watercolor effect
- **Build-up**: Airbrush-style accumulation
- **Smoothing**: Stabilizes strokes (0-100%)

**Brush Presets:**
- Hundreds of default brushes
- Categories: General, Dry Media, Wet Media, Special Effects
- Import/export .ABR brush files
- Tool presets save entire tool state

### **Pencil Tool**
- Always hard-edged (no anti-aliasing)
- Useful for pixel art
- Auto Erase: Draws with background color over foreground color
- Otherwise identical to Brush tool

### **Eraser Tool (E)**
**Modes:**
- **Brush**: Soft-edged erasing
- **Pencil**: Hard-edged erasing
- **Block**: Legacy square cursor

**Options:**
- Erase to History: Restore from history state
- Background Eraser: Smart edge detection
- Magic Eraser: Like paint bucket but erases

### **Clone Stamp Tool (S)**
**Operation:**
- Alt-click to set source point
- Paint to clone from source
- Source moves with painting (aligned) or stays fixed

**Options:**
- **Sample**: Current Layer/Current & Below/All Layers
- **Aligned**: Source point moves relative to brush
- **Clone Source Panel**: 
  - Up to 5 source points
  - Show overlay (ghosted preview)
  - Offset, scale, rotate source
  - Clone between documents

### **Pattern Stamp Tool**
- Paints with selected pattern
- Impressionist option: Creates artistic effect
- Aligned: Continuous pattern vs restart each stroke

### **Healing Brush Tool (J)**
**How it Works:**
- Like Clone Stamp but blends texture, lighting, shading
- Alt-click to set source
- Matches destination's texture and tone

**Options:**
- **Mode**: Normal/Replace/Multiply/Screen/etc
- **Source**: Sampled/Pattern
- **Diffusion**: Controls edge blending (1-7)

### **Spot Healing Brush**
- No source selection needed
- Automatically samples nearby area
- **Type Options:**
  - Proximity Match: Uses nearby pixels
  - Create Texture: Synthesizes texture
  - Content-Aware: Smartest fill option

### **Patch Tool**
**Modes:**
- **Normal**: Draw selection, drag to source
- **Content-Aware**: Intelligent blending
- **Diffusion**: Edge blending control
- Structure: How much to preserve (1-7)
- Color: How much color to blend

### **Content-Aware Move Tool**
- Select and move objects
- **Mode**: Move or Extend
- Automatically fills original location
- Adaptation: Very Strict to Very Loose
- Great for repositioning elements

### **Red Eye Tool**
- Click on red eyes to fix
- Pupil Size: 0-100%
- Darken Amount: 0-100%
- Works on pet eyes too

### **Mixer Brush**
**Real Paint Simulation:**
- **Load**: Paint on brush
- **Mix**: How paint mixes
- **Wet**: Canvas wetness
- **Flow**: Paint application rate

**Presets:**
- Dry variants
- Moist/Very Wet variants
- Mix/Heavy Mix variants

**Options:**
- Clean brush after each stroke
- Load brush after each stroke
- Sample All Layers

### **History Brush (Y)**
- Paints from selected history state
- Allows selective undo
- Art History Brush: Stylized strokes

### **Gradient Tool (G)**
**Gradient Types:**
- Linear
- Radial  
- Angle
- Reflected
- Diamond

**Gradient Editor:**
- Color stops and opacity stops
- Smooth/stepped gradients
- Save custom gradients
- Noise gradients: Random colors

**Options:**
- **Mode**: Blend modes
- **Opacity**: Gradient transparency
- **Reverse**: Flip gradient
- **Dither**: Prevent banding
- **Transparency**: Honor opacity stops

### **Paint Bucket Tool**
- Fills areas with color/pattern
- **Tolerance**: Color similarity (0-255)
- **Contiguous**: Only connected pixels
- **Anti-alias**: Smooth edges
- **All Layers**: Sample composite

### **3D Painting Tools** (when 3D active)
- Paint directly on 3D models
- Project paint through view
- Paint on targeted textures

---

## Text & Type Tools - Detailed Breakdown

### **Horizontal/Vertical Type Tool (T)**
**Basic Text Creation:**
- Click for point text (single line)
- Click-drag for paragraph text (text box)
- Type on path: Click on any path

### **Character Panel Settings**
**Font Controls:**
- **Font Family**: Thousands available + TypeKit/Adobe Fonts
- **Font Style**: Regular, Bold, Italic, etc.
- **Size**: Points, pixels, mm, inches
- **Leading**: Line spacing (Auto or specific)
- **Kerning**: Letter pair spacing (Metrics/Optical/Manual)
- **Tracking**: Overall letter spacing

**Advanced Typography:**
- **Vertical/Horizontal Scale**: Stretch type
- **Baseline Shift**: Raise/lower characters
- **Character Rotation**: Individual character angles
- **Tsume**: Asian typography spacing
- **Anti-aliasing Methods**:
  - None (aliased)
  - Sharp
  - Crisp  
  - Strong
  - Smooth

**OpenType Features:**
- Ligatures (Standard/Discretionary)
- Contextual Alternates
- Swashes
- Stylistic Sets
- Ordinals
- Fractions

### **Paragraph Panel**
**Alignment:**
- Left, Center, Right
- Justify (last left/center/right/full)

**Indentation:**
- Left indent
- Right indent
- First line indent
- Space before/after paragraph

**Advanced:**
- **Hyphenation**: Auto with controls
- **Justification**: Word/letter/glyph spacing
- **Composer**: Single-line vs Every-line (better)
- **Hanging Punctuation**: Professional typography

### **Type Warping**
**Warp Styles:**
- Arc, Arc Lower/Upper
- Arch, Bulge
- Shell Lower/Upper
- Flag, Wave
- Fish, Rise
- Fisheye, Inflate
- Squeeze, Twist

**Controls:**
- Bend: -100% to +100%
- Horizontal/Vertical Distortion
- Maintains editability

### **Type on Path**
**Creation:**
- Draw path with Pen tool
- Click with Type tool
- Type flows along path

**Options:**
- Flip text to other side
- Adjust baseline shift
- Control start/end points
- Multiple text blocks per path

### **Type Conversion**
**Convert to Shape:**
- Creates vector path from type
- No longer editable as text
- Can use as clipping path

**Convert to Work Path:**
- Creates editable path
- Use for custom effects

**Rasterize Type:**
- Converts to pixels
- Loses vector quality
- Allows pixel-based filters

### **Text Selection Tools**
- Double-click: Select word
- Triple-click: Select line
- Quadruple-click: Select paragraph
- Ctrl/Cmd+A: Select all

### **Special Text Features**

**Smart Quotes:**
- Automatically converts to curly quotes

**Placeholder Text:**
- Type > Paste Lorem Ipsum

**Font Preview:**
- See fonts in actual typeface
- Adjustable preview size

**Font Similarity:**
- Filter fonts by visual similarity
- Filter by classification (Serif, Sans, Script)

**Variable Fonts:**
- Adjust weight, width, slant on axes
- Smooth interpolation between styles

**Match Font:**
- AI-powered font identification from images
- Suggests similar fonts from your library

### **Text Effects Best Practices**
**Layer Styles on Text:**
- Drop Shadow, Inner Shadow
- Outer/Inner Glow
- Bevel and Emboss
- Stroke
- Gradient/Pattern Overlay
- Maintain editability

**Text as Mask:**
- Type in Quick Mask mode
- Text becomes selection
- Fill with images/patterns

These tools represent the core of Photoshop's creative capabilities - mastery of brushes and type tools is essential for professional work. The key is understanding not just what each tool does, but how they interact with other Photoshop features like layers, masks, and blend modes.

---

## Implementation Plan - 80/20 Analysis

### Overview
Following the Pareto principle, we're focusing on the 20% of features that provide 80% of the value. This plan prioritizes tools and features that are most commonly used in professional workflows while deferring complex, niche features.

### Paint Tools - What We're Building

#### **Core Paint Tools (Implementing)**

**1. Enhanced Brush Tool**
- ✅ **Pressure sensitivity** with tablet support
- ✅ **Basic brush dynamics** (size, opacity, flow)
- ✅ **Brush presets system** with common brushes
- ✅ **Smoothing/stabilization** (0-100%)
- ✅ **Blend modes** support
- ✅ **Quick brush picker** (right-click)
- ✅ **Custom brush creation** from shapes
- ❌ Complex dynamics (rotation, tilt) - deferred
- ❌ Dual brush mode - deferred
- ❌ Texture brushes - deferred

**2. Eraser Tool**
- ✅ **Three modes**: Brush, Pencil, Block
- ✅ **Background Eraser** with edge detection
- ✅ **Magic Eraser** (like paint bucket but erases)
- ✅ **Opacity and flow controls**
- ❌ Erase to History - deferred (requires history states)

**3. Clone Stamp Tool**
- ✅ **Basic cloning** with source point selection
- ✅ **Aligned/non-aligned modes**
- ✅ **Sample options**: Current Layer/Current & Below/All Layers
- ✅ **Preview overlay** (ghosted preview)
- ✅ **Cross-document cloning**
- ❌ Multiple source points - deferred
- ❌ Clone Source panel transformations - deferred

**4. Healing Brush Tool**
- ✅ **Basic healing** with texture and tone matching
- ✅ **Spot Healing** mode (no source needed)
- ✅ **Content-aware healing** algorithm
- ✅ **Diffusion control** for edge blending
- ❌ Pattern source mode - deferred

**5. Gradient Tool**
- ✅ **All gradient types**: Linear, Radial, Angle, Reflected, Diamond
- ✅ **Gradient editor** with color/opacity stops
- ✅ **Custom gradient saving**
- ✅ **Blend modes and opacity**
- ❌ Noise gradients - deferred

#### **Paint Tools We're NOT Building (Deferred)**

**1. Pattern Stamp Tool**
- Low usage in modern workflows
- Can be achieved with other methods

**2. Mixer Brush**
- Very complex real paint simulation
- Niche professional use case
- Performance intensive

**3. History Brush**
- Requires full history state system
- Art History Brush even more niche

**4. Content-Aware Move Tool**
- Requires advanced AI algorithms
- Can use selection + healing instead

**5. Patch Tool**
- Similar results achievable with healing brush
- Complex UI requirements

**6. Red Eye Tool**
- Very specific use case
- Low priority for general image editing

**7. 3D Painting Tools**
- Requires entire 3D system
- Out of scope for 2D editor

### Text Tools - What We're Building

#### **Core Text Features (Implementing)**

**1. Text Creation & Editing**
- ✅ **Point text** (click to create)
- ✅ **Paragraph text** (click-drag for text box)
- ✅ **Inline editing** with proper text cursor
- ✅ **Smart text selection** (double/triple/quad click)
- ✅ **Text transformation** (scale, rotate, skew)

**2. Typography Controls**
- ✅ **Font selection** with preview
- ✅ **Basic styles**: Bold, Italic, Underline
- ✅ **Size, leading, kerning, tracking**
- ✅ **Anti-aliasing options**: None, Sharp, Smooth
- ✅ **Text alignment**: Left, Center, Right, Justify
- ✅ **Paragraph controls**: Indentation, spacing
- ❌ Advanced OpenType features - deferred
- ❌ Font similarity search - deferred

**3. Text Warping**
- ✅ **Core warp styles**: Arc, Bulge, Wave, Flag, Rise
- ✅ **Bend control** (-100% to +100%)
- ✅ **Maintains text editability**
- ❌ Complex warp styles (Shell, Twist, etc.) - deferred

**4. Type on Path**
- ✅ **Basic path text** with any shape
- ✅ **Baseline adjustments**
- ✅ **Start/end point control**
- ❌ Multiple text blocks per path - deferred

**5. Text Effects**
- ✅ **Layer styles**: Drop shadow, stroke, gradient
- ✅ **Text as selection mask**
- ✅ **Convert to shape** (vector path)
- ✅ **Glow effects** (inner/outer)
- ❌ Bevel and emboss - deferred
- ❌ 3D text effects - deferred

#### **Text Features We're NOT Building (Deferred)**

**1. Advanced Typography**
- Variable fonts support
- Complex OpenType features (swashes, stylistic sets)
- Advanced justification algorithms
- Hanging punctuation

**2. International Text**
- Complex script support (Arabic, Hindi)
- Vertical text for Asian languages (beyond basic)
- Right-to-left text handling

**3. Professional Publishing**
- Multi-column text flow
- Text wrap around objects
- Hyphenation dictionaries
- Font management features

**4. AI-Powered Features**
- Match Font from image
- Font similarity search
- Auto font suggestions

### Technical Architecture (Library-Agnostic)

#### **Core Systems to Build**

**1. Pixel Manipulation Engine**
```typescript
abstract class BasePixelTool extends BaseTool {
  protected pixelBuffer: ImageData
  protected brushEngine: BrushEngine
  protected blendingEngine: BlendingEngine
}

class BrushEngine {
  // Pressure curves
  // Brush tip shapes
  // Spacing and flow
  // Stabilization
}

class BlendingEngine {
  // All Photoshop blend modes
  // Opacity and flow calculations
  // Pixel-perfect compositing
}
```

**2. Text Layout Engine**
```typescript
class TextEngine {
  private fontManager: FontManager
  private layoutEngine: TextLayoutEngine
  private glyphConverter: GlyphToPathConverter
  
  // Font loading and management
  // Text measurement and layout
  // Path conversion for effects
}
```

**3. Performance Optimizations**
- WebGL acceleration for filters and brushes
- Efficient pixel buffer management
- Progressive rendering for large canvases
- Intelligent caching strategies

### Success Metrics

1. **Feature Coverage**: 80% of common Photoshop workflows supported
2. **Performance**: <16ms paint latency, 60fps text editing
3. **Code Quality**: Clean, maintainable, library-agnostic architecture
4. **User Experience**: Intuitive controls matching Photoshop conventions

### Migration Timeline

**Week 1: Foundation**
- Base architecture setup
- Event system integration
- Basic brush and text tools

**Week 2: Paint Tools**
- Brush engine with dynamics
- Clone and healing tools
- Gradient system

**Week 3: Text System**
- Typography engine
- Text warping
- Path text

**Week 4: Polish & Integration**
- Performance optimization
- UI/UX refinement
- Testing and bug fixes

This focused approach delivers maximum value while maintaining high quality and performance standards.