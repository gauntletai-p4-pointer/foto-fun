# Agent 4: Pixel Manipulation and Filters Implementation

## 🎯 Mission Overview

Agent 4 is responsible for implementing tools that manipulate pixel data within existing image objects. These tools provide adjustment controls and filter effects that enhance or modify images.

## 📋 Tools to Implement

### Adjustment Tools
1. **Brightness Tool** (`brightness`) - Adjust image brightness
2. **Contrast Tool** (`contrast`) - Adjust image contrast
3. **Saturation Tool** (`saturation`) - Adjust color saturation
4. **Hue Tool** (`hue`) - Shift color hue
5. **Exposure Tool** (`exposure`) - Adjust exposure levels

### Filter Tools
1. **Blur Tool** (`blur`) - Apply blur effects
2. **Sharpen Tool** (`sharpen`) - Sharpen images
3. **Grayscale Tool** (`grayscale`) - Convert to grayscale
4. **Invert Tool** (`invert`) - Invert colors
5. **Vintage Effects Tool** (`vintage-effects`) - Apply vintage filters

## 🏗️ Implementation Guide

### Base Classes for Pixel Manipulation

```typescript
// lib/editor/tools/base/AdjustmentTool.ts
export abstract class AdjustmentTool extends BaseTool {
  protected targetObjects: CanvasObject[] = [];
  protected originalImageData: Map<string, ImageData> = new Map();
  protected isAdjusting: boolean = false;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Get selected image objects
    this.targetObjects = this.getImageObjects();
    
    if (this.targetObjects.length === 0) {
      this.showNoImageMessage();
      this.switchToDefaultTool();
      return;
    }
    
    // Store original image data for real-time preview
    this.storeOriginalData();
    
    // Show adjustment UI
    this.showAdjustmentUI();
    
    this.setState(ToolState.ACTIVE);
  }
  
  async onDeactivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Hide adjustment UI
    this.hideAdjustmentUI();
    
    // Clear stored data
    this.originalImageData.clear();
    this.targetObjects = [];
    
    this.setState(ToolState.INACTIVE);
  }
  
  protected storeOriginalData(): void {
    this.targetObjects.forEach(obj => {
      if (obj.type === 'image' && obj.data.imageData) {
        // Clone image data
        const original = new ImageData(
          new Uint8ClampedArray(obj.data.imageData.data),
          obj.data.imageData.width,
          obj.data.imageData.height
        );
        this.originalImageData.set(obj.id, original);
      }
    });
  }
  
  protected applyAdjustment(value: number): void {
    if (!this.isAdjusting) {
      this.isAdjusting = true;
      this.setState(ToolState.WORKING);
    }
    
    this.targetObjects.forEach(obj => {
      const original = this.originalImageData.get(obj.id);
      if (!original) return;
      
      // Create adjusted image data
      const adjusted = this.processImageData(original, value);
      
      // Update preview
      this.dependencies.canvasManager.updateObjectPreview(obj.id, {
        data: { ...obj.data, imageData: adjusted }
      });
    });
  }
  
  public commitAdjustment(value: number): void {
    if (!this.isAdjusting) return;
    
    const commands: Command[] = [];
    
    this.targetObjects.forEach(obj => {
      const original = this.originalImageData.get(obj.id);
      if (!original) return;
      
      const adjusted = this.processImageData(original, value);
      
      // NOTE FOR EXECUTOR: This requires adding a `createUpdateImageDataCommand` method to CommandFactory.ts
      commands.push(this.dependencies.commandFactory.createUpdateImageDataCommand(
        obj.id,
        adjusted,
        original
      ));
    });
    
    if (commands.length > 0) {
      // NOTE FOR EXECUTOR: This requires adding a `createCompositeCommand` method to CommandFactory.ts
      const batchCommand = this.dependencies.commandFactory.createCompositeCommand(
        `Apply ${this.id} adjustment`,
        commands
      );
      this.dependencies.commandManager.executeCommand(batchCommand);
    }
    
    this.isAdjusting = false;
    this.setState(ToolState.ACTIVE);
  }
  
  protected abstract processImageData(imageData: ImageData, value: number): ImageData;
  protected abstract showAdjustmentUI(): void;
  protected abstract hideAdjustmentUI(): void;
}
```

