# Agent 5: AI Tools and Adapters Implementation

## 🎯 Mission Overview

Agent 5 is responsible for implementing AI-powered tools and their adapters that leverage external AI services. These tools provide advanced capabilities like image generation, background removal, style transfer, and intelligent editing.

## 📋 Tools to Implement

### AI Generation Tools
1. **AI Image Generation** (`ai-image-generation`) - Generate images from text
2. **AI Variation** (`ai-variation`) - Create variations of existing images

### AI Enhancement Tools
1. **AI Background Removal** (`ai-background-removal`) - Remove backgrounds intelligently
2. **AI Face Enhancement** (`ai-face-enhancement`) - Enhance facial features
3. **AI Upscaling** (`ai-upscaling`) - Intelligent image upscaling
4. **AI Style Transfer** (`ai-style-transfer`) - Apply artistic styles

### AI Editing Tools
1. **AI Inpainting** (`ai-inpainting`) - Fill in missing parts intelligently
2. **AI Outpainting** (`ai-outpainting`) - Extend images beyond borders
3. **AI Object Removal** (`ai-object-removal`) - Remove objects seamlessly
4. **AI Relighting** (`ai-relighting`) - Change lighting conditions

### AI Selection Tools
1. **AI Semantic Selection** (`ai-semantic-selection`) - Select objects by description

### AI Creative Tools
1. **AI Prompt Brush** (`ai-prompt-brush`) - Paint with text prompts
2. **AI Style Transfer Brush** (`ai-style-transfer-brush`) - Apply styles locally
3. **AI Prompt Adjustment** (`ai-prompt-adjustment`) - Adjust images with prompts

### Utility Adapters (No UI Tools)
1. **Analyze Canvas Adapter** - Describe canvas contents
2. **Instruction Editing Adapter** - Edit with natural language
3. **Prompt Enhancement Adapter** - Improve AI prompts

## 🏗️ Implementation Guide

### Base Class for AI Tools

```typescript
// lib/editor/tools/base/AITool.ts
export abstract class AITool extends BaseTool {
  protected aiClient: AIClient;
  protected isProcessing: boolean = false;
  protected currentRequest: AbortController | null = null;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
    this.aiClient = dependencies.aiClient;
  }
  
  async onActivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Check AI service availability
    const isAvailable = await this.checkAIAvailability();
    if (!isAvailable) {
      this.showAIUnavailableMessage();
      this.switchToDefaultTool();
      return;
    }
    
    // Initialize AI-specific UI
    await this.initializeAIInterface();
    
    this.setState(ToolState.ACTIVE);
  }
  
  async onDeactivate(canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.DEACTIVATING);
    
    // Cancel any pending AI requests
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
    
    // Clean up AI interface
    await this.cleanupAIInterface();
    
    this.setState(ToolState.INACTIVE);
  }
  
  protected async executeAIOperation<T>(
    operation: () => Promise<T>,
    options: AIOperationOptions = {}
  ): Promise<T> {
    if (this.isProcessing) {
      throw new Error('Another AI operation is in progress');
    }
    
    this.isProcessing = true;
    this.setState(ToolState.WORKING);
    this.currentRequest = new AbortController();
    
    try {
      // Show progress
      this.showProgress(options.progressMessage || 'Processing...');
      
      // Execute with timeout and abort signal
      const result = await Promise.race([
        operation(),
        this.createTimeout(options.timeout || 30000)
      ]);
      
      return result as T;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Operation cancelled');
      }
      throw error;
    } finally {
      this.isProcessing = false;
      this.currentRequest = null;
      this.setState(ToolState.ACTIVE);
      this.hideProgress();
    }
  }
  
  protected abstract checkAIAvailability(): Promise<boolean>;
  protected abstract initializeAIInterface(): Promise<void>;
  protected abstract cleanupAIInterface(): Promise<void>;
  
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), ms);
    });
  }
}
```

## 🛠️ Tool Implementations

### 1. AI Image Generation Tool

