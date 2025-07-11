# Photoshop Retouching & Adjustments Parity

## 80/20 Analysis - What We're Building vs Deferring

### 🎯 **KEEP** - Essential Adjustments (80% of use cases)

These are the most-used tools by photographers and designers:

| Tool | Why Keep | Status | Priority |
|------|----------|---------|----------|
| **Levels** | Basic tonal control | ❌ Not Started | **High** |
| **Curves** | Pro's favorite tool | ❌ Not Started | **High** |
| **Brightness/Contrast** | Quick adjustments | ✅ Implemented | - |
| **Hue/Saturation** | Color control | ✅ Implemented | - |
| **Vibrance/Saturation** | Smart color boost | ❌ Not Started | **Medium** |
| **Exposure** | HDR-style editing | ✅ Implemented | - |
| **Color Balance** | Color grading | ❌ Not Started | **Medium** |
| **Black & White** | B&W conversion | ❌ Not Started | **Low** |
| **Crop Tool** | Basic editing | ✅ Implemented | - |

### 🎯 **KEEP** - Essential Retouching (80% of use cases)

| Tool | Why Keep | Status | Priority |
|------|----------|---------|----------|
| **Clone Stamp** | Basic retouching | ❌ Not Started | **High** |
| **Healing Brush** | Smart retouching | ❌ Not Started | **High** |
| **Spot Healing** | Quick fixes | ❌ Not Started | **Medium** |
| **Eraser** | Basic removal | ✅ Implemented | - |

### 🚫 **DEFER** - Advanced Adjustments (20% edge cases)

These are powerful but used less frequently:

| Tool | Why Defer |
|------|-----------|
| **Channel Mixer** | Complex color grading |
| **Color Lookup (LUTs)** | Specific workflows |
| **Gradient Map** | Creative effects |
| **Selective Color** | CMYK-based editing |
| **Photo Filter** | Can use Hue/Saturation |
| **Match Color** | Batch processing feature |
| **Replace Color** | Niche use case |
| **Equalize** | Rarely used correctly |
| **Shadows/Highlights** | Complex algorithm |

### 🚫 **DEFER** - Advanced Retouching (20% edge cases)

| Tool | Why Defer |
|------|-----------|
| **Patch Tool** | Complex selection-based |
| **Content-Aware Fill** | Very complex AI |
| **Red Eye Tool** | Specific use case |
| **Blur/Sharpen/Smudge** | Local tools, filters better |
| **Dodge/Burn/Sponge** | Can use adjustment layers |

### ⚡ **SIMPLIFIED APPROACH**

Instead of implementing every Photoshop tool, we can achieve similar results with:

1. **Adjustment Layers + Masks** instead of Dodge/Burn tools
2. **Clone Stamp + Healing** instead of complex Content-Aware tools
3. **Basic Filters** instead of local Blur/Sharpen tools
4. **Curves** instead of multiple specialized adjustments

---

## AI Integration Status

### ✅ **All Essential Adjustments Have AI Adapters**

Every adjustment tool in our core set has AI integration:

| Adjustment | AI Adapter | Natural Language Support |
|------------|------------|-------------------------|
| **Brightness/Contrast** | ✅ | "make brighter", "increase contrast" |
| **Hue/Saturation** | ✅ | "more vibrant", "shift colors warmer" |
| **Exposure** | ✅ | "fix overexposure", "brighten shadows" |
| **Crop** | ✅ | "crop to square", "remove edges" |
| **Rotate** | ✅ | "rotate 90 degrees", "straighten image" |
| **Flip** | ✅ | "flip horizontally", "mirror image" |
| **Resize** | ✅ | "make smaller", "resize to 800px wide" |

### 🚧 **Retouching Tools - AI Integration Pending**

These tools are implemented but don't have AI adapters yet:

| Tool | Status | Why No AI Adapter |
|------|--------|-------------------|
| **Clone Stamp** | ❌ | Requires precise source/target selection |
| **Healing Brush** | ❌ | Needs user-guided source points |
| **Spot Healing** | ❌ | Requires specific area identification |
| **Eraser** | ❌ | Destructive operation needs careful control |

### 🤖 **AI Adjustment Capabilities**

The AI excels at:
1. **Intent Interpretation** - "make it pop" → increases contrast/vibrance
2. **Batch Adjustments** - Apply same settings to multiple images
3. **Smart Combinations** - "fix this dark photo" → exposure + brightness
4. **Context Awareness** - Adjusts based on image content
5. **Non-Destructive** - All adjustments preserve original data

### 💡 **Future AI Enhancements**

Planned AI capabilities:
- **Auto-Enhance** - One-click optimal adjustments
- **Style Matching** - Match adjustments from reference image
- **Selective Adjustments** - "brighten just the face"
- **Smart Retouching** - AI-guided healing for common issues

---

## Retouching Tools - Detailed Breakdown

### **Spot Healing Brush (J)**
**How it Works:**
- Automatically samples surrounding area
- No source point needed - just paint over blemishes
- Analyzes texture, lighting, and shading