```typescript
// lib/editor/tools/base/FilterTool.ts
export abstract class FilterTool extends BaseTool {
  protected filterEngine: WebGLFilterEngine;
  protected targetObjects: CanvasObject[] = [];
  protected previewActive: boolean = false;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
    this.filterEngine = new WebGLFilterEngine();
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Get selected image objects
    this.targetObjects = this.getImageObjects();
    
    if (this.targetObjects.length === 0) {
      this.showNoImageMessage();
      this.switchToDefaultTool();
      return;
    }
    
    // Initialize filter
    await this.initializeFilter();
    
    // Show filter options
    this.showFilterOptions();
    
    this.setState(ToolState.ACTIVE);
  }
  
  protected abstract initializeFilter(): Promise<void>;
  protected abstract createFilterShader(): WebGLShader;
  
  public async applyFilter(options: Record<string, any>): Promise<void> {
    this.setState(ToolState.WORKING);
    
    const commands: Command[] = [];
    
    for (const obj of this.targetObjects) {
      if (obj.type !== 'image' || !obj.data.imageData) continue;
      
      // Process with WebGL
      const filtered = await this.filterEngine.process(
        obj.data.imageData,
        this.createFilterShader(),
        options
      );
      
      // NOTE FOR EXECUTOR: This requires adding a `createUpdateImageDataCommand` method to CommandFactory.ts
      commands.push(this.dependencies.commandFactory.createUpdateImageDataCommand(
        obj.id,
        filtered,
        obj.data.imageData
      ));
    }
    
    if (commands.length > 0) {
      const batchCommand = this.dependencies.commandFactory.createCompositeCommand(
        `Apply ${this.id} filter`,
        commands
      );
      await this.dependencies.commandManager.executeCommand(batchCommand);
    }
    
    this.setState(ToolState.ACTIVE);
  }
}
```

## 🛠️ Tool Implementations

### 1. Brightness Tool

```typescript
// lib/editor/tools/adjustment/brightnessTool.ts
export class BrightnessTool extends AdjustmentTool {
  private adjustmentSlider: AdjustmentSlider | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('brightness', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      adjustment: {
        type: 'number',
        default: 0,
        min: -100,
        max: 100,
        label: 'Brightness'
      },
      preserveColors: {
        type: 'boolean',
        default: true,
        label: 'Preserve Colors'
      }
    };
  }
  
  protected processImageData(imageData: ImageData, value: number): ImageData {
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    const adjustment = value / 100; // -1 to 1
    const options = this.getAllOptions();
    
    for (let i = 0; i < output.data.length; i += 4) {
      if (options.preserveColors) {
        // Preserve color relationships
        const r = output.data[i];
        const g = output.data[i + 1];
        const b = output.data[i + 2];
        
        // Convert to HSL
        const hsl = this.rgbToHsl(r, g, b);
        
        // Adjust lightness
        hsl.l = Math.max(0, Math.min(1, hsl.l + adjustment));
        
        // Convert back to RGB
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        
        output.data[i] = rgb.r;
        output.data[i + 1] = rgb.g;
        output.data[i + 2] = rgb.b;
      } else {
        // Simple brightness adjustment
        const factor = adjustment > 0 ? 1 + adjustment : 1 / (1 - adjustment);
        
        output.data[i] = Math.max(0, Math.min(255, output.data[i] * factor));
        output.data[i + 1] = Math.max(0, Math.min(255, output.data[i + 1] * factor));
        output.data[i + 2] = Math.max(0, Math.min(255, output.data[i + 2] * factor));
      }
      // Alpha channel unchanged
    }
    
    return output;
  }
  
  protected showAdjustmentUI(): void {
    this.adjustmentSlider = new AdjustmentSlider({
      title: 'Brightness',
      min: -100,
      max: 100,
      default: 0,
      unit: '%',
      onChange: (value) => {
        this.applyAdjustment(value);
      },
      onCommit: (value) => {
        this.commitAdjustment(value);
      }
    });
    
    this.adjustmentSlider.show();
  }
  
  protected hideAdjustmentUI(): void {
    if (this.adjustmentSlider) {
      this.adjustmentSlider.hide();
      this.adjustmentSlider = null;
    }
  }
  
  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    if (max === min) {
      return { h: 0, s: 0, l };
    }
    
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    let h;
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        h = 0;
    }
    
    return { h, s, l };
  }
  
  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }
}

export const brightnessToolRegistration: ToolRegistration = {
  id: 'brightness',
  toolClass: BrightnessTool,
  metadata: {
    name: 'Brightness',
    description: 'Adjust image brightness',
    icon: 'brightness',
    shortcut: 'Shift+B',
    groupId: 'adjustment-group',
    order: 1
  }
};
```

