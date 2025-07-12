import { AdapterRegistry, type AdapterRegistration } from './base/AdapterRegistry';
import { AdapterFactory } from './base/AdapterFactory';
import { ImageGenerationAdapter } from './tools/ImageGenerationAdapter';
import { MoveAdapter } from './tools/MoveAdapter';
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
      aiName: 'moveObjects',
      description: 'Move objects on the canvas with natural language commands',
      category: 'canvas-tool',
      priority: 2,
      AdapterClass: MoveAdapter
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
      aiName: 'moveObjects',
      description: 'Move objects on the canvas with natural language commands',
      category: 'canvas-tool',
      priority: 2,
      AdapterClass: MoveAdapter
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
