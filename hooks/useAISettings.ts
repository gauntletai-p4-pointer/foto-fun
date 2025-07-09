import { useState, useEffect, useCallback } from 'react'

export interface AISettings {
  stepByStepMode: 'always' | 'complex-only' | 'never'
  autoApproveThreshold: number
  showEducationalContent: boolean
  showConfidenceScores: boolean
  showApprovalDecisions: boolean
}

const defaultAISettings: AISettings = {
  stepByStepMode: 'complex-only',
  autoApproveThreshold: 0.8,
  showEducationalContent: true,
  showConfidenceScores: true,
  showApprovalDecisions: true,
}

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(defaultAISettings)

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('ai-settings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Failed to parse AI settings:', error)
      }
    }
  }, [])

  const updateSetting = useCallback(<K extends keyof AISettings>(
    key: K,
    value: AISettings[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value }
      localStorage.setItem('ai-settings', JSON.stringify(newSettings))
      return newSettings
    })
  }, [])

  const updateSettings = useCallback((updates: Partial<AISettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates }
      localStorage.setItem('ai-settings', JSON.stringify(newSettings))
      return newSettings
    })
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(defaultAISettings)
    localStorage.setItem('ai-settings', JSON.stringify(defaultAISettings))
  }, [])

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
  }
} 