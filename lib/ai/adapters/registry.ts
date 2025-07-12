// STUB: AI adapter registry disabled during refactor
export class AdapterRegistry {
  static async getInstance() {
    console.warn('AI adapters disabled during refactor');
    return {
      getAdapter: () => null,
      getAllAdapters: () => [],
      getAll: () => new Map(),
      registerAdapter: () => {},
      // Add missing methods
      getAITools: () => ({}),
      getToolNamesByCategory: (category: string) => [],
      get: (id: string) => ({
        metadata: { category: 'unknown', worksOn: 'unknown' }
      }),
    };
  }
}

// Export a default instance for compatibility
export const adapterRegistry = {
  getAll: () => new Map(),
  getAdapter: () => null,
  getAllAdapters: () => [],
  registerAdapter: () => {},
  // Add missing methods
  getAITools: () => ({}),
  getToolNamesByCategory: (category: string) => [],
  get: (id: string) => ({
    metadata: { category: 'unknown', worksOn: 'unknown' }
  }),
};

// Export stub function
export async function autoDiscoverAdapters() {
  console.warn('Auto discover adapters disabled during refactor');
}