```typescript
// lib/editor/tools/ai/aiImageGenerationTool.ts
export class AIImageGenerationTool extends AITool {
  private generationPanel: AIGenerationPanel | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('ai-image-generation', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      model: {
        type: 'select',
        default: 'stable-diffusion-xl',
        options: [
          { value: 'stable-diffusion-xl', label: 'Stable Diffusion XL' },
          { value: 'dall-e-3', label: 'DALL-E 3' },
          { value: 'midjourney', label: 'Midjourney' },
          { value: 'flux', label: 'Flux' }
        ],
        label: 'AI Model'
      },
      width: {
        type: 'select',
        default: '1024',
        options: [
          { value: '512', label: '512px' },
          { value: '768', label: '768px' },
          { value: '1024', label: '1024px' },
          { value: '1536', label: '1536px' }
        ],
        label: 'Width'
      },
      height: {
        type: 'select',
        default: '1024',
        options: [
          { value: '512', label: '512px' },
          { value: '768', label: '768px' },
          { value: '1024', label: '1024px' },
          { value: '1536', label: '1536px' }
        ],
        label: 'Height'
      },
      guidanceScale: {
        type: 'number',
        default: 7.5,
        min: 1,
        max: 20,
        step: 0.5,
        label: 'Guidance Scale'
      },
      steps: {
        type: 'number',
        default: 50,
        min: 20,
        max: 150,
        label: 'Inference Steps'
      },
      seed: {
        type: 'number',
        default: -1,
        min: -1,
        max: 2147483647,
        label: 'Seed (-1 for random)'
      }
    };
  }
  
  protected async checkAIAvailability(): Promise<boolean> {
    try {
      const models = await this.aiClient.getAvailableModels();
      return models.some(m => m.type === 'image-generation');
    } catch {
      return false;
    }
  }
  
  protected async initializeAIInterface(): Promise<void> {
    this.generationPanel = new AIGenerationPanel({
      title: 'AI Image Generation',
      onGenerate: async (prompt: string, negativePrompt?: string) => {
        await this.generateImage(prompt, negativePrompt);
      },
      onCancel: () => {
        if (this.currentRequest) {
          this.currentRequest.abort();
        }
      },
      features: {
        negativePrompt: true,
        promptEnhancement: true,
        history: true,
        variations: true
      }
    });
    
    this.generationPanel.show();
  }
  
  protected async cleanupAIInterface(): Promise<void> {
    if (this.generationPanel) {
      this.generationPanel.hide();
      this.generationPanel = null;
    }
  }
  
  private async generateImage(prompt: string, negativePrompt?: string): Promise<void> {
    const options = this.getAllOptions();
    
    await this.executeAIOperation(async () => {
      // Generate image
      const result = await this.aiClient.generateImage({
        prompt,
        negativePrompt,
        model: options.model,
        width: parseInt(options.width),
        height: parseInt(options.height),
        guidanceScale: options.guidanceScale,
        steps: options.steps,
        seed: options.seed === -1 ? undefined : options.seed,
        signal: this.currentRequest?.signal
      });
      
      // Create image object on canvas
      const imageData = await this.loadImageData(result.url);
      const position = this.getCenterPosition(imageData.width, imageData.height);
      
      // NOTE FOR EXECUTOR: This requires adding a `createAddObjectCommand` method to CommandFactory.ts
      const command = this.dependencies.commandFactory.createAddObjectCommand({
        type: 'image',
        name: `AI Generated - ${prompt.substring(0, 30)}...`,
        x: position.x,
        y: position.y,
        width: imageData.width,
        height: imageData.height,
        data: {
          imageData,
          source: 'ai-generated',
          metadata: {
            prompt,
            negativePrompt,
            model: options.model,
            seed: result.seed
          }
        }
      });
      
      await this.dependencies.commandManager.executeCommand(command);
      
      // Select the new image
      // NOTE FOR EXECUTOR: The command must expose the created object's ID after execution.
      const objectId = command.getCreatedObjectId();
      if (objectId) {
        await this.dependencies.selectionManager.selectObject(objectId);
      }
      
      // Save to history
      this.generationPanel?.addToHistory({
        prompt,
        negativePrompt,
        imageUrl: result.url,
        seed: result.seed,
        timestamp: Date.now()
      });
    }, {
      progressMessage: 'Generating image...',
      timeout: 60000 // 1 minute timeout for generation
    });
  }
  
  private async loadImageData(url: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      
      img.onerror = () => reject(new Error('Failed to load generated image'));
      img.src = url;
    });
  }
  
  private getCenterPosition(width: number, height: number): Point {
    const viewport = this.dependencies.canvasManager.getViewport();
    return {
      x: (viewport.width - width) / 2,
      y: (viewport.height - height) / 2
    };
  }
}

export const aiImageGenerationToolRegistration: ToolRegistration = {
  id: 'ai-image-generation',
  toolClass: AIImageGenerationTool,
  metadata: {
    name: 'AI Image Generation',
    description: 'Generate images from text prompts',
    icon: 'ai-generate',
    shortcut: 'Shift+G',
    groupId: 'ai-generation-group',
    order: 1
  }
};
```

