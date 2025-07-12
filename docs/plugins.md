# FotoFun Plugin System: Comprehensive Implementation Guide

## Overview

FotoFun implements a **hybrid core + plugin architecture** that allows users to extend the application with custom tools, AI models, filters, and features. This system provides the foundation for a thriving ecosystem while maintaining core stability and performance.

**Philosophy**: Build the foundation now, grow the ecosystem strategically. Enable extensibility from day one without overengineering.

---

## 🎯 **Strategic Decision: Plugin Types**

### **Core Tools vs Plugin Tools**

| Tool Category | Core | Plugin | Examples | Reasoning |
|---------------|------|--------|----------|-----------|
| **Essential Canvas** | ✅ | ❌ | Frame, Move, Crop, Rotate | Fundamental to all workflows |
| **Basic Adjustments** | ✅ | ❌ | Brightness, Contrast, Saturation | Core editing needs |
| **Essential Selection** | ✅ | ❌ | Marquee Rect, Lasso | Basic selection tools |
| **Core AI** | ✅ | ❌ | Image Generation, Background Removal | Essential AI features |
| **Advanced Shapes** | ❌ | ✅ | Polygon, Star, Custom Paths | Power user features |
| **Advanced Filters** | ❌ | ✅ | Film Grain, Chromatic Aberration | Specialized effects |
| **Custom AI Models** | ❌ | ✅ | Anime Style, Custom Upscalers | Specialized AI capabilities |
| **Export Formats** | ❌ | ✅ | WebP, AVIF, Custom Formats | Extended format support |
| **UI Themes** | ❌ | ✅ | Dark Pro, Light Minimal | Visual customization |

### **Plugin Architecture Benefits**

#### **For Users:**
- ✅ **Customizable Experience** - Only install plugins they need
- ✅ **Performance** - Core app stays fast, plugins are optional
- ✅ **Community Features** - Access to community-created tools
- ✅ **Future-Proof** - Extensible without app updates

#### **For Developers:**
- ✅ **Revenue Opportunities** - Plugin marketplace potential
- ✅ **Community Engagement** - Developer ecosystem
- ✅ **Reduced Core Complexity** - Advanced features externalized
- ✅ **Innovation Platform** - Community can experiment

---

## 🏗️ **Plugin Types & Architecture**

### **1. Canvas Tool Plugins**
Extend the tool palette with new editing capabilities.

```typescript
interface CanvasToolPlugin extends BasePlugin {
  type: 'canvas-tool';
  category: 'shapes' | 'drawing' | 'selection' | 'transform' | 'custom';
  tools: CanvasTool[];
  
  // Integration points
  register(toolRegistry: ToolRegistry): void;
  unregister(toolRegistry: ToolRegistry): void;
  getUIComponents?(): React.ComponentType[];
}

// Example: Advanced Shape Tools Plugin
export class AdvancedShapesPlugin implements CanvasToolPlugin {
  manifest = {
    id: 'advanced-shapes',
    name: 'Advanced Shape Tools',
    version: '1.2.0',
    author: 'FotoFun Team',
    description: 'Professional shape tools including polygons, stars, and custom paths',
    type: 'canvas-tool',
    category: 'shapes',
    fotoFunVersion: '^1.0.0',
    permissions: ['canvas.create', 'canvas.modify', 'tools.register']
  };
  
  tools = [
    new PolygonTool({
      id: 'polygon',
      name: 'Polygon',
      icon: PolygonIcon,
      sides: { min: 3, max: 20, default: 6 },
      strokeOptions: true,
      fillOptions: true
    }),
    new StarTool({
      id: 'star',
      name: 'Star',
      icon: StarIcon,
      points: { min: 3, max: 20, default: 5 },
      innerRadius: { min: 0.1, max: 0.9, default: 0.4 }
    }),
    new HeartShapeTool({
      id: 'heart',
      name: 'Heart',
      icon: HeartIcon,
      style: ['classic', 'modern', 'geometric']
    }),
    new CustomPathTool({
      id: 'custom-path',
      name: 'Custom Path',
      icon: PathIcon,
      bezierControls: true,
      snapToGrid: true
    })
  ];
  
  register(toolRegistry: ToolRegistry) {
    this.tools.forEach(tool => {
      toolRegistry.register(tool, this.manifest.category);
    });
  }
  
  // Optional: Custom UI components for tool options
  getUIComponents() {
    return [
      ShapePresetsPanel,
      AdvancedStrokeOptions,
      GeometryCalculator
    ];
  }
}
```

### **2. AI Tool Plugins**
Add new AI models and capabilities to the AI chat system.