### 2. Blur Tool

```typescript
// lib/editor/tools/filter/blurTool.ts
export class BlurTool extends FilterTool {
  constructor(dependencies: ToolDependencies) {
    super('blur', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      radius: {
        type: 'number',
        default: 5,
        min: 0,
        max: 100,
        label: 'Blur Radius'
      },
      type: {
        type: 'select',
        default: 'gaussian',
        options: [
          { value: 'gaussian', label: 'Gaussian Blur' },
          { value: 'box', label: 'Box Blur' },
          { value: 'motion', label: 'Motion Blur' },
          { value: 'radial', label: 'Radial Blur' },
          { value: 'lens', label: 'Lens Blur' }
        ],
        label: 'Blur Type'
      },
      quality: {
        type: 'select',
        default: 'high',
        options: [
          { value: 'low', label: 'Fast' },
          { value: 'medium', label: 'Balanced' },
          { value: 'high', label: 'High Quality' }
        ],
        label: 'Quality'
      }
    };
  }
  
  protected async initializeFilter(): Promise<void> {
    await this.filterEngine.initialize();
  }
  
  protected createFilterShader(): WebGLShader {
    const options = this.getAllOptions();
    
    switch (options.type) {
      case 'gaussian':
        return this.createGaussianBlurShader();
      case 'box':
        return this.createBoxBlurShader();
      case 'motion':
        return this.createMotionBlurShader();
      case 'radial':
        return this.createRadialBlurShader();
      case 'lens':
        return this.createLensBlurShader();
      default:
        return this.createGaussianBlurShader();
    }
  }
  
  private createGaussianBlurShader(): WebGLShader {
    return {
      vertex: `
        attribute vec2 position;
        attribute vec2 texCoord;
        varying vec2 vTexCoord;
        
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
          vTexCoord = texCoord;
        }
      `,
      fragment: `
        precision highp float;
        
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform float uRadius;
        uniform int uQuality;
        
        varying vec2 vTexCoord;
        
        float gaussian(float x, float sigma) {
          return exp(-(x * x) / (2.0 * sigma * sigma)) / (sqrt(2.0 * 3.14159265) * sigma);
        }
        
        void main() {
          vec2 texelSize = 1.0 / uResolution;
          vec4 color = vec4(0.0);
          float totalWeight = 0.0;
          
          float sigma = uRadius / 3.0;
          int samples = uQuality == 1 ? 5 : (uQuality == 2 ? 9 : 15);
          
          for (int x = -samples; x <= samples; x++) {
            for (int y = -samples; y <= samples; y++) {
              vec2 offset = vec2(float(x), float(y)) * texelSize * uRadius;
              float weight = gaussian(length(vec2(float(x), float(y))), sigma);
              
              color += texture2D(uTexture, vTexCoord + offset) * weight;
              totalWeight += weight;
            }
          }
          
          gl_FragColor = color / totalWeight;
        }
      `,
      uniforms: {
        uRadius: this.getAllOptions().radius,
        uQuality: this.getAllOptions().quality === 'low' ? 1 : 
                  this.getAllOptions().quality === 'medium' ? 2 : 3
      }
    };
  }
  
  private createMotionBlurShader(): WebGLShader {
    return {
      vertex: `
        attribute vec2 position;
        attribute vec2 texCoord;
        varying vec2 vTexCoord;
        
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
          vTexCoord = texCoord;
        }
      `,
      fragment: `
        precision highp float;
        
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform float uRadius;
        uniform vec2 uDirection;
        
        varying vec2 vTexCoord;
        
        void main() {
          vec2 texelSize = 1.0 / uResolution;
          vec4 color = vec4(0.0);
          
          int samples = 15;
          float step = uRadius / float(samples);
          
          for (int i = -samples; i <= samples; i++) {
            vec2 offset = uDirection * texelSize * float(i) * step;
            color += texture2D(uTexture, vTexCoord + offset);
          }
          
          gl_FragColor = color / float(samples * 2 + 1);
        }
      `,
      uniforms: {
        uRadius: this.getAllOptions().radius,
        uDirection: { x: 1.0, y: 0.0 } // Can be parameterized
      }
    };
  }
  
  protected showFilterOptions(): void {
    // Show filter-specific UI
    const ui = new FilterOptionsPanel({
      title: 'Blur Options',
      options: this.getOptionDefinitions(),
      values: this.getAllOptions(),
      onChange: async (options) => {
        // Update options
        Object.entries(options).forEach(([key, value]) => {
          this.setOption(key, value);
        });
        
        // Apply filter with new options
        await this.applyFilter(options);
      }
    });
    
    ui.show();
    
    this.registerCleanup(() => ui.hide());
  }
}

export const blurToolRegistration: ToolRegistration = {
  id: 'blur',
  toolClass: BlurTool,
  metadata: {
    name: 'Blur',
    description: 'Apply blur effects',
    icon: 'blur',
    shortcut: 'Shift+U',
    groupId: 'filter-group',
    order: 1
  }
};
```

