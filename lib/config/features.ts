/**
 * Feature Configuration System
 * 
 * This system manages feature flags for both cloud and self-hosted deployments.
 * Features can be enabled/disabled based on:
 * - Deployment mode (cloud vs self-hosted)
 * - Available external services
 * - User preferences
 * - License/plan restrictions
 */

// Feature categories
export const FEATURE_CATEGORIES = {
  AI: 'ai',
  COLLABORATION: 'collaboration',
  CLOUD: 'cloud',
  ADVANCED_EDITING: 'advanced_editing',
  INTEGRATIONS: 'integrations',
} as const

// Individual features
export const FEATURES = {
  // AI Features
  AI_CHAT: 'ai_chat',
  AI_BACKGROUND_REMOVAL: 'ai_background_removal',
  AI_FACE_ENHANCEMENT: 'ai_face_enhancement',
  AI_IMAGE_UPSCALING: 'ai_image_upscaling',
  AI_SMART_ERASE: 'ai_smart_erase',
  AI_GENERATION: 'ai_generation',
  
  // Collaboration Features
  REAL_TIME_COLLABORATION: 'real_time_collaboration',
  COMMENTS: 'comments',
  VERSION_HISTORY: 'version_history',
  CLOUD_SYNC: 'cloud_sync',
  
  // Cloud Features
  CLOUD_STORAGE: 'cloud_storage',
  TEAM_WORKSPACES: 'team_workspaces',
  USAGE_ANALYTICS: 'usage_analytics',
  
  // Advanced Editing
  PLUGINS: 'plugins',
  MACROS: 'macros',
  BATCH_PROCESSING: 'batch_processing',
  RAW_PROCESSING: 'raw_processing',
} as const

export type FeatureCategory = typeof FEATURE_CATEGORIES[keyof typeof FEATURE_CATEGORIES]
export type Feature = typeof FEATURES[keyof typeof FEATURES]

// Feature configuration type
export type FeatureConfig = {
  enabled: boolean
  requiresService?: string
  requiresPlan?: string[]
  beta?: boolean
  configurable?: boolean
  dependencies?: string[]
}

