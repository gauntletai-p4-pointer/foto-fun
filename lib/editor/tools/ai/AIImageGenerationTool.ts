import { AITool } from '../base/AITool';
import type { ToolDependencies } from '../base/BaseTool';
import type { ImageData as CanvasImageData } from '@/lib/editor/objects/types';

export interface AIImageGenerationOptions {
  model: string;
  width: string;
  height: string;
  guidanceScale: number;
  steps: number;
  seed: number;
}

/**
 * AI Image Generation Tool
 * Generates images from text prompts using AI models
 * Follows senior-level patterns with proper error handling and progress tracking
 */
export class AIImageGenerationTool extends AITool {
  private generationPanel: HTMLElement | null = null;
  
  constructor(dependencies: ToolDependencies) {
    super('ai-image-generation', dependencies);
  }
  
  getOptionDefinitions(): Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select' | 'color';
    defaultValue?: string | number | boolean;
    label?: string;
    options?: Array<{ value: string | number; label: string; }>;
    min?: number;
    max?: number;
    step?: number;
  }> {
    return {
      model: {
        type: 'select',
        defaultValue: 'stable-diffusion-xl',
        options: [
          { value: 'stable-diffusion-xl', label: 'Stable Diffusion XL' },
          { value: 'flux-schnell', label: 'Flux Schnell' },
          { value: 'flux-pro', label: 'Flux Pro' }
        ],
        label: 'AI Model'
      },
      width: {
        type: 'select',
        defaultValue: '1024',
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
        defaultValue: '1024',
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
        defaultValue: 7.5,
        min: 1,
        max: 20,
        step: 0.5,
        label: 'Guidance Scale'
      },
      steps: {
        type: 'number',
        defaultValue: 50,
        min: 20,
        max: 150,
        label: 'Inference Steps'
      },
      seed: {
        type: 'number',
        defaultValue: -1,
        min: -1,
        max: 2147483647,
        label: 'Seed (-1 for random)'
      }
    };
  }
  
  protected async checkAIAvailability(): Promise<boolean> {
    try {
      // Test if the image generation API is available
      const response = await fetch('/api/ai/replicate/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'test',
          width: 512,
          height: 512,
          steps: 1
        })
      });
      
      // Even if it fails, as long as we get a response, the service is available
      return response.status !== 503;
    } catch {
      return false;
    }
  }
  
  protected async initializeAIInterface(): Promise<void> {
    // Create a simple UI panel for demonstration
    // In a real implementation, this would integrate with the existing UI system
    this.generationPanel = document.createElement('div');
    this.generationPanel.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      width: 300px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 1000;
      font-family: system-ui, -apple-system, sans-serif;
    `;
    
    this.generationPanel.innerHTML = `
      <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">AI Image Generation</h3>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">Prompt:</label>
        <textarea id="ai-prompt" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-size: 14px;" placeholder="Describe the image you want to generate..."></textarea>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">Negative Prompt:</label>
        <textarea id="ai-negative-prompt" style="width: 100%; height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-size: 14px;" placeholder="What to avoid in the image..."></textarea>
      </div>
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button id="ai-generate-btn" style="flex: 1; padding: 10px; background: #0096ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">Generate</button>
        <button id="ai-cancel-btn" style="padding: 10px 16px; background: #f5f5f5; color: #666; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
      </div>
      <div id="ai-progress" style="display: none; padding: 8px; background: #f0f9ff; border: 1px solid #0096ff; border-radius: 4px; font-size: 14px; color: #0096ff;"></div>
    `;
    
    document.body.appendChild(this.generationPanel);
    
    // Add event listeners
    const generateBtn = this.generationPanel.querySelector('#ai-generate-btn') as HTMLButtonElement;
    const cancelBtn = this.generationPanel.querySelector('#ai-cancel-btn') as HTMLButtonElement;
    const promptInput = this.generationPanel.querySelector('#ai-prompt') as HTMLTextAreaElement;
    const negativePromptInput = this.generationPanel.querySelector('#ai-negative-prompt') as HTMLTextAreaElement;
    
    generateBtn.addEventListener('click', async () => {
      const prompt = promptInput.value.trim();
      if (!prompt) {
        alert('Please enter a prompt');
        return;
      }
      
      await this.generateImage(prompt, negativePromptInput.value.trim() || undefined);
    });
    
    cancelBtn.addEventListener('click', () => {
      if (this.currentRequest) {
        this.currentRequest.abort();
      }
      this.switchToDefaultTool();
    });
    
    // Focus on prompt input
    promptInput.focus();
  }
  
  protected async cleanupAIInterface(): Promise<void> {
    if (this.generationPanel) {
      document.body.removeChild(this.generationPanel);
      this.generationPanel = null;
    }
  }
  
  private async generateImage(prompt: string, negativePrompt?: string): Promise<void> {
    const options = this.getAllOptions() as unknown as AIImageGenerationOptions;
    
    await this.executeAIOperation(async () => {
      // Generate image using the AI client
      const result = await this.aiClient.generateImage({
        prompt,
        negativePrompt,
        width: parseInt(options.width),
        height: parseInt(options.height),
        steps: options.steps,
        seed: options.seed === -1 ? undefined : options.seed,
        signal: this.currentRequest?.signal
      });
      
             // Load the generated image
       const imageData = await this.loadImageFromUrl(result.url);
       const position = this.getCenterPosition(imageData.width, imageData.height);
       
       // Create a temporary image element for the canvas object
       const img = new Image();
       img.crossOrigin = 'anonymous';
       img.src = result.url;
       
       await new Promise((resolve) => {
         img.onload = resolve;
       });
       
       // Create image object on canvas with proper CanvasImageData structure
       const objectData = {
         type: 'image' as const,
         name: `AI Generated - ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}`,
         x: position.x,
         y: position.y,
         width: imageData.width,
         height: imageData.height,
         visible: true,
         locked: false,
         opacity: 1,
         rotation: 0,
         scaleX: 1,
         scaleY: 1,
         zIndex: 0,
         data: {
           src: result.url,
           naturalWidth: imageData.width,
           naturalHeight: imageData.height,
           element: img
         } as CanvasImageData
       };
      
      // Add the object to the canvas
      const objectId = await this.dependencies.canvasManager.addObject(objectData);
      
      // Select the new image
      if (objectId) {
        this.dependencies.canvasManager.selectObject(objectId);
      }
      
      // Close the generation panel
      this.switchToDefaultTool();
    }, {
      progressMessage: 'Generating image...',
      timeout: 60000 // 1 minute timeout for generation
    });
  }
  
  protected showProgress(message: string): void {
    super.showProgress(message);
    
    if (this.generationPanel) {
      const progressDiv = this.generationPanel.querySelector('#ai-progress') as HTMLElement;
      const generateBtn = this.generationPanel.querySelector('#ai-generate-btn') as HTMLButtonElement;
      
      progressDiv.style.display = 'block';
      progressDiv.textContent = message;
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
    }
  }
  
  protected hideProgress(): void {
    super.hideProgress();
    
    if (this.generationPanel) {
      const progressDiv = this.generationPanel.querySelector('#ai-progress') as HTMLElement;
      const generateBtn = this.generationPanel.querySelector('#ai-generate-btn') as HTMLButtonElement;
      
      progressDiv.style.display = 'none';
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate';
    }
  }
}

// Tool registration
export const aiImageGenerationToolRegistration = {
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