### 3. Vintage Effects Tool

```typescript
// lib/editor/tools/filter/vintageEffectsTool.ts
export class VintageEffectsTool extends FilterTool {
  private presets: VintagePreset[] = [
    {
      id: 'sepia',
      name: 'Sepia',
      settings: {
        colorMatrix: [
          0.393, 0.769, 0.189, 0, 0,
          0.349, 0.686, 0.168, 0, 0,
          0.272, 0.534, 0.131, 0, 0,
          0, 0, 0, 1, 0
        ],
        vignette: 0.3,
        grain: 0.1
      }
    },
    {
      id: 'black-white',
      name: 'Black & White',
      settings: {
        colorMatrix: [
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0.299, 0.587, 0.114, 0, 0,
          0, 0, 0, 1, 0
        ],
        contrast: 1.2,
        grain: 0.15
      }
    },
    {
      id: 'polaroid',
      name: 'Polaroid',
      settings: {
        colorShift: { r: 1.1, g: 1.0, b: 0.9 },
        contrast: 1.1,
        brightness: 0.1,
        vignette: 0.4,
        border: true
      }
    },
    {
      id: 'film-negative',
      name: 'Film Negative',
      settings: {
        invert: true,
        colorShift: { r: 0.9, g: 1.1, b: 1.2 },
        grain: 0.2
      }
    }
  ];
  
  constructor(dependencies: ToolDependencies) {
    super('vintage-effects', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      preset: {
        type: 'select',
        default: 'sepia',
        options: this.presets.map(p => ({ value: p.id, label: p.name })),
        label: 'Vintage Effect'
      },
      intensity: {
        type: 'number',
        default: 100,
        min: 0,
        max: 100,
        label: 'Intensity %'
      },
      vignette: {
        type: 'number',
        default: 30,
        min: 0,
        max: 100,
        label: 'Vignette'
      },
      grain: {
        type: 'number',
        default: 20,
        min: 0,
        max: 100,
        label: 'Film Grain'
      },
      fadeColor: {
        type: 'color',
        default: '#F5DEB3',
        label: 'Fade Color'
      }
    };
  }
  
  protected async initializeFilter(): Promise<void> {
    await this.filterEngine.initialize();
  }
  
  protected createFilterShader(): WebGLShader {
    const options = this.getAllOptions();
    const preset = this.presets.find(p => p.id === options.preset) || this.presets[0];
    
    return {
      vertex: `
        attribute vec2 position;
        attribute vec2 texCoord;
        varying vec2 vTexCoord;
        
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
          vTexCoord = texCoord;
        }
      `,
      fragment: `
        precision highp float;
        
        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform float uIntensity;
        uniform float uVignette;
        uniform float uGrain;
        uniform vec3 uFadeColor;
        uniform mat4 uColorMatrix;
        uniform float uTime;
        
        varying vec2 vTexCoord;
        
        // Pseudo-random function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        // Film grain
        float grain(vec2 uv, float time) {
          return random(uv + time) * 2.0 - 1.0;
        }
        
        // Vignette effect
        float vignette(vec2 uv) {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(uv, center);
          return 1.0 - smoothstep(0.0, 0.7, dist);
        }
        
        void main() {
          vec4 color = texture2D(uTexture, vTexCoord);
          
          // Apply color matrix
          vec4 transformed = uColorMatrix * color;
          
          // Apply fade
          transformed.rgb = mix(transformed.rgb, uFadeColor, 0.1 * uIntensity);
          
          // Apply vignette
          float vignetteValue = vignette(vTexCoord);
          transformed.rgb *= mix(1.0, vignetteValue, uVignette);
          
          // Apply grain
          float grainValue = grain(vTexCoord, uTime) * uGrain * 0.1;
          transformed.rgb += vec3(grainValue);
          
          // Mix with original based on intensity
          gl_FragColor = mix(color, transformed, uIntensity);
        }
      `,
      uniforms: {
        uIntensity: options.intensity / 100,
        uVignette: options.vignette / 100,
        uGrain: options.grain / 100,
        uFadeColor: this.hexToRgb(options.fadeColor),
        uColorMatrix: preset.settings.colorMatrix || this.identityMatrix(),
        uTime: Date.now() / 1000
      }
    };
  }
  
  private identityMatrix(): number[] {
    return [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0
    ];
  }
  
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
  }
}

export const vintageEffectsToolRegistration: ToolRegistration = {
  id: 'vintage-effects',
  toolClass: VintageEffectsTool,
  metadata: {
    name: 'Vintage Effects',
    description: 'Apply vintage and retro effects',
    icon: 'vintage',
    shortcut: 'Shift+V',
    groupId: 'filter-group',
    order: 5
  }
};
```