**Types:**
- **Proximity Match**: Uses pixels immediately around edge
- **Create Texture**: Synthesizes new texture from area
- **Content-Aware**: Most intelligent - considers larger context

**Best Practices:**
- Use small brush just larger than blemish
- Work on separate layer (Sample All Layers on)
- Quick clicks better than dragging for small spots

### **Healing Brush**
**Difference from Spot Healing:**
- YOU choose source point (Alt-click)
- More control over what's sampled
- Better for areas near edges or with specific textures

**Options:**
- **Mode**: Normal, Replace, Multiply, Screen, etc.
- **Source**: Sampled or Pattern
- **Aligned**: Source moves with brush or stays fixed
- **Sample**: Current Layer, Current & Below, All Layers
- **Diffusion**: Controls edge blending (1-7)

### **Patch Tool**
**Workflow:**
1. Draw selection around problem area
2. Drag to good area (Normal mode) or drag good to bad (Content-Aware)
3. Selection blends texture and color

**Modes:**
- **Normal**: Basic patching
- **Content-Aware**: Intelligent blending
  - Structure: 1-7 (preserve details)
  - Color: 0-10 (color adaptation)

**Patch Options:**
- Source: Heals selection with another area
- Destination: Uses selection to heal another area
- Transparent: Preserves transparency

### **Content-Aware Fill**
**Edit > Content-Aware Fill:**
- Opens dedicated workspace
- Green overlay shows sampling area
- Exclude areas with subtraction brush
- Real-time preview

**Options:**
- **Fill Settings**:
  - Color Adaptation: How much color blending
  - Rotation Adaptation: Allow rotation
  - Scale: Allow scaling
  - Mirror: Allow flipping
- **Output**: New Layer, Current Layer, Duplicate Layer

### **Clone Stamp (S)**
**Basics:**
- Alt-click to set source
- Paint to clone exactly
- No automatic blending (unlike healing tools)

**Clone Source Panel:**
- 5 source points available
- Offset X/Y positioning
- Scale, rotate, flip source
- Show Overlay: See ghosted preview
- Opacity of overlay adjustable

**When to Use:**
- Duplicating specific textures/patterns
- Areas where healing tools fail
- Precise control needed
- Cloning between documents

### **Blur/Sharpen/Smudge Tools**
**Blur Tool:**
- Softens details
- Strength: 1-100%
- Good for reducing noise locally
- Smoothing skin, backgrounds

**Sharpen Tool:**
- Increases local contrast
- Protect Detail option
- Use sparingly - easy to overdo
- Better to use Unsharp Mask filter globally

**Smudge Tool:**
- Pushes pixels like wet paint
- Finger Painting: Starts with foreground color
- Sample All Layers option
- Good for hair, fabric adjustments

### **Dodge/Burn/Sponge (O)**
**Dodge Tool:**
- Lightens areas
- **Range Options**:
  - Shadows: Affects dark areas most
  - Midtones: Affects middle values
  - Highlights: Affects bright areas
- Exposure: 1-100% (keep low, 5-15%)
- Protect Tones: Prevents clipping

**Burn Tool:**
- Darkens areas
- Same range options as Dodge
- Traditional darkroom technique

**Sponge Tool:**
- **Modes**:
  - Desaturate: Removes color
  - Saturate: Intensifies color
- Flow: 1-100%
- Vibrance option: Protects skin tones

**Non-Destructive Dodge/Burn:**
```
1. Create new layer
2. Fill with 50% gray
3. Set blend mode to Overlay
4. Paint with black (burn) or white (dodge)
5. Adjust layer opacity for strength
```

### **Red Eye Tool**
- Click on red pupils
- **Options**:
  - Pupil Size: 0-100%
  - Darken Amount: 0-100%
- Works on pet eye shine too
- For difficult cases, manually paint

---

## Adjustment Tools - Detailed Breakdown

### **Adjustment Layers vs Direct Adjustments**
**Benefits of Adjustment Layers:**
- Non-destructive
- Re-editable anytime
- Blend modes and opacity
- Layer masks for selective application
- Can affect multiple layers below

### **Brightness/Contrast**
**Legacy vs Modern:**
- Legacy: Linear adjustment (usually bad)
- Modern: Preserves tonal relationships

**Use Cases:**
- Quick global adjustments
- Often too crude for professional work
- Better to use Curves or Levels

### **Levels**
**Components:**
- **Histogram**: Shows tonal distribution
- **Input Levels**: Black point, midtones, white point
- **Output Levels**: Compress tonal range

**Channels:**
- RGB composite or individual R, G, B
- Adjust color casts per channel

**Presets:**
- Auto-Levels algorithms
- Various contrast presets

**Eyedroppers:**
- Set black point (darkest shadow)
- Set gray point (neutral)
- Set white point (brightest highlight)

### **Curves**
**Most Powerful Tonal Tool:**
- X-axis: Input values
- Y-axis: Output values
- Diagonal line = no change

