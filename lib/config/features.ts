/**
 * Feature Configuration System
 * 
 * Simple feature flags for cloud and self-hosted deployments.
 * - Cloud users: All features available, simple toggle
 * - Self-hosted users: All features shown, setup help when needed
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
  name: string
  description: string
  category: FeatureCategory
  status?: 'stable' | 'beta' | 'coming-soon'
  cloudOnly?: boolean
  setupGuide?: string
}

// Feature definitions with metadata
export const FEATURE_DEFINITIONS: Record<Feature, FeatureConfig> = {
  // AI Features
  [FEATURES.AI_CHAT]: {
    name: 'AI Chat Assistant',
    description: 'Natural language photo editing with AI',
    category: FEATURE_CATEGORIES.AI,
    status: 'stable',
    setupGuide: 'Add OPENAI_API_KEY to your .env.local file',
  },
  
  [FEATURES.AI_BACKGROUND_REMOVAL]: {
    name: 'AI Background Removal',
    description: 'Remove backgrounds using AI models',
    category: FEATURE_CATEGORIES.AI,
    status: 'coming-soon',
    setupGuide: 'Run AI service: docker run -p 8080:8080 fotofun/ai-service',
  },
  
  [FEATURES.AI_FACE_ENHANCEMENT]: {
    name: 'AI Face Enhancement',
    description: 'Enhance facial features and remove blemishes',
    category: FEATURE_CATEGORIES.AI,
    status: 'beta',
    setupGuide: 'Run AI service: docker run -p 8080:8080 fotofun/ai-service',
  },
  
  [FEATURES.AI_IMAGE_UPSCALING]: {
    name: 'AI Image Upscaling',
    description: 'Upscale images 2x, 4x, or 8x with AI',
    category: FEATURE_CATEGORIES.AI,
    status: 'coming-soon',
    setupGuide: 'Run AI service: docker run -p 8080:8080 fotofun/ai-service',
  },
  
  [FEATURES.AI_SMART_ERASE]: {
    name: 'AI Smart Erase',
    description: 'Remove unwanted objects intelligently',
    category: FEATURE_CATEGORIES.AI,
    status: 'beta',
    setupGuide: 'Run AI service: docker run -p 8080:8080 fotofun/ai-service',
  },
  
  [FEATURES.AI_GENERATION]: {
    name: 'AI Image Generation',
    description: 'Generate images from text descriptions',
    category: FEATURE_CATEGORIES.AI,
    status: 'coming-soon',
    cloudOnly: true,
  },
  
  // Collaboration Features
  [FEATURES.REAL_TIME_COLLABORATION]: {
    name: 'Real-Time Collaboration',
    description: 'Multiple users editing simultaneously',
    category: FEATURE_CATEGORIES.COLLABORATION,
    status: 'coming-soon',
    setupGuide: 'Enable Supabase Realtime in your project dashboard',
  },
  
  [FEATURES.COMMENTS]: {
    name: 'Comments & Feedback',
    description: 'Leave comments on specific areas',
    category: FEATURE_CATEGORIES.COLLABORATION,
    status: 'coming-soon',
  },
  
  [FEATURES.VERSION_HISTORY]: {
    name: 'Version History',
    description: 'Track and restore previous versions',
    category: FEATURE_CATEGORIES.COLLABORATION,
    status: 'stable',
  },
  
  [FEATURES.CLOUD_SYNC]: {
    name: 'Cloud Sync',
    description: 'Automatic backup and sync to cloud',
    category: FEATURE_CATEGORIES.CLOUD,
    status: 'coming-soon',
    cloudOnly: true,
  },
  
  // Cloud Features
  [FEATURES.CLOUD_STORAGE]: {
    name: 'Cloud Storage',
    description: 'Store images and projects in the cloud',
    category: FEATURE_CATEGORIES.CLOUD,
    status: 'coming-soon',
    setupGuide: 'Configure Supabase Storage in your project',
  },
  
  [FEATURES.TEAM_WORKSPACES]: {
    name: 'Team Workspaces',
    description: 'Organize work in team workspaces',
    category: FEATURE_CATEGORIES.CLOUD,
    status: 'coming-soon',
    cloudOnly: true,
  },
  
  [FEATURES.USAGE_ANALYTICS]: {
    name: 'Usage Analytics',
    description: 'Track usage and performance metrics',
    category: FEATURE_CATEGORIES.CLOUD,
    status: 'coming-soon',
    cloudOnly: true,
  },
  
  // Advanced Editing
  [FEATURES.PLUGINS]: {
    name: 'Plugin System',
    description: 'Extend functionality with plugins',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    status: 'beta',
  },
  
  [FEATURES.MACROS]: {
    name: 'Macros & Automation',
    description: 'Record and replay editing sequences',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    status: 'coming-soon',
  },
  
  [FEATURES.BATCH_PROCESSING]: {
    name: 'Batch Processing',
    description: 'Process multiple images at once',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    status: 'coming-soon',
  },
  
  [FEATURES.RAW_PROCESSING]: {
    name: 'RAW Image Processing',
    description: 'Edit RAW image formats',
    category: FEATURE_CATEGORIES.ADVANCED_EDITING,
    status: 'beta',
  },
}

// Deployment mode detection
export function getDeploymentMode(): 'cloud' | 'self-hosted' {
  return process.env.NEXT_PUBLIC_DEPLOYMENT === 'cloud' ? 'cloud' : 'self-hosted'
}

// Simple feature manager
export class FeatureManager {
  private static instance: FeatureManager
  private enabledFeatures: Set<Feature> = new Set()
  
  static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager()
    }
    return FeatureManager.instance
  }
  
  constructor() {
    this.loadPreferences()
  }
  
  private loadPreferences() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('enabled-features')
      if (saved) {
        try {
          const features = JSON.parse(saved) as Feature[]
          features.forEach(feature => this.enabledFeatures.add(feature))
        } catch (e) {
          console.error('Failed to load feature preferences:', e)
        }
      } else {
        // Default enabled features
        this.enabledFeatures.add(FEATURES.VERSION_HISTORY)
        this.enabledFeatures.add(FEATURES.AI_CHAT)
      }
    }
  }
  
  private savePreferences() {
    if (typeof window !== 'undefined') {
      const features = Array.from(this.enabledFeatures)
      localStorage.setItem('enabled-features', JSON.stringify(features))
    }
  }
  
  isFeatureEnabled(feature: Feature): boolean {
    return this.enabledFeatures.has(feature)
  }
  
  setFeatureEnabled(feature: Feature, enabled: boolean) {
    if (enabled) {
      this.enabledFeatures.add(feature)
    } else {
      this.enabledFeatures.delete(feature)
    }
    this.savePreferences()
  }
  
  getFeaturesByCategory(category: FeatureCategory): Feature[] {
    return Object.entries(FEATURE_DEFINITIONS)
      .filter(([, config]) => config.category === category)
      .map(([feature]) => feature as Feature)
  }
  
  getAllFeatures(): Feature[] {
    return Object.keys(FEATURE_DEFINITIONS) as Feature[]
  }
}

// Export singleton instance
export const featureManager = FeatureManager.getInstance()

// React hook for feature flags
export function useFeature(feature: Feature): boolean {
  // In a real implementation, this would use React state and update on changes
  return featureManager.isFeatureEnabled(feature)
}

// Feature gate component props
export interface FeatureGateProps {
  feature: Feature
  children: React.ReactNode
  fallback?: React.ReactNode
} 