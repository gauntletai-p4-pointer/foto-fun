'use client'

import { useState, useEffect } from 'react'
import { featureManager, type Feature } from '@/lib/config/features'

interface FeatureGateProps {
  feature: Feature
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback = null
}: FeatureGateProps) {
  const [mounted, setMounted] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (!mounted) return
    
    // Check if feature is enabled
    const enabled = featureManager.isFeatureEnabled(feature)
    setIsEnabled(enabled)
  }, [feature, mounted])
  
  // During SSR, show fallback to avoid hydration issues
  if (!mounted) {
    return <>{fallback}</>
  }
  
  if (isEnabled) {
    return <>{children}</>
  }
  
  return <>{fallback}</>
} 