## 🔌 Adapter Implementations

### Brightness Adapter

```typescript
// lib/ai/adapters/tools/BrightnessAdapter.ts
export class BrightnessAdapter extends UnifiedToolAdapter<BrightnessInput, BrightnessOutput> {
  readonly toolId = 'brightness';
  readonly aiName = 'adjustBrightness';
  readonly description = 'Adjust image brightness. Use terms like "brighter", "darker", "much brighter" or percentage values.';
  
  readonly inputSchema = z.object({
    adjustment: z.number().min(-100).max(100).describe('Brightness adjustment percentage'),
    preserveColors: z.boolean().optional().describe('Preserve color relationships')
  });
  
  async execute(params: BrightnessInput, context: CanvasContext): Promise<BrightnessOutput> {
    const imageObjects = this.requireImageSelection(context);
    
    // Activate brightness tool
    await this.dependencies.toolStore.activateTool('brightness');
    const tool = this.dependencies.toolStore.getActiveTool() as BrightnessTool;
    
    // Set options
    tool.setOption('adjustment', params.adjustment);
    if (params.preserveColors !== undefined) {
      tool.setOption('preserveColors', params.preserveColors);
    }
    
    // Apply adjustment
    await tool.commitAdjustment(params.adjustment);
    
    return {
      success: true,
      adjustedObjects: imageObjects.length,
      adjustmentApplied: params.adjustment
    };
  }
  
  private requireImageSelection(context: CanvasContext): CanvasObject[] {
    const imageObjects = context.targetObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length === 0) {
      throw new Error('No image objects selected for brightness adjustment');
    }
    
    return imageObjects;
  }
}
```