// Feature definitions with metadata
export const FEATURE_DEFINITIONS: Record<Feature, FeatureConfig & { 
  name: string
  description: string
  category: FeatureCategory
}> = {
  // AI Features
  [FEATURES.AI_CHAT]: {
    name: 'AI Chat Assistant',
    description: 'Natural language photo editing with AI',
    category: FEATURE_CATEGORIES.AI,
    enabled: true,
    requiresService: 'openai',
    configurable: true,
  },
  
  [FEATURES.AI_BACKGROUND_REMOVAL]: {
    name: 'AI Background Removal',
    description: 'Remove backgrounds using AI models',
    category: FEATURE_CATEGORIES.AI,
    enabled: false,
    requiresService: 'ai_service',
    configurable: true,
  },
  
  [FEATURES.AI_FACE_ENHANCEMENT]: {
    name: 'AI Face Enhancement',
    description: 'Enhance facial features and remove blemishes',
    category: FEATURE_CATEGORIES.AI,
    enabled: false,
    requiresService: 'ai_service',
    configurable: true,
    beta: true,
  },
  
  [FEATURES.AI_IMAGE_UPSCALING]: {
    name: 'AI Image Upscaling',
    description: 'Upscale images 2x, 4x, or 8x with AI',
    category: FEATURE_CATEGORIES.AI,
    enabled: false,
    requiresService: 'ai_service',
    configurable: true,
  },
  
  [FEATURES.AI_SMART_ERASE]: {
    name: 'AI Smart Erase',
    description: 'Remove unwanted objects intelligently',
    category: FEATURE_CATEGORIES.AI,
    enabled: false,
    requiresService: 'ai_service',
    configurable: true,
    beta: true,
  },
  
  [FEATURES.AI_GENERATION]: {
    name: 'AI Image Generation',
    description: 'Generate images from text descriptions',
    category: FEATURE_CATEGORIES.AI,
    enabled: false,
    requiresService: 'ai_service',
    requiresPlan: ['pro', 'enterprise'],
    configurable: true,
  },
  
  // Collaboration Features
  [FEATURES.REAL_TIME_COLLABORATION]: {
    name: 'Real-Time Collaboration',
    description: 'Multiple users editing simultaneously',
    category: FEATURE_CATEGORIES.COLLABORATION,
    enabled: false,
    requiresService: 'supabase_realtime',
    configurable: true,
    dependencies: [FEATURES.TEAM_WORKSPACES],
  },
  
  [FEATURES.COMMENTS]: {
    name: 'Comments & Feedback',
    description: 'Leave comments on specific areas',
    category: FEATURE_CATEGORIES.COLLABORATION,
    enabled: false,
    requiresService: 'supabase',
    configurable: true,
  },
  
  [FEATURES.VERSION_HISTORY]: {
    name: 'Version History',
    description: 'Track and restore previous versions',
    category: FEATURE_CATEGORIES.COLLABORATION,
    enabled: true,
    configurable: false, // Always enabled locally
  },
  
  [FEATURES.CLOUD_SYNC]: {
    name: 'Cloud Sync',
    description: 'Automatic backup and sync to cloud',
    category: FEATURE_CATEGORIES.CLOUD,
    enabled: false,
    requiresService: 'supabase',
    requiresPlan: ['pro', 'enterprise'],
    configurable: true,
  },
  
  // Cloud Features
  [FEATURES.CLOUD_STORAGE]: {
    name: 'Cloud Storage',
    description: 'Store images and projects in the cloud',
    category: FEATURE_CATEGORIES.CLOUD,
    enabled: false,
    requiresService: 'supabase_storage',
    configurable: true,
  },
  
  [FEATURES.TEAM_WORKSPACES]: {
    name: 'Team Workspaces',
    description: 'Organize work in team workspaces',
    category: FEATURE_CATEGORIES.CLOUD,
    enabled: false,
    requiresService: 'supabase',
    requiresPlan: ['pro', 'enterprise'],
    configurable: true,
  },
  
  [FEATURES.USAGE_ANALYTICS]: {
    name: 'Usage Analytics',
    description: 'Track usage and performance metrics',
    category: FEATURE_CATEGORIES.CLOUD,
    enabled: false,
    requiresService: 'analytics',
    requiresPlan: ['enterprise'],
    configurable: true,
  },
  
  // Advanced Editing
  [FEATURES.PLUGINS]: {
    name: 'Plugin System',
    description: 'Extend functionality with plugins',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    enabled: false,
    configurable: true,
    beta: true,
  },
  
  [FEATURES.MACROS]: {
    name: 'Macros & Automation',
    description: 'Record and replay editing sequences',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    enabled: false,
    configurable: true,
  },
  
  [FEATURES.BATCH_PROCESSING]: {
    name: 'Batch Processing',
    description: 'Process multiple images at once',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    enabled: false,
    configurable: true,
    dependencies: [FEATURES.MACROS],
  },
  
  [FEATURES.RAW_PROCESSING]: {
    name: 'RAW Image Processing',
    description: 'Edit RAW image formats',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    enabled: false,
    configurable: true,
    beta: true,
  },
}

// Service availability checkers
export const SERVICE_CHECKERS = {
  openai: () => !!process.env.OPENAI_API_KEY,
  supabase: () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabase_realtime: () => SERVICE_CHECKERS.supabase() && process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true',
  supabase_storage: () => SERVICE_CHECKERS.supabase(),
  ai_service: () => !!process.env.NEXT_PUBLIC_AI_SERVICE_URL,
  analytics: () => !!process.env.NEXT_PUBLIC_ANALYTICS_ID,
}

// Deployment mode detection
export function getDeploymentMode(): 'cloud' | 'self-hosted' {
  return process.env.NEXT_PUBLIC_DEPLOYMENT === 'cloud' ? 'cloud' : 'self-hosted'
}

// Get user plan (mock for now, would come from auth/db)
export function getUserPlan(): 'free' | 'pro' | 'enterprise' {
  // TODO: Get from user profile/subscription
  return 'free'
}

// Feature availability checker
export class FeatureManager {
  private static instance: FeatureManager
  private userPreferences: Map<Feature, boolean> = new Map()
  private serviceCache: Map<string, boolean> = new Map()
  