### 2. AI Background Removal Tool

```typescript
// lib/editor/tools/ai/aiBackgroundRemovalTool.ts
export class AIBackgroundRemovalTool extends AITool {
  private removalOptions: BackgroundRemovalOptions | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('ai-background-removal', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      model: {
        type: 'select',
        default: 'rembg',
        options: [
          { value: 'rembg', label: 'RemBG (Fast)' },
          { value: 'u2net', label: 'U²-Net (Balanced)' },
          { value: 'isnet', label: 'IS-Net (High Quality)' },
          { value: 'sam', label: 'Segment Anything (Interactive)' }
        ],
        label: 'AI Model'
      },
      edgeRefinement: {
        type: 'select',
        default: 'medium',
        options: [
          { value: 'none', label: 'None' },
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' }
        ],
        label: 'Edge Refinement'
      },
      outputMode: {
        type: 'select',
        default: 'transparent',
        options: [
          { value: 'transparent', label: 'Transparent' },
          { value: 'white', label: 'White Background' },
          { value: 'black', label: 'Black Background' },
          { value: 'blur', label: 'Blurred Background' },
          { value: 'mask', label: 'Mask Only' }
        ],
        label: 'Output Mode'
      },
      featherRadius: {
        type: 'number',
        default: 1,
        min: 0,
        max: 10,
        label: 'Feather Radius'
      }
    };
  }
  
  protected async checkAIAvailability(): Promise<boolean> {
    try {
      const models = await this.aiClient.getAvailableModels();
      return models.some(m => m.type === 'background-removal');
    } catch {
      return false;
    }
  }
  
  protected async initializeAIInterface(): Promise<void> {
    // Get selected images
    const imageObjects = this.getImageObjects();
    if (imageObjects.length === 0) {
      this.showNoImageMessage();
      this.switchToDefaultTool();
      return;
    }
    
    // Show options panel
    this.removalOptions = new BackgroundRemovalOptions({
      options: this.getOptionDefinitions(),
      values: this.getAllOptions(),
      onApply: async () => {
        await this.removeBackground();
      },
      onPreview: async () => {
        await this.previewRemoval();
      }
    });
    
    this.removalOptions.show();
  }
  
  protected async cleanupAIInterface(): Promise<void> {
    if (this.removalOptions) {
      this.removalOptions.hide();
      this.removalOptions = null;
    }
  }
  
  private async removeBackground(): Promise<void> {
    const imageObjects = this.getImageObjects();
    const options = this.getAllOptions();
    
    await this.executeAIOperation(async () => {
      const commands: Command[] = [];
      
      for (const imageObject of imageObjects) {
        // Process image
        const result = await this.aiClient.removeBackground({
          imageData: imageObject.data.imageData,
          model: options.model,
          edgeRefinement: options.edgeRefinement,
          signal: this.currentRequest?.signal
        });
        
        // Apply output mode
        const processedData = await this.applyOutputMode(
          result.imageData,
          result.maskData,
          options
        );
        
        // Create command
        // NOTE FOR EXECUTOR: This requires adding a `createUpdateImageDataCommand` method to CommandFactory.ts
        commands.push(this.dependencies.commandFactory.createUpdateImageDataCommand(
          imageObject.id,
          processedData,
          imageObject.data.imageData
        ));
      }
      
      // Execute all commands
      if (commands.length > 0) {
        // NOTE FOR EXECUTOR: This requires adding a `createCompositeCommand` method to CommandFactory.ts
        const batchCommand = this.dependencies.commandFactory.createCompositeCommand(
          `Remove background from ${commands.length} images`,
          commands
        );
        await this.dependencies.commandManager.executeCommand(batchCommand);
      }
    }, {
      progressMessage: 'Removing background...',
      timeout: 30000
    });
  }
  
  private async applyOutputMode(
    imageData: ImageData,
    maskData: ImageData,
    options: Record<string, any>
  ): Promise<ImageData> {
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    switch (options.outputMode) {
      case 'transparent':
        // Apply mask as alpha channel
        for (let i = 0; i < output.data.length; i += 4) {
          output.data[i + 3] = maskData.data[i]; // Use red channel as alpha
        }
        break;
        
      case 'white':
      case 'black':
        const bgColor = options.outputMode === 'white' ? 255 : 0;
        for (let i = 0; i < output.data.length; i += 4) {
          const alpha = maskData.data[i] / 255;
          output.data[i] = output.data[i] * alpha + bgColor * (1 - alpha);
          output.data[i + 1] = output.data[i + 1] * alpha + bgColor * (1 - alpha);
          output.data[i + 2] = output.data[i + 2] * alpha + bgColor * (1 - alpha);
        }
        break;
        
      case 'blur':
        // Apply blur to background areas
        const blurred = await this.applyBackgroundBlur(imageData, maskData);
        return blurred;
        
      case 'mask':
        // Return mask as grayscale image
        for (let i = 0; i < output.data.length; i += 4) {
          const maskValue = maskData.data[i];
          output.data[i] = maskValue;
          output.data[i + 1] = maskValue;
          output.data[i + 2] = maskValue;
          output.data[i + 3] = 255;
        }
        break;
    }
    
    // Apply feathering if needed
    if (options.featherRadius > 0) {
      this.applyFeathering(output, maskData, options.featherRadius);
    }
    
    return output;
  }
}

export const aiBackgroundRemovalToolRegistration: ToolRegistration = {
  id: 'ai-background-removal',
  toolClass: AIBackgroundRemovalTool,
  metadata: {
    name: 'AI Background Removal',
    description: 'Remove backgrounds intelligently',
    icon: 'ai-remove-bg',
    shortcut: 'Shift+R',
    groupId: 'ai-enhancement-group',
    order: 1
  }
};
```