```typescript
interface AIToolPlugin extends BasePlugin {
  type: 'ai-tool';
  models: AIModelDefinition[];
  adapters: ToolAdapter[];
  
  // Integration points
  register(aiRegistry: AIToolRegistry): void;
  isAvailable(): Promise<boolean>;
  estimateCost?(modelId: string, params: unknown): Promise<number>;
}

// Example: Custom AI Models Plugin
export class CustomAIModelsPlugin implements AIToolPlugin {
  manifest = {
    id: 'custom-ai-models',
    name: 'Custom AI Models Pack',
    version: '2.1.0',
    author: 'AI Specialists',
    description: 'Specialized AI models for anime, architecture, and portrait enhancement',
    type: 'ai-tool',
    fotoFunVersion: '^1.0.0',
    permissions: ['ai.register', 'ai.execute', 'network.request']
  };
  
  models = [
    {
      id: 'anime-style-transfer',
      name: 'Anime Style Transfer',
      description: 'Transform photos into high-quality anime-style artwork',
      provider: 'replicate',
      modelId: 'user/anime-style:latest',
      category: 'style-transfer',
      cost: 0.05,
      parameters: z.object({
        image: z.string().describe('Input image URL'),
        style_strength: z.number().min(0).max(1).default(0.8)
          .describe('How strong the anime style should be applied'),
        preserve_face: z.boolean().default(true)
          .describe('Preserve facial features during transformation'),
        color_palette: z.enum(['vibrant', 'pastel', 'monochrome']).default('vibrant')
          .describe('Color palette for the anime style'),
        detail_level: z.enum(['low', 'medium', 'high']).default('high')
          .describe('Level of detail in the final artwork')
      }),
      outputSchema: z.object({
        imageUrl: z.string(),
        processingTime: z.number(),
        styleConfidence: z.number(),
        metadata: z.object({
          originalDimensions: z.object({ width: z.number(), height: z.number() }),
          finalDimensions: z.object({ width: z.number(), height: z.number() }),
          effectsApplied: z.array(z.string())
        })
      })
    },
    {
      id: 'architecture-enhancer',
      name: 'Architecture Photo Enhancer',
      description: 'Enhance architectural photography with professional corrections',
      provider: 'replicate',
      modelId: 'user/architecture-enhance:latest',
      category: 'enhancement',
      cost: 0.08,
      parameters: z.object({
        image: z.string(),
        perspective_correction: z.boolean().default(true),
        lighting_enhancement: z.boolean().default(true),
        detail_sharpening: z.number().min(0).max(2).default(1.2),
        color_temperature: z.enum(['auto', 'warm', 'cool', 'neutral']).default('auto')
      })
    },
    {
      id: 'portrait-professional',
      name: 'Professional Portrait Enhancement',
      description: 'Studio-quality portrait enhancement with skin smoothing and lighting',
      provider: 'replicate',
      modelId: 'user/portrait-pro:latest',
      category: 'enhancement',
      cost: 0.12,
      parameters: z.object({
        image: z.string(),
        skin_smoothing: z.number().min(0).max(1).default(0.3),
        eye_enhancement: z.boolean().default(true),
        teeth_whitening: z.boolean().default(false),
        lighting_adjustment: z.enum(['none', 'soft', 'dramatic']).default('soft'),
        background_blur: z.number().min(0).max(10).default(0)
      })
    }
  ];
  
  register(aiRegistry: AIToolRegistry) {
    this.models.forEach(model => {
      // Register the model
      aiRegistry.registerModel(model);
      
      // Create and register adapter
      const adapter = new CustomModelAdapter(model, {
        preprocessing: this.getPreprocessor(model.id),
        postprocessing: this.getPostprocessor(model.id),
        errorHandling: 'graceful',
        retryPolicy: { maxRetries: 3, backoffMs: 1000 }
      });
      
      aiRegistry.registerAdapter(adapter);
    });
  }
  
  async isAvailable(): Promise<boolean> {
    return !!(process.env.REPLICATE_API_KEY && process.env.CUSTOM_AI_API_KEY);
  }
  
  async estimateCost(modelId: string, params: unknown): Promise<number> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return 0;
    
    let cost = model.cost;
    
    // Adjust cost based on parameters
    if (modelId === 'portrait-professional' && (params as any).lighting_adjustment === 'dramatic') {
      cost *= 1.5; // More complex processing
    }
    
    return cost;
  }
  
  private getPreprocessor(modelId: string) {
    // Model-specific preprocessing logic
    switch (modelId) {
      case 'anime-style-transfer':
        return (params: any) => ({
          ...params,
          // Ensure image is properly formatted for anime model
          image: this.optimizeForAnime(params.image)
        });
      default:
        return (params: any) => params;
    }
  }
}
```

### **3. Filter Plugins**
Add advanced WebGL filters and image processing effects.