  static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager()
    }
    return FeatureManager.instance
  }
  
  constructor() {
    this.loadUserPreferences()
  }
  
  private loadUserPreferences() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('feature-preferences')
      if (saved) {
        try {
          const prefs = JSON.parse(saved)
          Object.entries(prefs).forEach(([feature, enabled]) => {
            this.userPreferences.set(feature as Feature, enabled as boolean)
          })
        } catch (e) {
          console.error('Failed to load feature preferences:', e)
        }
      }
    }
  }
  
  private saveUserPreferences() {
    if (typeof window !== 'undefined') {
      const prefs: Record<string, boolean> = {}
      this.userPreferences.forEach((enabled, feature) => {
        prefs[feature] = enabled
      })
      localStorage.setItem('feature-preferences', JSON.stringify(prefs))
    }
  }
  
  private checkService(service: string): boolean {
    // Use cache in browser
    if (typeof window !== 'undefined' && this.serviceCache.has(service)) {
      return this.serviceCache.get(service)!
    }
    
    const checker = SERVICE_CHECKERS[service as keyof typeof SERVICE_CHECKERS]
    const available = checker ? checker() : false
    
    if (typeof window !== 'undefined') {
      this.serviceCache.set(service, available)
    }
    
    return available
  }
  
  isFeatureAvailable(feature: Feature): boolean {
    const config = FEATURE_DEFINITIONS[feature]
    if (!config) return false
    
    // Check if feature is enabled in base config
    if (!config.enabled) return false
    
    // Check user preference if configurable
    if (config.configurable) {
      const userPref = this.userPreferences.get(feature)
      if (userPref === false) return false
    }
    
    // Check required service
    if (config.requiresService && !this.checkService(config.requiresService)) {
      return false
    }
    
    // Check plan requirements
    if (config.requiresPlan) {
      const userPlan = getUserPlan()
      if (!config.requiresPlan.includes(userPlan)) {
        return false
      }
    }
    
    // Check dependencies
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        if (!this.isFeatureAvailable(dep as Feature)) {
          return false
        }
      }
    }
    
    // Cloud deployment has all features potentially available
    if (getDeploymentMode() === 'cloud') {
      return true
    }
    
    // Self-hosted: feature is available if all checks pass
    return true
  }
  
  setFeatureEnabled(feature: Feature, enabled: boolean) {
    const config = FEATURE_DEFINITIONS[feature]
    if (!config?.configurable) {
      console.warn(`Feature ${feature} is not configurable`)
      return
    }
    
    this.userPreferences.set(feature, enabled)
    this.saveUserPreferences()
  }
  
  getFeaturesByCategory(category: FeatureCategory): Feature[] {
    return Object.entries(FEATURE_DEFINITIONS)
      .filter(([, config]) => config.category === category)
      .map(([feature]) => feature as Feature)
  }
  
  getAvailableFeatures(): Feature[] {
    return Object.keys(FEATURE_DEFINITIONS)
      .filter(feature => this.isFeatureAvailable(feature as Feature)) as Feature[]
  }
  
  getMissingServices(): string[] {
    const missingServices = new Set<string>()
    
    Object.entries(FEATURE_DEFINITIONS).forEach(([, config]) => {
      if (config.requiresService && !this.checkService(config.requiresService)) {
        missingServices.add(config.requiresService)
      }
    })
    
    return Array.from(missingServices)
  }
  
  getFeatureStatus(feature: Feature): {
    available: boolean
    reason?: string
    missingService?: string
    requiredPlan?: string[]
    userDisabled?: boolean
  } {
    const config = FEATURE_DEFINITIONS[feature]
    if (!config) {
      return { available: false, reason: 'Unknown feature' }
    }
    
    if (!config.enabled) {
      return { available: false, reason: 'Feature not enabled' }
    }
    
    if (config.configurable) {
      const userPref = this.userPreferences.get(feature)
      if (userPref === false) {
        return { available: false, reason: 'Disabled by user', userDisabled: true }
      }
    }
    
    if (config.requiresService && !this.checkService(config.requiresService)) {
      return { 
        available: false, 
        reason: 'Required service not configured',
        missingService: config.requiresService
      }
    }
    
    if (config.requiresPlan) {
      const userPlan = getUserPlan()
      if (!config.requiresPlan.includes(userPlan)) {
        return {
          available: false,
          reason: 'Requires higher plan',
          requiredPlan: config.requiresPlan
        }
      }
    }
    
    return { available: true }
  }
}

// Export singleton instance
export const featureManager = FeatureManager.getInstance()

// React hook for feature flags
export function useFeature(feature: Feature): boolean {
  // In a real implementation, this would use React state and update on changes
  return featureManager.isFeatureAvailable(feature)
}

// Feature gate component props
export interface FeatureGateProps {
  feature: Feature
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgrade?: boolean
} 