### 3. AI Style Transfer Tool

```typescript
// lib/editor/tools/ai/aiStyleTransferTool.ts
export class AIStyleTransferTool extends AITool {
  private stylePanel: StyleTransferPanel | null = null;
  private styleLibrary: StylePreset[] = [
    { id: 'monet', name: 'Monet', thumbnail: '/styles/monet.jpg' },
    { id: 'van-gogh', name: 'Van Gogh', thumbnail: '/styles/van-gogh.jpg' },
    { id: 'picasso', name: 'Picasso', thumbnail: '/styles/picasso.jpg' },
    { id: 'anime', name: 'Anime', thumbnail: '/styles/anime.jpg' },
    { id: 'watercolor', name: 'Watercolor', thumbnail: '/styles/watercolor.jpg' },
    { id: 'oil-painting', name: 'Oil Painting', thumbnail: '/styles/oil-painting.jpg' }
  ];
  
  constructor(dependencies: ToolDependencies) {
    super('ai-style-transfer', dependencies);
  }
  
  getOptionDefinitions(): Record<string, ToolOptionDefinition> {
    return {
      styleStrength: {
        type: 'number',
        default: 50,
        min: 0,
        max: 100,
        label: 'Style Strength %'
      },
      preserveColor: {
        type: 'boolean',
        default: false,
        label: 'Preserve Original Colors'
      },
      model: {
        type: 'select',
        default: 'fast-style-transfer',
        options: [
          { value: 'fast-style-transfer', label: 'Fast Style Transfer' },
          { value: 'neural-style', label: 'Neural Style (Slower)' },
          { value: 'arbitrary-style', label: 'Arbitrary Style Transfer' }
        ],
        label: 'AI Model'
      }
    };
  }
  
  protected async checkAIAvailability(): Promise<boolean> {
    try {
      const models = await this.aiClient.getAvailableModels();
      return models.some(m => m.type === 'style-transfer');
    } catch {
      return false;
    }
  }
  
  protected async initializeAIInterface(): Promise<void> {
    const imageObjects = this.getImageObjects();
    if (imageObjects.length === 0) {
      this.showNoImageMessage();
      this.switchToDefaultTool();
      return;
    }
    
    this.stylePanel = new StyleTransferPanel({
      styles: this.styleLibrary,
      options: this.getOptionDefinitions(),
      values: this.getAllOptions(),
      onStyleSelect: async (styleId: string) => {
        await this.applyStyle(styleId);
      },
      onCustomStyle: async (styleImage: ImageData) => {
        await this.applyCustomStyle(styleImage);
      }
    });
    
    this.stylePanel.show();
  }
  
  protected async cleanupAIInterface(): Promise<void> {
    if (this.stylePanel) {
      this.stylePanel.hide();
      this.stylePanel = null;
    }
  }
  
  private async applyStyle(styleId: string): Promise<void> {
    const imageObjects = this.getImageObjects();
    const options = this.getAllOptions();
    
    await this.executeAIOperation(async () => {
      const commands: Command[] = [];
      
      for (const imageObject of imageObjects) {
        // Apply style transfer
        const result = await this.aiClient.transferStyle({
          contentImage: imageObject.data.imageData,
          styleId,
          strength: options.styleStrength / 100,
          preserveColor: options.preserveColor,
          model: options.model,
          signal: this.currentRequest?.signal
        });
        
        // NOTE FOR EXECUTOR: This requires adding a `createUpdateImageDataCommand` method to CommandFactory.ts
        commands.push(this.dependencies.commandFactory.createUpdateImageDataCommand(
          imageObject.id,
          result.imageData,
          imageObject.data.imageData
        ));
      }
      
      if (commands.length > 0) {
        // NOTE FOR EXECUTOR: This requires adding a `createCompositeCommand` method to CommandFactory.ts
        const batchCommand = this.dependencies.commandFactory.createCompositeCommand(
          `Apply style to ${commands.length} images`,
          commands
        );
        await this.dependencies.commandManager.executeCommand(batchCommand);
      }
    }, {
      progressMessage: 'Applying style...',
      timeout: 45000
    });
  }
}

export const aiStyleTransferToolRegistration: ToolRegistration = {
  id: 'ai-style-transfer',
  toolClass: AIStyleTransferTool,
  metadata: {
    name: 'AI Style Transfer',
    description: 'Apply artistic styles to images',
    icon: 'ai-style',
    shortcut: 'Shift+S',
    groupId: 'ai-enhancement-group',
    order: 4
  }
};
```

