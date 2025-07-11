/**
 * Model Preferences
 * Simple localStorage-based preferences for model selection
 */

import { ModelRegistry } from '@/lib/ai/models/ModelRegistry'

export interface ModelPreferences {
  defaultQuality: 'best' | 'balanced' | 'fast'
  toolPreferences: Record<string, string> // toolId -> tierId
  showCosts: boolean
  autoDowngrade: boolean
}

const STORAGE_KEY = 'foto-fun-model-preferences'

/**
 * Get default preferences
 */
function getDefaultPreferences(): ModelPreferences {
  return {
    defaultQuality: 'balanced',
    toolPreferences: {},
    showCosts: true,
    autoDowngrade: false
  }
}

/**
 * Model preferences manager
 */
export class ModelPreferencesManager {
  private static instance: ModelPreferencesManager
  private preferences: ModelPreferences
  
  private constructor() {
    this.preferences = this.loadPreferences()
  }
  
  static getInstance(): ModelPreferencesManager {
    if (!this.instance) {
      this.instance = new ModelPreferencesManager()
    }
    return this.instance
  }
  
  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): ModelPreferences {
    if (typeof window === 'undefined') {
      return getDefaultPreferences()
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...getDefaultPreferences(), ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load model preferences:', error)
    }
    
    return getDefaultPreferences()
  }
  
  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences))
    } catch (error) {
      console.error('Failed to save model preferences:', error)
    }
  }
  
  /**
   * Get model tier for a tool
   */
  getToolModelTier(toolId: string): string {
    // Check tool-specific preference
    const toolPref = this.preferences.toolPreferences[toolId]
    if (toolPref) return toolPref
    
    // Fall back to default quality mapping
    const config = ModelRegistry.getModelConfig(toolId)
    if (!config) return 'balanced'
    
    // Map default quality to available tiers
    const { defaultQuality } = this.preferences
    if (config.tiers[defaultQuality]) {
      return defaultQuality
    }
    
    // Use tool's default tier
    return config.defaultTier
  }
  
  /**
   * Set model tier for a tool
   */
  setToolModelTier(toolId: string, tierId: string): void {
    this.preferences.toolPreferences[toolId] = tierId
    this.savePreferences()
  }
  
  /**
   * Get default quality
   */
  getDefaultQuality(): 'best' | 'balanced' | 'fast' {
    return this.preferences.defaultQuality
  }
  
  /**
   * Set default quality
   */
  setDefaultQuality(quality: 'best' | 'balanced' | 'fast'): void {
    this.preferences.defaultQuality = quality
    this.savePreferences()
  }
  
  /**
   * Get show costs preference
   */
  getShowCosts(): boolean {
    return this.preferences.showCosts
  }
  
  /**
   * Set show costs preference
   */
  setShowCosts(show: boolean): void {
    this.preferences.showCosts = show
    this.savePreferences()
  }
  
  /**
   * Get auto downgrade preference
   */
  getAutoDowngrade(): boolean {
    return this.preferences.autoDowngrade
  }
  
  /**
   * Set auto downgrade preference
   */
  setAutoDowngrade(enabled: boolean): void {
    this.preferences.autoDowngrade = enabled
    this.savePreferences()
  }
  
  /**
   * Reset all preferences
   */
  reset(): void {
    this.preferences = getDefaultPreferences()
    this.savePreferences()
  }
} 