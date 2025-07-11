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