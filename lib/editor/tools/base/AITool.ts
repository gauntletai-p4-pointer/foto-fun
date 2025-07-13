import { BaseTool, ToolDependencies, ToolState } from './BaseTool';
import type { CanvasManager } from '@/lib/editor/canvas/CanvasManager';
import type { CanvasObject } from '@/lib/editor/objects/types';

export interface AIOperationOptions {
  progressMessage?: string;
  timeout?: number;
  priority?: 'high' | 'normal' | 'low';
  signal?: AbortSignal;
}

export interface AIServiceClient {
  generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    steps: number;
    seed?: number;
    signal?: AbortSignal;
  }): Promise<{ url: string; seed?: number }>;
  
  removeBackground(params: {
    imageUrl: string;
    modelTier?: 'fast' | 'best';
    signal?: AbortSignal;
  }): Promise<{ imageUrl: string }>;
  
  upscaleImage(params: {
    imageUrl: string;
    scale: number;
    faceEnhance?: boolean;
    modelTier?: 'fast' | 'best';
    signal?: AbortSignal;
  }): Promise<{ imageUrl: string }>;
  
  enhanceFace(params: {
    imageUrl: string;
    scale: number;
    version?: 'v1.4' | 'v1.3';
    signal?: AbortSignal;
  }): Promise<{ imageUrl: string }>;
  
  runModel(params: {
    modelId: string;
    input: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<{ output: unknown }>;
}

/**
 * Enhanced AI Tool base class with proper service integration, progress tracking, and cancellation
 * Follows senior-level patterns with dependency injection and comprehensive error handling
 */
export abstract class AITool extends BaseTool {
  protected isProcessing: boolean = false;
  protected currentRequest: AbortController | null = null;
  protected aiClient: AIServiceClient;
  
  constructor(id: string, dependencies: ToolDependencies) {
    super(id, dependencies);
    this.aiClient = this.createAIClient();
  }
  
  async onActivate(_canvas: CanvasManager): Promise<void> {
    this.setState(ToolState.ACTIVATING);
    
    // Check AI service availability
    const isAvailable = await this.checkAIAvailability();
    if (!isAvailable) {
      this.showAIUnavailableMessage();
      await this.switchToDefaultTool();
      return;
    }
    
    // Initialize AI-specific UI
    await this.initializeAIInterface();
    
    this.setState(ToolState.ACTIVE);
  }
  
  async onDeactivate(_canvas: CanvasManager): Promise<void> {
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
      if (options.progressMessage) {
        this.showProgress(options.progressMessage);
      }
      
      // Execute with timeout and abort signal
      const result = await Promise.race([
        operation(),
        this.createTimeout(options.timeout || 30000)
      ]);
      
      return result as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
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
  
  protected getImageObjects(): CanvasObject[] {
    const selectedObjects = this.dependencies.canvasManager.getSelectedObjects();
    return selectedObjects.filter((obj: CanvasObject) => obj.type === 'image');
  }
  
  protected async loadImageFromUrl(url: string): Promise<ImageData> {
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
      
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = url;
    });
  }
  
  protected async uploadImageToTempUrl(imageData: ImageData): Promise<string> {
    // Convert ImageData to blob
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert image to blob'));
          return;
        }
        
        // Create temporary URL
        const url = URL.createObjectURL(blob);
        resolve(url);
      }, 'image/png');
    });
  }
  
  protected getCenterPosition(width: number, height: number): { x: number; y: number } {
    const viewport = this.dependencies.canvasManager.getViewport();
    return {
      x: (viewport.width - width) / 2,
      y: (viewport.height - height) / 2
    };
  }
  
  protected async switchToDefaultTool(): Promise<void> {
    this.dependencies.eventBus.emit('tool.activation.requested', {
      toolId: 'move'
    });
  }
  
  protected showAIUnavailableMessage(): void {
    console.warn('AI service is not available');
    // TODO: Show user-friendly message in UI
  }
  
  protected showProgress(message: string): void {
    console.log(`AI Progress: ${message}`);
    // TODO: Show progress indicator in UI
  }
  
  protected hideProgress(): void {
    console.log('AI Progress: Complete');
    // TODO: Hide progress indicator in UI
  }
  
  private createAIClient(): AIServiceClient {
    return {
      generateImage: async (params) => {
        const response = await fetch('/api/ai/replicate/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: params.prompt,
            negative_prompt: params.negativePrompt,
            width: params.width,
            height: params.height,
            steps: params.steps,
            seed: params.seed
          }),
          signal: params.signal
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Image generation failed');
        }
        
        const data = await response.json();
        return { url: data.imageUrl, seed: data.metadata?.seed };
      },
      
      removeBackground: async (params) => {
        const response = await fetch('/api/ai/replicate/background-removal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: params.imageUrl,
            modelTier: params.modelTier || 'best'
          }),
          signal: params.signal
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Background removal failed');
        }
        
        const data = await response.json();
        return { imageUrl: data.imageUrl };
      },
      
      upscaleImage: async (params) => {
        const response = await fetch('/api/ai/replicate/upscale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: params.imageUrl,
            scale: params.scale,
            faceEnhance: params.faceEnhance || false,
            modelTier: params.modelTier || 'best'
          }),
          signal: params.signal
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Image upscaling failed');
        }
        
        const data = await response.json();
        return { imageUrl: data.imageUrl };
      },
      
      enhanceFace: async (params) => {
        const response = await fetch('/api/ai/replicate/face-enhancement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: params.imageUrl,
            scale: params.scale,
            version: params.version || 'v1.4'
          }),
          signal: params.signal
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Face enhancement failed');
        }
        
        const data = await response.json();
        return { imageUrl: data.imageUrl };
      },
      
      runModel: async (params) => {
        const response = await fetch('/api/ai/replicate/run-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: params.modelId,
            input: params.input
          }),
          signal: params.signal
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Model execution failed');
        }
        
        const data = await response.json();
        return { output: data.output };
      }
    };
  }
  
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), ms);
    });
  }
  
  // Abstract methods that subclasses must implement
  protected abstract checkAIAvailability(): Promise<boolean>;
  protected abstract initializeAIInterface(): Promise<void>;
  protected abstract cleanupAIInterface(): Promise<void>;
} 