### Blur Adapter

```typescript
// lib/ai/adapters/tools/BlurAdapter.ts
export class BlurAdapter extends UnifiedToolAdapter<BlurInput, BlurOutput> {
  readonly toolId = 'blur';
  readonly aiName = 'applyBlur';
  readonly description = 'Apply blur effects to images. Specify blur type (gaussian, motion, radial) and intensity.';
  
  readonly inputSchema = z.object({
    radius: z.number().min(0).max(100).optional().describe('Blur radius in pixels'),
    type: z.enum(['gaussian', 'box', 'motion', 'radial', 'lens']).optional(),
    intensity: z.enum(['subtle', 'moderate', 'strong']).optional(),
    direction: z.object({
      x: z.number(),
      y: z.number()
    }).optional().describe('Direction for motion blur')
  });
  
  async execute(params: BlurInput, context: CanvasContext): Promise<BlurOutput> {
    const imageObjects = this.requireImageSelection(context);
    
    // Calculate radius from intensity if not specified
    const radius = params.radius ?? this.calculateRadiusFromIntensity(params.intensity);
    
    // Activate blur tool
    await this.dependencies.toolStore.activateTool('blur');
    const tool = this.dependencies.toolStore.getActiveTool() as BlurTool;
    
    // Set options
    tool.setOption('radius', radius);
    if (params.type) {
      tool.setOption('type', params.type);
    }
    
    // Apply filter
    await tool.applyFilter({
      radius,
      type: params.type || 'gaussian',
      direction: params.direction
    });
    
    return {
      success: true,
      blurredObjects: imageObjects.length,
      settings: {
        type: params.type || 'gaussian',
        radius
      }
    };
  }
  
  private calculateRadiusFromIntensity(intensity?: string): number {
    switch (intensity) {
      case 'subtle': return 3;
      case 'moderate': return 8;
      case 'strong': return 15;
      default: return 5;
    }
  }
}
```

### Filter Preset Adapter

```typescript
// lib/ai/adapters/tools/VintageEffectsAdapter.ts
export class VintageEffectsAdapter extends UnifiedToolAdapter<VintageInput, VintageOutput> {
  readonly toolId = 'vintage-effects';
  readonly aiName = 'applyVintageEffect';
  readonly description = 'Apply vintage and retro effects like sepia, black & white, polaroid, or film negative.';
  
  readonly inputSchema = z.object({
    effect: z.enum(['sepia', 'black-white', 'polaroid', 'film-negative']),
    intensity: z.number().min(0).max(100).optional(),
    vignette: z.boolean().optional(),
    grain: z.boolean().optional()
  });
  
  async execute(params: VintageInput, context: CanvasContext): Promise<VintageOutput> {
    const imageObjects = this.requireImageSelection(context);
    
    // Activate vintage effects tool
    await this.dependencies.toolStore.activateTool('vintage-effects');
    const tool = this.dependencies.toolStore.getActiveTool() as VintageEffectsTool;
    
    // Set preset
    tool.setOption('preset', params.effect);
    
    // Set intensity
    if (params.intensity !== undefined) {
      tool.setOption('intensity', params.intensity);
    }
    
    // Set additional options
    if (params.vignette !== undefined) {
      tool.setOption('vignette', params.vignette ? 30 : 0);
    }
    if (params.grain !== undefined) {
      tool.setOption('grain', params.grain ? 20 : 0);
    }
    
    // Apply effect
    await tool.applyFilter(tool.getAllOptions());
    
    return {
      success: true,
      processedObjects: imageObjects.length,
      effectApplied: params.effect,
      intensity: params.intensity || 100
    };
  }
}
```