## 🔌 Adapter Implementations

### Image Generation Adapter

```typescript
// lib/ai/adapters/ai/ImageGenerationAdapter.ts
export class ImageGenerationAdapter extends UnifiedToolAdapter<GenerationInput, GenerationOutput> {
  readonly toolId = 'ai-image-generation';
  readonly aiName = 'generateImage';
  readonly description = 'Generate images from text descriptions. Be creative and detailed in your prompts.';
  
  readonly inputSchema = z.object({
    prompt: z.string().describe('Detailed description of the image to generate'),
    negativePrompt: z.string().optional().describe('What to avoid in the image'),
    style: z.enum(['realistic', 'artistic', 'anime', 'digital-art', 'oil-painting']).optional(),
    quality: z.enum(['draft', 'normal', 'high']).optional(),
    aspectRatio: z.enum(['square', 'portrait', 'landscape', 'wide', 'tall']).optional()
  });
  
  async execute(params: GenerationInput, context: CanvasContext): Promise<GenerationOutput> {
    // Enhance prompt if style specified
    let enhancedPrompt = params.prompt;
    if (params.style) {
      enhancedPrompt = this.enhancePromptWithStyle(params.prompt, params.style);
    }
    
    // Determine dimensions from aspect ratio
    const dimensions = this.getDimensionsFromAspectRatio(
      params.aspectRatio || 'square',
      params.quality || 'normal'
    );
    
    // Activate tool
    await this.dependencies.toolStore.activateTool('ai-image-generation');
    const tool = this.dependencies.toolStore.getActiveTool() as AIImageGenerationTool;
    
    // Set quality options
    if (params.quality === 'high') {
      tool.setOption('steps', 100);
      tool.setOption('guidanceScale', 8);
    } else if (params.quality === 'draft') {
      tool.setOption('steps', 25);
      tool.setOption('guidanceScale', 5);
    }
    
    // Generate via tool
    await tool.generateImage(enhancedPrompt, params.negativePrompt);
    
    return {
      success: true,
      prompt: enhancedPrompt,
      dimensions
    };
  }
  
  private enhancePromptWithStyle(prompt: string, style: string): string {
    const styleEnhancements: Record<string, string> = {
      realistic: ', photorealistic, high detail, professional photography',
      artistic: ', artistic interpretation, creative style, painterly',
      anime: ', anime style, cel shaded, vibrant colors',
      'digital-art': ', digital art, concept art, highly detailed',
      'oil-painting': ', oil painting style, thick brushstrokes, classical art'
    };
    
    return prompt + (styleEnhancements[style] || '');
  }
  
  private getDimensionsFromAspectRatio(
    aspectRatio: string,
    quality: string
  ): { width: number; height: number } {
    const base = quality === 'high' ? 1536 : quality === 'draft' ? 512 : 1024;
    
    switch (aspectRatio) {
      case 'square': return { width: base, height: base };
      case 'portrait': return { width: base, height: Math.floor(base * 1.5) };
      case 'landscape': return { width: Math.floor(base * 1.5), height: base };
      case 'wide': return { width: Math.floor(base * 1.78), height: base };
      case 'tall': return { width: base, height: Math.floor(base * 1.78) };
      default: return { width: base, height: base };
    }
  }
}
```