```typescript
interface FilterPlugin extends BasePlugin {
  type: 'filter';
  filters: WebGLFilter[];
  category: 'artistic' | 'correction' | 'creative' | 'vintage';
  
  register(filterEngine: WebGLFilterEngine): void;
  unregister(filterEngine: WebGLFilterEngine): void;
}

// Example: Professional Filter Pack
export class ProfessionalFiltersPlugin implements FilterPlugin {
  manifest = {
    id: 'professional-filters',
    name: 'Professional Filter Pack',
    version: '1.5.0',
    author: 'Filter Masters',
    description: 'Studio-quality filters for professional photo editing',
    type: 'filter',
    category: 'artistic',
    fotoFunVersion: '^1.0.0',
    permissions: ['canvas.modify', 'webgl.access']
  };
  
  filters = [
    new FilmGrainFilter({
      id: 'film-grain',
      name: 'Film Grain',
      description: 'Add authentic film grain texture',
      parameters: {
        intensity: { min: 0, max: 1, default: 0.3 },
        size: { min: 0.5, max: 3, default: 1.2 },
        type: { options: ['35mm', '16mm', 'medium-format'], default: '35mm' }
      },
      shaderCode: `
        // Custom WebGL shader for film grain
        precision mediump float;
        uniform sampler2D u_texture;
        uniform float u_intensity;
        uniform float u_size;
        varying vec2 v_texCoord;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          float grain = random(v_texCoord * u_size) * u_intensity;
          gl_FragColor = vec4(color.rgb + grain, color.a);
        }
      `
    }),
    
    new ChromaticAberrationFilter({
      id: 'chromatic-aberration',
      name: 'Chromatic Aberration',
      description: 'Add lens-like color fringing effects',
      parameters: {
        strength: { min: 0, max: 10, default: 2 },
        direction: { min: 0, max: 360, default: 0 },
        falloff: { min: 0, max: 1, default: 0.8 }
      }
    }),
    
    new VignetteFilter({
      id: 'professional-vignette',
      name: 'Professional Vignette',
      description: 'Subtle vignetting for professional look',
      parameters: {
        intensity: { min: 0, max: 1, default: 0.4 },
        size: { min: 0.1, max: 2, default: 0.8 },
        smoothness: { min: 0, max: 1, default: 0.6 },
        color: { type: 'color', default: '#000000' }
      }
    }),
    
    new LensFlareFilter({
      id: 'lens-flare',
      name: 'Lens Flare',
      description: 'Add realistic lens flare effects',
      parameters: {
        position: { type: 'point', default: { x: 0.7, y: 0.3 } },
        intensity: { min: 0, max: 2, default: 0.8 },
        color: { type: 'color', default: '#ffffff' },
        type: { options: ['sun', 'studio', 'neon'], default: 'sun' }
      }
    })
  ];
  
  register(filterEngine: WebGLFilterEngine) {
    this.filters.forEach(filter => {
      filterEngine.registerFilter(filter);
      
      // Add to filter menu
      filterEngine.addToCategory(filter, this.manifest.category);
    });
  }
}
```

### **4. Export Format Plugins**
Extend export capabilities with new formats and options.

```typescript
interface ExportPlugin extends BasePlugin {
  type: 'export-format';
  formats: ExportFormat[];
  
  register(exportManager: ExportManager): void;
  unregister(exportManager: ExportManager): void;
}

// Example: Advanced Export Formats
export class AdvancedExportPlugin implements ExportPlugin {
  manifest = {
    id: 'advanced-export',
    name: 'Advanced Export Formats',
    version: '1.3.0',
    author: 'Export Specialists',
    description: 'Professional export formats including WebP, AVIF, and custom presets',
    type: 'export-format',
    fotoFunVersion: '^1.0.0',
    permissions: ['canvas.read', 'file.write']
  };
  
  formats = [
    {
      id: 'webp-advanced',
      name: 'WebP (Advanced)',
      extension: '.webp',
      mimeType: 'image/webp',
      description: 'Next-generation image format with superior compression',
      options: {
        quality: {
          type: 'slider',
          label: 'Quality',
          min: 0,
          max: 100,
          default: 85,
          description: 'Image quality (0-100)'
        },
        lossless: {
          type: 'boolean',
          label: 'Lossless',
          default: false,
          description: 'Use lossless compression'
        },
        method: {
          type: 'select',
          label: 'Compression Method',
          options: [
            { value: 0, label: 'Fastest' },
            { value: 3, label: 'Balanced' },
            { value: 6, label: 'Best Quality' }
          ],
          default: 3
        },
        preset: {
          type: 'select',
          label: 'Preset',
          options: [
            { value: 'default', label: 'Default' },
            { value: 'photo', label: 'Photo' },
            { value: 'picture', label: 'Picture' },
            { value: 'drawing', label: 'Drawing' },
            { value: 'icon', label: 'Icon' },
            { value: 'text', label: 'Text' }
          ],
          default: 'photo'
        }
      },
      export: async (canvas: HTMLCanvasElement, options: WebPOptions) => {
        // Advanced WebP export implementation
        return await this.exportWebP(canvas, options);
      }
    },
    
    {
      id: 'avif-ultra',
      name: 'AVIF (Ultra)',
      extension: '.avif',
      mimeType: 'image/avif',
      description: 'Ultra-modern format with best-in-class compression',
      options: {
        quality: { type: 'slider', min: 0, max: 100, default: 60 },
        speed: {
          type: 'select',
          options: [
            { value: 0, label: 'Slowest (Best Quality)' },
            { value: 4, label: 'Balanced' },
            { value: 8, label: 'Fastest' }
          ],
          default: 4
        },
        chroma: {
          type: 'select',
          label: 'Chroma Subsampling',
          options: [
            { value: '444', label: '4:4:4 (Best Quality)' },
            { value: '422', label: '4:2:2 (Good Quality)' },
            { value: '420', label: '4:2:0 (Smaller Size)' }
          ],
          default: '420'
        }
      },
      export: async (canvas: HTMLCanvasElement, options: AVIFOptions) => {
        return await this.exportAVIF(canvas, options);
      }
    },
    
    {
      id: 'pdf-portfolio',
      name: 'PDF Portfolio',
      extension: '.pdf',
      mimeType: 'application/pdf',
      description: 'Multi-page PDF with metadata and print optimization',
      options: {
        pageSize: {
          type: 'select',
          options: [
            { value: 'A4', label: 'A4 (210×297mm)' },
            { value: 'Letter', label: 'Letter (8.5×11")' },
            { value: 'A3', label: 'A3 (297×420mm)' },
            { value: 'custom', label: 'Custom Size' }
          ],
          default: 'A4'
        },
        dpi: {
          type: 'select',
          options: [
            { value: 72, label: '72 DPI (Web)' },
            { value: 150, label: '150 DPI (Draft Print)' },
            { value: 300, label: '300 DPI (Print Quality)' },
            { value: 600, label: '600 DPI (High Quality)' }
          ],
          default: 300
        },
        metadata: {
          type: 'object',
          properties: {
            title: { type: 'string', default: 'FotoFun Export' },
            author: { type: 'string', default: '' },
            subject: { type: 'string', default: '' },
            keywords: { type: 'string', default: '' }
          }
        }
      },
      export: async (canvas: HTMLCanvasElement, options: PDFOptions) => {
        return await this.exportPDF(canvas, options);
      }
    }
  ];
  
  private async exportWebP(canvas: HTMLCanvasElement, options: WebPOptions): Promise<Blob> {
    // Implementation using advanced WebP encoding
    // This would use a WebAssembly encoder for better control
    const encoder = await this.getWebPEncoder();
    return encoder.encode(canvas, options);
  }
  
  private async exportAVIF(canvas: HTMLCanvasElement, options: AVIFOptions): Promise<Blob> {
    // Implementation using AVIF encoder
    const encoder = await this.getAVIFEncoder();
    return encoder.encode(canvas, options);
  }
  
  private async exportPDF(canvas: HTMLCanvasElement, options: PDFOptions): Promise<Blob> {
    // Implementation using PDF library (e.g., jsPDF with advanced features)
    const pdf = await this.createPDF(options);
    pdf.addImage(canvas, options);
    return pdf.output('blob');
  }
}
```