**Techniques:**
- Click to add points
- S-curve for contrast
- Inverse S for lower contrast
- Target specific tonal ranges

**Advanced Features:**
- Show: Histogram, Baseline, Intersection Line
- Channel overlays
- Draw with pencil tool
- Input/Output number fields

**Targeted Adjustment Tool:**
- Click-drag in image
- Automatically places point on curve
- Drag up/down to adjust

### **Exposure**
**HDR-style Adjustments:**
- **Exposure**: Overall brightness (-20 to +20)
- **Offset**: Shadows/midtones (-0.5 to +0.5)
- **Gamma**: Midtone brightness (0.01 to 9.99)

**Linear Light Working:**
- Works in linear space
- Better for 32-bit images
- More realistic light behavior

### **Vibrance/Saturation**
**Vibrance:**
- Smart saturation boost
- Protects skin tones
- Prevents oversaturation
- Range: -100 to +100

**Saturation:**
- Linear saturation change
- Affects all colors equally
- Can create unnatural results

**Hue Slider:**
- Shifts all colors around wheel
- Rarely used except for effects

### **Hue/Saturation**
**Master vs Individual Colors:**
- Edit: Master, Reds, Yellows, Greens, Cyans, Blues, Magentas
- Each color has range sliders

**Per-Color Controls:**
- Hue: Shift color (-180 to +180)
- Saturation: Intensity (-100 to +100)
- Lightness: Brightness (-100 to +100)

**Range Selection:**
- Eyedroppers to sample colors
- Add to/subtract from range
- Feathering between colors

**Colorize Mode:**
- Converts to monochrome tinted image
- Like sepia or duotone effects

### **Color Balance**
**Tonal Ranges:**
- Shadows
- Midtones  
- Highlights

**Color Wheels:**
- Cyan ← → Red
- Magenta ← → Green
- Yellow ← → Blue

**Options:**
- Preserve Luminosity: Maintains brightness
- Without this, can shift exposure

### **Black & White**
**Not Just Desaturate:**
- 6 color sliders: Reds, Yellows, Greens, Cyans, Blues, Magentas
- Control how each color converts to gray
- Presets: Red Filter, Yellow Filter, etc.

**Targeted Adjustment:**
- Click-drag in image
- Adjusts underlying color's brightness

**Tint:**
- Add color overlay
- Hue and Saturation controls

### **Photo Filter**
**Simulates Camera Filters:**
- Warming Filter (85, 81)
- Cooling Filter (80, 82)
- Color filters for B&W photography

**Options:**
- Filter selection or custom color
- Density: 1-100%
- Preserve Luminosity

### **Channel Mixer**
**Advanced Color Grading:**
- Mix percentages of R, G, B channels
- Per-channel output

**Monochrome Mode:**
- Custom B&W conversion
- Total should ≈ 100%
- Can exceed for creative effects

### **Color Lookup**
**3D LUTs (Look-Up Tables):**
- Load cinematic color grades
- Includes many presets
- Can load .3DL, .CUBE files

**Categories:**
- 3DLUT File
- Abstract
- Device Link

### **Gradient Map**
**Maps Tones to Gradient:**
- Shadows → left gradient color
- Highlights → right gradient color
- Midtones → gradient middle

**Uses:**
- Creative color grading
- Duotone effects
- False color visualization

### **Selective Color**
**CMYK-based Adjustment:**
- Adjust colors using Cyan, Magenta, Yellow, Black
- Colors: Reds, Yellows, Greens, Cyans, Blues, Magentas
- Also: Whites, Neutrals, Blacks

**Method:**
- Relative: Percentage of existing
- Absolute: Adds/subtracts absolute amount

### **Shadows/Highlights**
**Beyond Simple Brightness:**
- **Shadows**: Amount, Tone, Radius
- **Highlights**: Amount, Tone, Radius
- **Adjustments**: Color, Midtone

**Advanced Options:**
- Black/White Clip: Prevent clipping
- Very powerful for recovering detail

### **Camera Raw Filter**
**Full Raw Processor in Photoshop:**
- All ACR adjustment panels
- Works on any layer/smart object
- Most comprehensive adjustment tool

**Panels Include:**
- Basic: Exposure, Highlights, Shadows, etc.
- Curve: Parametric and point
- HSL adjustments
- Split Toning
- Detail: Sharpening and noise
- Lens Corrections
- Effects: Grain, vignette
- Calibration

### **Match Color**
**Image > Adjustments > Match Color:**
- Match colors between images
- Source statistics applied to target
- Luminance and Color sliders
- Fade control
- Great for batch consistency

### **Replace Color**
**Targeted Color Changes:**
- Selection eyedropper tools
- Fuzziness (like tolerance)
- Hue, Saturation, Lightness sliders
- Localized color replacement

### **Equalize**
**Redistributes Brightness:**
- Stretches histogram to full range
- Can help low-contrast images
- Often too aggressive

These tools form the foundation of professional photo editing and retouching. The key is understanding not just what each does, but when to use which tool - often combining multiple adjustments and retouching techniques for optimal results.