### Background Removal Adapter

```typescript
// lib/ai/adapters/ai/ObjectRemovalAdapter.ts
export class ObjectRemovalAdapter extends UnifiedToolAdapter<RemovalInput, RemovalOutput> {
  readonly toolId = 'ai-background-removal';
  readonly aiName = 'removeBackground';
  readonly description = 'Remove backgrounds from images. Can also remove specific objects if described.';
  
  readonly inputSchema = z.object({
    target: z.enum(['background', 'foreground', 'object']).optional(),
    objectDescription: z.string().optional().describe('Description of object to remove'),
    fillMode: z.enum(['transparent', 'white', 'black', 'blur', 'content-aware']).optional()
  });
  
  async execute(params: RemovalInput, context: CanvasContext): Promise<RemovalOutput> {
    const imageObjects = this.requireImageSelection(context);
    
    // Activate appropriate tool
    if (params.target === 'object' && params.objectDescription) {
      // Use object removal tool for specific objects
      await this.dependencies.toolStore.activateTool('ai-object-removal');
      await this.removeSpecificObject(params.objectDescription, imageObjects);
    } else {
      // Use background removal for general background
      await this.dependencies.toolStore.activateTool('ai-background-removal');
      const tool = this.dependencies.toolStore.getActiveTool() as AIBackgroundRemovalTool;
      
      // Set output mode
      if (params.fillMode) {
        tool.setOption('outputMode', params.fillMode);
      }
      
      await tool.removeBackground();
    }
    
    return {
      success: true,
      processedObjects: imageObjects.length,
      removalType: params.target || 'background'
    };
  }
  
  private requireImageSelection(context: CanvasContext): CanvasObject[] {
    const imageObjects = context.targetObjects.filter(obj => obj.type === 'image');
    
    if (imageObjects.length === 0) {
      throw new Error('No image objects selected for background removal');
    }
    
    return imageObjects;
  }
}
```