### **5. Theme Plugins**
Customize the UI with professional themes and styling.

```typescript
interface ThemePlugin extends BasePlugin {
  type: 'theme';
  themes: ThemeDefinition[];
  
  register(themeManager: ThemeManager): void;
  unregister(themeManager: ThemeManager): void;
}

// Example: Professional Theme Pack
export class ProfessionalThemesPlugin implements ThemePlugin {
  manifest = {
    id: 'professional-themes',
    name: 'Professional Theme Pack',
    version: '1.1.0',
    author: 'Design Studio',
    description: 'Professional themes for different creative workflows',
    type: 'theme',
    fotoFunVersion: '^1.0.0',
    permissions: ['ui.modify']
  };
  
  themes = [
    {
      id: 'dark-professional',
      name: 'Dark Professional',
      description: 'High-contrast dark theme for professional work',
      preview: '/themes/dark-professional-preview.png',
      variables: {
        '--background': '#0a0a0a',
        '--foreground': '#fafafa',
        '--card': '#111111',
        '--card-foreground': '#fafafa',
        '--primary': '#3b82f6',
        '--primary-foreground': '#ffffff',
        '--secondary': '#1f2937',
        '--secondary-foreground': '#d1d5db',
        '--muted': '#1f2937',
        '--muted-foreground': '#9ca3af',
        '--accent': '#1f2937',
        '--accent-foreground': '#f3f4f6',
        '--destructive': '#ef4444',
        '--destructive-foreground': '#ffffff',
        '--border': '#374151',
        '--input': '#1f2937',
        '--ring': '#3b82f6',
        '--radius': '0.5rem'
      },
      customCSS: `
        .tool-palette {
          background: linear-gradient(135deg, #111111, #1a1a1a);
          border-right: 1px solid #374151;
        }
        
        .canvas-container {
          background: #0a0a0a;
        }
        
        .panel {
          background: rgba(17, 17, 17, 0.95);
          backdrop-filter: blur(10px);
        }
      `
    },
    
    {
      id: 'light-minimal',
      name: 'Light Minimal',
      description: 'Clean, minimal light theme for focused work',
      variables: {
        '--background': '#ffffff',
        '--foreground': '#171717',
        '--card': '#ffffff',
        '--card-foreground': '#171717',
        '--primary': '#059669',
        '--primary-foreground': '#ffffff',
        '--secondary': '#f5f5f5',
        '--secondary-foreground': '#171717',
        '--muted': '#f5f5f5',
        '--muted-foreground': '#737373',
        '--accent': '#f5f5f5',
        '--accent-foreground': '#171717',
        '--destructive': '#dc2626',
        '--destructive-foreground': '#ffffff',
        '--border': '#e5e5e5',
        '--input': '#ffffff',
        '--ring': '#059669',
        '--radius': '0.375rem'
      }
    },
    
    {
      id: 'creative-vibrant',
      name: 'Creative Vibrant',
      description: 'Colorful theme for creative and artistic work',
      variables: {
        '--background': '#fef7ff',
        '--foreground': '#1a1a1a',
        '--primary': '#8b5cf6',
        '--secondary': '#f3e8ff',
        '--accent': '#ec4899',
        // ... more vibrant color scheme
      },
      customCSS: `
        .tool-palette {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
        }
        
        .active-tool {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }
      `
    }
  ];
  
  register(themeManager: ThemeManager) {
    this.themes.forEach(theme => {
      themeManager.registerTheme(theme);
    });
  }
}
```

---

## 🔧 **Plugin System Implementation**

### **Core Plugin Manager**

```typescript
// lib/plugins/PluginManager.ts
export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private registries: PluginRegistries;
  private validator: PluginValidator;
  private loader: PluginLoader;
  
  constructor(
    private serviceContainer: ServiceContainer,
    private eventBus: TypedEventBus
  ) {
    this.registries = {
      tools: serviceContainer.get('ToolRegistry'),
      ai: serviceContainer.get('AIToolRegistry'),
      filters: serviceContainer.get('FilterEngine'),
      export: serviceContainer.get('ExportManager'),
      themes: serviceContainer.get('ThemeManager')
    };
    
    this.validator = new PluginValidator();
    this.loader = new PluginLoader();
  }
  
  async loadPlugin(source: string, options: LoadOptions = {}): Promise<LoadResult> {
    try {
      console.log(`[PluginManager] Loading plugin from: ${source}`);
      
      // Determine source type (npm, git, local)
      const sourceType = this.detectSourceType(source);
      
      // Load plugin manifest and code
      const { manifest, code, path } = await this.loader.load(source, sourceType);
      
      // Validate plugin
      const validation = await this.validator.validate(manifest, code);
      if (!validation.valid && !options.force) {
        throw new Error(`Plugin validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
      }
      
      // Check for conflicts
      await this.checkConflicts(manifest);
      
      // Load and instantiate plugin
      const plugin = await this.instantiatePlugin(code, manifest, path);
      
      // Register with appropriate registries
      await this.registerPlugin(plugin);
      
      // Track loaded plugin
      this.plugins.set(manifest.id, {
        manifest,
        plugin,
        loaded: true,
        path,
        loadedAt: new Date(),
        source: sourceType
      });
      
      // Emit success event
      this.eventBus.emit('plugin.loaded', {
        pluginId: manifest.id,
        manifest,
        source
      });
      
      console.log(`[PluginManager] Successfully loaded plugin: ${manifest.name} v${manifest.version}`);
      
      return {
        success: true,
        plugin: manifest,
        warnings: validation.issues.filter(i => i.type === 'warning')
      };
      
    } catch (error) {
      console.error(`[PluginManager] Failed to load plugin from ${source}:`, error);
      
      this.eventBus.emit('plugin.loadError', {
        source,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const loadedPlugin = this.plugins.get(pluginId);
    if (!loadedPlugin) {
      console.warn(`[PluginManager] Plugin ${pluginId} not found`);
      return false;
    }
    
    try {
      console.log(`[PluginManager] Unloading plugin: ${pluginId}`);
      
      // Unregister from all registries
      await this.unregisterPlugin(loadedPlugin.plugin);
      
      // Cleanup plugin resources
      if (loadedPlugin.plugin.cleanup) {
        await loadedPlugin.plugin.cleanup();
      }
      
      // Remove from tracking
      this.plugins.delete(pluginId);
      
      // Emit unload event
      this.eventBus.emit('plugin.unloaded', { pluginId });
      
      console.log(`[PluginManager] Successfully unloaded plugin: ${pluginId}`);
      return true;
      
    } catch (error) {
      console.error(`[PluginManager] Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }
  
  async reloadPlugin(pluginId: string): Promise<LoadResult> {
    const loadedPlugin = this.plugins.get(pluginId);
    if (!loadedPlugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    // Unload current version
    await this.unloadPlugin(pluginId);
    
    // Reload from original source
    return await this.loadPlugin(loadedPlugin.path);
  }
  
  // Auto-discovery for development and installed packages
  async discoverPlugins(): Promise<DiscoveryResult> {
    const discovered: PluginManifest[] = [];
    const errors: string[] = [];
    
    const searchPaths = [
      './plugins',                    // Local development
      './node_modules/@foto-fun',     // Official plugins
      './node_modules',               // Third-party plugins
      process.env.FOTO_FUN_PLUGIN_PATH // Custom path
    ].filter(Boolean);
    
    for (const searchPath of searchPaths) {
      try {
        const plugins = await this.scanDirectory(searchPath);
        discovered.push(...plugins);
      } catch (error) {
        errors.push(`Failed to scan ${searchPath}: ${error.message}`);
      }
    }
    
    return { discovered, errors };
  }
  
  // Plugin management
  getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  isPluginLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }
  
  // Development helpers
  async enableDevMode(pluginPath: string): Promise<void> {
    // Watch for file changes and auto-reload
    const watcher = this.createFileWatcher(pluginPath);
    
    watcher.on('change', async () => {
      console.log(`[PluginManager] Plugin files changed, reloading: ${pluginPath}`);
      try {
        await this.reloadPlugin(path.basename(pluginPath));
      } catch (error) {
        console.error(`[PluginManager] Hot reload failed:`, error);
      }
    });
  }
  
  private detectSourceType(source: string): PluginSourceType {
    if (source.startsWith('http') || source.includes('github.com')) {
      return 'git';
    } else if (source.startsWith('@') || source.includes('/')) {
      return 'npm';
    } else {
      return 'local';
    }
  }
  
  private async registerPlugin(plugin: BasePlugin): Promise<void> {
    switch (plugin.manifest.type) {
      case 'canvas-tool':
        await (plugin as CanvasToolPlugin).register(this.registries.tools);
        break;
      case 'ai-tool':
        await (plugin as AIToolPlugin).register(this.registries.ai);
        break;
      case 'filter':
        await (plugin as FilterPlugin).register(this.registries.filters);
        break;
      case 'export-format':
        await (plugin as ExportPlugin).register(this.registries.export);
        break;
      case 'theme':
        await (plugin as ThemePlugin).register(this.registries.themes);
        break;
      default:
        throw new Error(`Unknown plugin type: ${plugin.manifest.type}`);
    }
  }
  
  private async unregisterPlugin(plugin: BasePlugin): Promise<void> {
    switch (plugin.manifest.type) {
      case 'canvas-tool':
        await (plugin as CanvasToolPlugin).unregister(this.registries.tools);
        break;
      case 'ai-tool':
        await (plugin as AIToolPlugin).unregister?.(this.registries.ai);
        break;
      case 'filter':
        await (plugin as FilterPlugin).unregister(this.registries.filters);
        break;
      case 'export-format':
        await (plugin as ExportPlugin).unregister(this.registries.export);
        break;
      case 'theme':
        await (plugin as ThemePlugin).unregister(this.registries.themes);
        break;
    }
  }
}
```

### **Plugin CLI Tool**

```typescript
// bin/foto-fun-plugin.ts
#!/usr/bin/env node

import { Command } from 'commander';
import { PluginCLI } from '../lib/plugins/cli/PluginCLI';

const program = new Command();
const cli = new PluginCLI();

program
  .name('foto-fun')
  .description('FotoFun Plugin Management CLI')
  .version('1.0.0');

// Plugin management commands
program
  .command('plugin')
  .description('Plugin management commands')
  .addCommand(
    new Command('install')
      .description('Install a plugin')
      .argument('<source>', 'Plugin source (npm package, git repo, or local path)')
      .option('--force', 'Force installation even if validation fails')
      .option('--dev', 'Install in development mode with hot reload')
      .action(async (source, options) => {
        await cli.install(source, options);
      })
  )
  .addCommand(
    new Command('uninstall')
      .description('Uninstall a plugin')
      .argument('<plugin-id>', 'Plugin ID to uninstall')
      .action(async (pluginId) => {
        await cli.uninstall(pluginId);
      })
  )
  .addCommand(
    new Command('list')
      .description('List installed plugins')
      .option('--all', 'Show all plugins including disabled')
      .action(async (options) => {
        await cli.list(options);
      })
  )
  .addCommand(
    new Command('enable')
      .description('Enable a plugin')
      .argument('<plugin-id>', 'Plugin ID to enable')
      .action(async (pluginId) => {
        await cli.enable(pluginId);
      })
  )
  .addCommand(
    new Command('disable')
      .description('Disable a plugin')
      .argument('<plugin-id>', 'Plugin ID to disable')
      .action(async (pluginId) => {
        await cli.disable(pluginId);
      })
  )
  .addCommand(
    new Command('info')
      .description('Show plugin information')
      .argument('<plugin-id>', 'Plugin ID to show info for')
      .action(async (pluginId) => {
        await cli.info(pluginId);
      })
  );

// Development commands
program
  .command('create')
  .description('Create a new plugin')
  .argument('<plugin-name>', 'Name for the new plugin')
  .option('--type <type>', 'Plugin type (canvas-tool, ai-tool, filter, export-format, theme)', 'canvas-tool')
  .option('--template <template>', 'Template to use', 'basic')
  .action(async (pluginName, options) => {
    await cli.create(pluginName, options);
  });

program
  .command('dev')
  .description('Start development mode for a plugin')
  .argument('<plugin-path>', 'Path to plugin directory')
  .option('--watch', 'Watch for file changes and auto-reload', true)
  .action(async (pluginPath, options) => {
    await cli.dev(pluginPath, options);
  });

program
  .command('build')
  .description('Build a plugin for distribution')
  .argument('<plugin-path>', 'Path to plugin directory')
  .option('--output <dir>', 'Output directory', 'dist')
  .option('--minify', 'Minify the output')
  .action(async (pluginPath, options) => {
    await cli.build(pluginPath, options);
  });

program
  .command('test')
  .description('Test a plugin')
  .argument('<plugin-path>', 'Path to plugin directory')
  .option('--coverage', 'Generate coverage report')
  .action(async (pluginPath, options) => {
    await cli.test(pluginPath, options);
  });

program
  .command('publish')
  .description('Publish a plugin to npm')
  .argument('<plugin-path>', 'Path to plugin directory')
  .option('--tag <tag>', 'NPM tag to publish under', 'latest')
  .option('--dry-run', 'Perform a dry run without actually publishing')
  .action(async (pluginPath, options) => {
    await cli.publish(pluginPath, options);
  });

// Examples and help
program
  .command('examples')
  .description('Show plugin usage examples')
  .action(() => {
    console.log(`
FotoFun Plugin Examples:

# Install plugins
foto-fun plugin install @foto-fun/advanced-shapes
foto-fun plugin install https://github.com/user/my-plugin.git
foto-fun plugin install ./my-local-plugin

# Create new plugin
foto-fun create my-shape-tool --type=canvas-tool
foto-fun create my-ai-models --type=ai-tool

# Development workflow
foto-fun dev ./my-plugin          # Start dev mode with hot reload
foto-fun build ./my-plugin        # Build for distribution
foto-fun test ./my-plugin         # Run tests
foto-fun publish ./my-plugin      # Publish to npm

# Plugin management
foto-fun plugin list              # List all plugins
foto-fun plugin info my-plugin    # Show plugin details
foto-fun plugin enable my-plugin  # Enable plugin
foto-fun plugin disable my-plugin # Disable plugin
    `);
  });

program.parse();
```

---

## 📦 **Distribution & Packaging**

### **NPM Package Structure (Recommended)**

```
@foto-fun/plugin-advanced-shapes/
├── package.json                 # NPM package metadata
├── foto-fun-plugin.json         # Plugin manifest
├── dist/                        # Built plugin code
│   ├── index.js                # Main entry point
│   ├── index.d.ts              # TypeScript definitions
│   ├── tools/                  # Tool implementations
│   │   ├── PolygonTool.js
│   │   ├── StarTool.js
│   │   └── CustomPathTool.js
│   └── ui/                     # UI components (optional)
│       ├── ShapeOptions.js
│       └── GeometryCalculator.js
├── src/                        # Source code
│   ├── index.ts
│   ├── tools/
│   │   ├── PolygonTool.ts
│   │   ├── StarTool.ts
│   │   └── CustomPathTool.ts
│   └── ui/
│       ├── ShapeOptions.tsx
│       └── GeometryCalculator.tsx
├── assets/                     # Plugin assets
│   ├── icons/
│   ├── presets/
│   └── examples/
├── tests/                      # Test files
│   ├── tools/
│   └── integration/
├── docs/                       # Documentation
│   ├── README.md
│   ├── API.md
│   └── examples/
├── README.md                   # Main documentation
├── LICENSE                     # License file
├── CHANGELOG.md               # Version history
└── .fotofunrc                 # Plugin configuration
```

**package.json:**
```json
{
  "name": "@foto-fun/plugin-advanced-shapes",
  "version": "1.2.0",
  "description": "Professional shape tools for FotoFun including polygons, stars, and custom paths",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "foto-fun-plugin.json",
    "assets/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "foto-fun",
    "plugin",
    "shapes",
    "tools",
    "polygon",
    "star",
    "design"
  ],
  "author": "FotoFun Team <team@fotofun.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/foto-fun/plugin-advanced-shapes.git"
  },
  "bugs": {
    "url": "https://github.com/foto-fun/plugin-advanced-shapes/issues"
  },
  "homepage": "https://github.com/foto-fun/plugin-advanced-shapes#readme",
  "peerDependencies": {
    "foto-fun": "^1.0.0"
  },
  "devDependencies": {
    "@foto-fun/plugin-sdk": "^1.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "rollup": "^3.0.0"
  },
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "test": "jest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test"
  },
  "foto-fun": {
    "plugin": true,
    "manifest": "./foto-fun-plugin.json",
    "sdk-version": "^1.0.0"
  }
}
```

**foto-fun-plugin.json:**
```json
{
  "id": "advanced-shapes",
  "name": "Advanced Shape Tools",
  "version": "1.2.0",
  "author": "FotoFun Team",
  "description": "Professional shape tools including polygons, stars, and custom paths with advanced styling options",
  "type": "canvas-tool",
  "category": "shapes",
  "fotoFunVersion": "^1.0.0",
  "main": "dist/index.js",
  "permissions": [
    "canvas.create",
    "canvas.modify",
    "tools.register",
    "ui.extend"
  ],
  "dependencies": [],
  "optionalDependencies": [
    "@foto-fun/plugin-advanced-export"
  ],
  "repository": "https://github.com/foto-fun/plugin-advanced-shapes",
  "license": "MIT",
  "tags": [
    "shapes",
    "polygon",
    "star",
    "geometry",
    "professional"
  ],
  "preview": {
    "images": [
      "assets/preview/polygon-demo.png",
      "assets/preview/star-demo.png",
      "assets/preview/custom-path-demo.png"
    ],
    "video": "assets/preview/demo-video.mp4"
  },
  "documentation": {
    "readme": "README.md",
    "api": "docs/API.md",
    "examples": "docs/examples/"
  },
  "compatibility": {
    "platforms": ["web", "electron"],
    "browsers": ["chrome", "firefox", "safari", "edge"],
    "node": ">=16.0.0"
  },
  "performance": {
    "memoryUsage": "low",
    "cpuUsage": "low",
    "loadTime": "fast"
  }
}
```

---

## ⏰ **Implementation Timeline**

### **Phase 1: Foundation (Weeks 1-4) - BEFORE Cloud/Self-Hosted**

#### **Week 1: Core Architecture**
- [ ] **Plugin Manager** - Core loading/unloading system
- [ ] **Base Plugin Interfaces** - Define all plugin types
- [ ] **Service Container Integration** - Plugin registry support
- [ ] **Manifest System** - Plugin metadata validation

#### **Week 2: Tool Registry & CLI**
- [ ] **Tool Registry** - Dynamic tool registration
- [ ] **Plugin CLI** - Basic commands (install, list, create)
- [ ] **Plugin Validator** - Security and compatibility checks
- [ ] **Plugin Loader** - NPM, Git, and local loading

#### **Week 3: Canvas Tool Plugins**
- [ ] **Canvas Tool Plugin Interface** - Tool palette integration
- [ ] **Example Plugin** - Advanced Shapes plugin
- [ ] **UI Integration** - Dynamic tool palette updates
- [ ] **Development Tools** - Plugin scaffolding templates

#### **Week 4: AI Tool Plugins**
- [ ] **AI Tool Plugin Interface** - AI chat integration
- [ ] **Model Registry** - Dynamic AI model registration
- [ ] **Example AI Plugin** - Custom Replicate models
- [ ] **Testing & Documentation** - Plugin development guide

### **Phase 2: Cloud/Self-Hosted Deployment (Weeks 5-8)**

#### **Week 5-6: Self-Hosted Packaging**
- [ ] **Package FotoFun** - Create distributable package
- [ ] **Plugin Auto-Discovery** - Scan installed plugins
- [ ] **Installation Scripts** - Setup with plugin support
- [ ] **Documentation** - Self-hosted plugin guide

#### **Week 7-8: Cloud Deployment**
- [ ] **Cloud Plugin Support** - Approved plugins only
- [ ] **Plugin Marketplace Foundation** - Basic infrastructure
- [ ] **Plugin Security** - Sandboxing and permissions
- [ ] **Plugin Analytics** - Usage tracking

### **Phase 3: Advanced Features (Weeks 9-12)**

#### **Week 9-10: Additional Plugin Types**
- [ ] **Filter Plugins** - WebGL filter system
- [ ] **Export Format Plugins** - Custom export formats
- [ ] **Theme Plugins** - UI customization
- [ ] **Hot Reload** - Development mode improvements

#### **Week 11-12: Ecosystem Features**
- [ ] **Plugin Dependencies** - Inter-plugin communication
- [ ] **Plugin Marketplace** - Full marketplace features
- [ ] **Plugin Certification** - Quality assurance process
- [ ] **Community Tools** - Plugin discovery and sharing

---

## 🎯 **Strategic Benefits**

### **Immediate Benefits (Phase 1)**
- ✅ **Extensibility from Day One** - Users can add custom tools
- ✅ **Developer Ecosystem** - Community can contribute
- ✅ **Competitive Advantage** - Unique extensibility in photo editing
- ✅ **Future-Proof Architecture** - Easy to add new features

### **Medium-Term Benefits (Phase 2-3)**
- ✅ **Revenue Opportunities** - Plugin marketplace
- ✅ **Reduced Development Burden** - Community creates features
- ✅ **User Retention** - Customizable experience
- ✅ **Market Differentiation** - Plugin ecosystem

### **Long-Term Benefits (6+ months)**
- ✅ **Platform Business Model** - Revenue from plugin sales
- ✅ **Community-Driven Growth** - Self-sustaining ecosystem
- ✅ **Enterprise Features** - Custom plugins for enterprise
- ✅ **Technology Leadership** - Advanced plugin architecture

---

## 📋 **Success Metrics**

### **Technical Metrics**
- ✅ Plugin loading time < 500ms
- ✅ Memory overhead < 10MB per plugin
- ✅ Zero breaking changes to core during plugin operations
- ✅ 100% TypeScript coverage for plugin APIs

### **Developer Experience Metrics**
- ✅ Plugin creation time < 30 minutes for simple tools
- ✅ Hot reload working in < 2 seconds
- ✅ Complete documentation and examples
- ✅ Plugin SDK with comprehensive TypeScript support

### **User Experience Metrics**
- ✅ Seamless plugin installation (1-click)
- ✅ No application restart required
- ✅ Plugin tools feel native to application
- ✅ Clear plugin management interface

### **Ecosystem Metrics**
- ✅ 5+ community plugins within 3 months
- ✅ 50+ plugin downloads per month
- ✅ Plugin marketplace readiness
- ✅ Revenue sharing model operational

---

## 🚀 **Recommendation: Implement BEFORE Cloud/Self-Hosted**

### **Why Before:**
1. **Foundation Impact** - Plugin architecture affects core service container
2. **Self-Hosted Value** - Plugins are major selling point for self-hosted
3. **Architecture Decisions** - Tool registration and service injection patterns
4. **Marketing Advantage** - "Extensible from day one" positioning

### **Implementation Priority:**
1. **Weeks 1-4**: Build plugin foundation
2. **Weeks 5-8**: Deploy cloud/self-hosted with plugin support
3. **Weeks 9-12**: Expand plugin ecosystem

This approach ensures FotoFun launches with extensibility as a core feature, differentiating it from competitors and providing immediate value to power users and developers.

The plugin system will be a **key competitive advantage** and **revenue driver** from launch, making it essential to implement before major deployment phases. 