## 📋 Implementation Checklist

### Brightness Tool
- [ ] Implement BrightnessTool class extending AdjustmentTool
- [ ] Add HSL color space conversion
- [ ] Support preserve colors mode
- [ ] Create real-time adjustment UI
- [ ] Implement preview system
- [ ] Add keyboard shortcuts for fine control
- [ ] Write comprehensive tests

### Contrast Tool
- [ ] Implement ContrastTool class extending AdjustmentTool
- [ ] Add contrast algorithms (linear, sigmoid)
- [ ] Support auto-contrast detection
- [ ] Create adjustment UI
- [ ] Write comprehensive tests

### Saturation Tool
- [ ] Implement SaturationTool class extending AdjustmentTool
- [ ] Add HSL-based saturation adjustment
- [ ] Support vibrance mode
- [ ] Create adjustment UI
- [ ] Write comprehensive tests

### Hue Tool
- [ ] Implement HueTool class extending AdjustmentTool
- [ ] Add hue rotation in HSL space
- [ ] Support selective color range
- [ ] Create color wheel UI
- [ ] Write comprehensive tests

### Exposure Tool
- [ ] Implement ExposureTool class extending AdjustmentTool
- [ ] Add exposure algorithms
- [ ] Support highlights/shadows separately
- [ ] Create adjustment UI
- [ ] Write comprehensive tests

### Blur Tool
- [ ] Implement BlurTool class extending FilterTool
- [ ] Create WebGL shaders for each blur type
- [ ] Optimize for performance
- [ ] Add quality settings
- [ ] Support directional blur
- [ ] Write comprehensive tests

### Sharpen Tool
- [ ] Implement SharpenTool class extending FilterTool
- [ ] Create unsharp mask algorithm
- [ ] Add edge detection
- [ ] Support radius and threshold
- [ ] Write comprehensive tests

### Grayscale Tool
- [ ] Implement GrayscaleTool class extending FilterTool
- [ ] Support multiple conversion methods
- [ ] Add channel mixer options
- [ ] Write comprehensive tests

### Invert Tool
- [ ] Implement InvertTool class extending FilterTool
- [ ] Support RGB and value inversion
- [ ] Add partial inversion
- [ ] Write comprehensive tests

### Vintage Effects Tool
- [ ] Implement VintageEffectsTool class
- [ ] Create preset effects
- [ ] Add customizable parameters
- [ ] Support effect combinations
- [ ] Write comprehensive tests

### Adapters
- [ ] Implement all adjustment adapters
- [ ] Implement all filter adapters
- [ ] Add natural language parsing
- [ ] Register all adapters
- [ ] Write adapter tests

## 🧪 Testing Requirements

Each tool must have:
1. Pixel accuracy tests
2. Performance benchmarks
3. WebGL compatibility tests
4. Memory usage tests
5. Preview/commit workflow tests
6. Batch processing tests

## 📚 Resources

- Foundation patterns: `docs/foundation.md`
- WebGL filters: `lib/editor/filters/WebGLFilterEngine.ts`
- Image processing: `lib/editor/image/ImageProcessor.ts`
- Adjustment UI: `lib/editor/ui/adjustments/`

---

Agent 4 is responsible for implementing these pixel manipulation and filter tools that enable professional image editing capabilities. Follow the patterns established in the foundation document and ensure all implementations maintain senior-level architecture standards.