### Utility Adapter: Analyze Canvas

```typescript
// lib/ai/adapters/utility/AnalyzeCanvasAdapter.ts
export class AnalyzeCanvasAdapter extends UnifiedToolAdapter<AnalyzeInput, AnalyzeOutput> {
  readonly toolId = 'canvas-analyzer';
  readonly aiName = 'analyzeCanvas';
  readonly description = 'Analyze and describe the current canvas contents, including objects, composition, and suggestions.';
  
  readonly inputSchema = z.object({
    detail: z.enum(['brief', 'detailed', 'technical']).optional(),
    focus: z.enum(['composition', 'colors', 'objects', 'quality', 'all']).optional()
  });
  
  async execute(params: AnalyzeInput, context: CanvasContext): Promise<AnalyzeOutput> {
    const analysis: CanvasAnalysis = {
      objectCount: context.objectCount,
      objects: [],
      composition: {},
      colors: {},
      suggestions: []
    };
    
    // Analyze objects
    for (const obj of context.targetObjects) {
      analysis.objects.push({
        type: obj.type,
        position: { x: obj.x, y: obj.y },
        size: { width: obj.width, height: obj.height },
        name: obj.name
      });
    }
    
    // Analyze composition
    if (params.focus === 'composition' || params.focus === 'all') {
      analysis.composition = this.analyzeComposition(context);
    }
    
    // Analyze colors (for images)
    if (params.focus === 'colors' || params.focus === 'all') {
      analysis.colors = await this.analyzeColors(context);
    }
    
    // Generate suggestions
    analysis.suggestions = this.generateSuggestions(analysis, context);
    
    // Format description based on detail level
    const description = this.formatAnalysis(analysis, params.detail || 'brief');
    
    return {
      success: true,
      description,
      analysis
    };
  }
  
  private analyzeComposition(context: CanvasContext): CompositionAnalysis {
    const objects = context.targetObjects;
    
    // Calculate center of mass
    let centerX = 0, centerY = 0;
    objects.forEach(obj => {
      centerX += obj.x + obj.width / 2;
      centerY += obj.y + obj.height / 2;
    });
    centerX /= objects.length;
    centerY /= objects.length;
    
    // Check rule of thirds
    const viewport = context.dimensions;
    const thirdLines = {
      vertical: [viewport.width / 3, viewport.width * 2 / 3],
      horizontal: [viewport.height / 3, viewport.height * 2 / 3]
    };
    
    return {
      centerOfMass: { x: centerX, y: centerY },
      balance: this.calculateBalance(objects, viewport),
      ruleOfThirds: this.checkRuleOfThirds(objects, thirdLines),
      whitespace: this.calculateWhitespace(objects, viewport)
    };
  }
  
  private generateSuggestions(
    analysis: CanvasAnalysis,
    context: CanvasContext
  ): string[] {
    const suggestions: string[] = [];
    
    // Composition suggestions
    if (analysis.composition.balance < 0.3) {
      suggestions.push('Consider rebalancing the composition by moving objects');
    }
    
    // Color suggestions
    if (analysis.colors.dominantColors?.length === 1) {
      suggestions.push('Add complementary colors for more visual interest');
    }
    
    // Object suggestions
    if (context.objectCount === 0) {
      suggestions.push('Start by adding an image or creating a frame');
    } else if (context.objectCount === 1) {
      suggestions.push('Add text or additional elements to complete the design');
    }
    
    return suggestions;
  }
}
```

### Instruction Editing Adapter

