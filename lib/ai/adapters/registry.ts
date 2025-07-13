import { AdapterRegistry, type AdapterRegistration } from './base/AdapterRegistry';
import { AdapterFactory } from './base/AdapterFactory';
import { ImageGenerationAdapter } from './tools/ImageGenerationAdapter';
import { MoveAdapter } from './tools/MoveAdapter';
import { CropAdapter } from './tools/CropAdapter';
import { FrameAdapter } from './tools/FrameAdapter';
import { AddTextAdapter } from './tools/AddTextAdapter';
import type { ServiceContainer } from '@/lib/core/ServiceContainer';

/**
 * Create and configure the adapter registry with all available adapters
 */
export function createAdapterRegistry(serviceContainer: ServiceContainer): AdapterRegistry {
  const adapterFactory = new AdapterFactory(serviceContainer);
  const registry = new AdapterRegistry(adapterFactory);

  // Register all available adapters
  const adapters: AdapterRegistration[] = [
    {
      id: 'image-generation',
      aiName: 'generateImage',
      description: 'Generate AI images from text prompts',
      category: 'ai-service',
      priority: 1,
      AdapterClass: ImageGenerationAdapter
    },
    {
      id: 'move',
      aiName: 'moveObject',
      description: 'Move or align objects on the canvas with natural language',
      category: 'canvas-tool',
      priority: 2,
      AdapterClass: MoveAdapter
    },
    {
      id: 'crop',
      aiName: 'cropImage',
      description: 'Crop images to specific dimensions or aspect ratios',
      category: 'canvas-tool',
      priority: 3,
      AdapterClass: CropAdapter
    },
    {
      id: 'frame',
      aiName: 'createFrame',
      description: 'Create frames for document boundaries and composition guides',
      category: 'canvas-tool',
      priority: 4,
      AdapterClass: FrameAdapter
    },
    {
      id: 'add-text',
      aiName: 'addText',
      description: 'Add text to the canvas with typography controls',
      category: 'canvas-tool',
      priority: 5,
      AdapterClass: AddTextAdapter
    }
  ];

  registry.registerAll(adapters);
  
  return registry;
}

/**
 * Get adapter registration definitions for all available adapters
 */
export function getAdapterRegistrations(): AdapterRegistration[] {
  return [
    {
      id: 'image-generation',
      aiName: 'generateImage',
      description: 'Generate AI images from text prompts',
      category: 'ai-service',
      priority: 1,
      AdapterClass: ImageGenerationAdapter
    },
    {
      id: 'move',
      aiName: 'moveObject',
      description: 'Move or align objects on the canvas with natural language',
      category: 'canvas-tool',
      priority: 2,
      AdapterClass: MoveAdapter
    },
    {
      id: 'crop',
      aiName: 'cropImage',
      description: 'Crop images to specific dimensions or aspect ratios',
      category: 'canvas-tool',
      priority: 3,
      AdapterClass: CropAdapter
    }
  ];
}

/**
 * Auto-discover and register all available adapters
 */
export async function autoDiscoverAdapters(serviceContainer: ServiceContainer): Promise<AdapterRegistry> {
  const registry = createAdapterRegistry(serviceContainer);
  
  // Validate all registered adapters
  const { valid, invalid } = await registry.validateAll();
  
  if (invalid.length > 0) {
    console.warn('AdapterRegistry: Some adapters failed validation:', invalid);
  }
  
  console.log(`AdapterRegistry: Successfully registered ${valid.length} adapters`);
  
  return registry;
}

// Export the AdapterRegistry class for direct use
export { AdapterRegistry, AdapterFactory };
