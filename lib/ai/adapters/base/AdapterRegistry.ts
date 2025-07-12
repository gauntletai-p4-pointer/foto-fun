import type { UnifiedToolAdapter } from './UnifiedToolAdapter';
import type { AdapterFactory } from './AdapterFactory';

/**
 * Adapter metadata for registration
 */
export interface AdapterRegistration {
  id: string;
  aiName: string;
  description: string;
  category: 'canvas-tool' | 'ai-service' | 'utility';
  priority: number;
  AdapterClass: new (dependencies: any) => UnifiedToolAdapter;
}

/**
 * Registry for managing all AI adapters
 * Provides discovery, registration, and instantiation of adapters
 */
export class AdapterRegistry {
  private adapters = new Map<string, AdapterRegistration>();
  private instances = new Map<string, UnifiedToolAdapter>();

  constructor(private adapterFactory: AdapterFactory) {}

  /**
   * Register an adapter class
   */
  register(registration: AdapterRegistration): void {
    if (this.adapters.has(registration.id)) {
      console.warn(`AdapterRegistry: Adapter ${registration.id} already registered, overwriting`);
    }

    this.adapters.set(registration.id, registration);
    console.log(`AdapterRegistry: Registered adapter ${registration.id} (${registration.aiName})`);
  }

  /**
   * Register multiple adapters
   */
  registerAll(registrations: AdapterRegistration[]): void {
    for (const registration of registrations) {
      this.register(registration);
    }
  }

  /**
   * Get adapter instance (creates if not exists)
   */
  async getAdapter(id: string): Promise<UnifiedToolAdapter | null> {
    // Return cached instance if available
    if (this.instances.has(id)) {
      return this.instances.get(id)!;
    }

    // Get registration
    const registration = this.adapters.get(id);
    if (!registration) {
      console.error(`AdapterRegistry: Adapter ${id} not found`);
      return null;
    }

    try {
      // Create new instance
      const instance = await this.adapterFactory.createAdapter(registration.AdapterClass);
      this.instances.set(id, instance);
      return instance;
    } catch (error) {
      console.error(`AdapterRegistry: Failed to create adapter ${id}:`, error);
      return null;
    }
  }

  /**
   * Get adapter by AI function name
   */
  async getAdapterByAiName(aiName: string): Promise<UnifiedToolAdapter | null> {
    const registration = Array.from(this.adapters.values()).find(
      reg => reg.aiName === aiName
    );

    if (!registration) {
      console.error(`AdapterRegistry: No adapter found for AI name: ${aiName}`);
      return null;
    }

    return this.getAdapter(registration.id);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): AdapterRegistration[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapters by category
   */
  getAdaptersByCategory(category: AdapterRegistration['category']): AdapterRegistration[] {
    return Array.from(this.adapters.values()).filter(
      adapter => adapter.category === category
    );
  }

  /**
   * Get adapters sorted by priority
   */
  getAdaptersByPriority(): AdapterRegistration[] {
    return Array.from(this.adapters.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check if adapter is registered
   */
  hasAdapter(id: string): boolean {
    return this.adapters.has(id);
  }

  /**
   * Unregister adapter
   */
  unregister(id: string): boolean {
    const removed = this.adapters.delete(id);
    if (removed) {
      // Also remove instance if cached
      this.instances.delete(id);
      console.log(`AdapterRegistry: Unregistered adapter ${id}`);
    }
    return removed;
  }

  /**
   * Clear all adapters
   */
  clear(): void {
    this.adapters.clear();
    this.instances.clear();
    console.log('AdapterRegistry: Cleared all adapters');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalRegistered: number;
    totalInstantiated: number;
    byCategory: Record<string, number>;
  } {
    const byCategory: Record<string, number> = {};
    
    for (const adapter of this.adapters.values()) {
      byCategory[adapter.category] = (byCategory[adapter.category] || 0) + 1;
    }

    return {
      totalRegistered: this.adapters.size,
      totalInstantiated: this.instances.size,
      byCategory
    };
  }

  /**
   * Validate all registered adapters
   */
  async validateAll(): Promise<{ valid: string[]; invalid: string[] }> {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const [id, registration] of this.adapters) {
      try {
        const instance = await this.adapterFactory.createAdapter(registration.AdapterClass);
        if (instance && typeof instance.execute === 'function') {
          valid.push(id);
        } else {
          invalid.push(id);
        }
      } catch (error) {
        console.error(`AdapterRegistry: Validation failed for ${id}:`, error);
        invalid.push(id);
      }
    }

    return { valid, invalid };
  }
} 