```typescript
// lib/ai/adapters/utility/InstructionEditingAdapter.ts
export class InstructionEditingAdapter extends UnifiedToolAdapter<InstructionInput, InstructionOutput> {
  readonly toolId = 'instruction-editor';
  readonly aiName = 'editWithInstructions';
  readonly description = 'Edit images using natural language instructions like "make it brighter", "add blur to background", "remove the person on the left".';
  
  readonly inputSchema = z.object({
    instruction: z.string().describe('Natural language editing instruction'),
    applyTo: z.enum(['selection', 'all', 'background', 'foreground']).optional()
  });
  
  async execute(params: InstructionInput, context: CanvasContext): Promise<InstructionOutput> {
    // Parse instruction to determine operations
    const operations = await this.parseInstruction(params.instruction);
    
    // Execute operations in sequence
    const results: OperationResult[] = [];
    
    for (const operation of operations) {
      const adapter = this.dependencies.adapterRegistry.getAdapter(operation.tool);
      if (adapter) {
        const result = await adapter.execute(operation.params, context);
        results.push({
          tool: operation.tool,
          success: result.success,
          details: result
        });
      }
    }
    
    return {
      success: results.every(r => r.success),
      operationsPerformed: results.length,
      results
    };
  }
  
  private async parseInstruction(instruction: string): Promise<ParsedOperation[]> {
    // Use AI to parse natural language into tool operations
    const parsing = await this.dependencies.aiClient.parseInstruction({
      instruction,
      availableTools: this.getAvailableTools()
    });
    
    return parsing.operations.map(op => ({
      tool: op.toolName,
      params: op.parameters,
      confidence: op.confidence
    }));
  }
  
  private getAvailableTools(): ToolDescription[] {
    return Array.from(this.dependencies.adapterRegistry.getAllAdapters()).map(adapter => ({
      name: adapter.aiName,
      description: adapter.description,
      parameters: adapter.inputSchema
    }));
  }
}
```

## 📋 Implementation Checklist

### AI Generation Tools
- [ ] Implement AIImageGenerationTool with multiple models
- [ ] Add prompt enhancement features
- [ ] Create generation history UI
- [ ] Support batch generation
- [ ] Add seed management
- [ ] Implement AIVariationTool
- [ ] Write comprehensive tests

### AI Enhancement Tools
- [ ] Implement AIBackgroundRemovalTool with edge refinement
- [ ] Add multiple output modes
- [ ] Implement AIFaceEnhancementTool with facial detection
- [ ] Create AIUpscalingTool with multiple algorithms
- [ ] Implement AIStyleTransferTool with style library
- [ ] Add custom style upload
- [ ] Write comprehensive tests

### AI Editing Tools
- [ ] Implement AIInpaintingTool with mask drawing
- [ ] Create AIOutpaintingTool with canvas extension
- [ ] Implement AIObjectRemovalTool with selection
- [ ] Add AIRelightingTool with light direction control
- [ ] Support preview modes
- [ ] Write comprehensive tests

### AI Selection Tools
- [ ] Implement AISemanticSelectionTool
- [ ] Add natural language object selection
- [ ] Support multi-object selection
- [ ] Create selection refinement UI
- [ ] Write comprehensive tests

### AI Creative Tools
- [ ] Implement AIPromptBrush with local generation
- [ ] Create AIStyleTransferBrush
- [ ] Implement AIPromptAdjustment
- [ ] Add pressure sensitivity support
- [ ] Write comprehensive tests

### Utility Adapters
- [ ] Implement AnalyzeCanvasAdapter
- [ ] Create InstructionEditingAdapter
- [ ] Implement PromptEnhancementAdapter
- [ ] Add context awareness
- [ ] Write comprehensive tests

### AI Infrastructure
- [ ] Create AIClient service with provider abstraction
- [ ] Implement request queuing and rate limiting
- [ ] Add progress tracking and cancellation
- [ ] Create AI model management
- [ ] Implement caching for results
- [ ] Add error recovery mechanisms

## 🧪 Testing Requirements

Each AI tool must have:
1. Mock AI service tests
2. Timeout and cancellation tests
3. Error handling tests
4. Progress tracking tests
5. Memory usage tests
6. Integration tests with real services

## 📚 Resources

- Foundation patterns: `docs/foundation.md`
- AI client: `lib/ai/client/AIClient.ts`
- Image processing: `lib/editor/image/ImageProcessor.ts`
- Progress UI: `lib/editor/ui/progress/`

---

Agent 5 is responsible for implementing these AI-powered tools that bring cutting-edge capabilities to the photo editor. Follow the patterns established in the foundation document and ensure all implementations maintain senior-level architecture standards with proper error handling, progress tracking, and cancellation support.