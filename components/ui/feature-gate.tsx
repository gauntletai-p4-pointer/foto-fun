'use client'

import { featureManager, type Feature, FEATURE_DEFINITIONS } from '@/lib/config/features'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { AlertCircle, Lock, Settings } from 'lucide-react'

interface FeatureGateProps {
  feature: Feature
  children: React.ReactNode
  fallback?: React.ReactNode
  showUpgrade?: boolean
  silent?: boolean
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgrade = true,
  silent = false 
}: FeatureGateProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [status, setStatus] = useState<ReturnType<typeof featureManager.getFeatureStatus>>({ available: false })
  
  useEffect(() => {
    // Check feature availability
    const available = featureManager.isFeatureAvailable(feature)
    const featureStatus = featureManager.getFeatureStatus(feature)
    
    setIsAvailable(available)
    setStatus(featureStatus)
  }, [feature])
  
  if (isAvailable) {
    return <>{children}</>
  }
  
  if (silent || fallback) {
    return <>{fallback}</>
  }
  
  const featureConfig = FEATURE_DEFINITIONS[feature]
  const isCloud = process.env.NEXT_PUBLIC_DEPLOYMENT === 'cloud'
  
  const handleClick = () => {
    if (showUpgrade && !isAvailable) {
      setShowDialog(true)
    }
  }
  
  return (
    <>
      <div 
        className="relative opacity-50 cursor-not-allowed"
        onClick={handleClick}
      >
        <div className="pointer-events-none select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {featureConfig.name}
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>{featureConfig.description}</p>
              
              {status.missingService && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="font-medium">Required Service Not Configured</p>
                  {isCloud ? (
                    <p className="text-sm">This feature requires additional setup. Please contact support.</p>
                  ) : (
                    <div className="text-sm space-y-1">
                      <p>To enable this feature, configure the following service:</p>
                      <code className="block p-2 bg-background rounded text-xs">
                        {status.missingService}
                      </code>
                      <p>
                        See our{' '}
                        <a 
                          href="/docs/setup"
                          className="text-primary underline"
                          target="_blank"
                        >
                          setup guide
                        </a>{' '}
                        for details.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {status.requiredPlan && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="font-medium">Upgrade Required</p>
                  <p className="text-sm">
                    This feature requires a {status.requiredPlan.join(' or ')} plan.
                  </p>
                  {isCloud && (
                    <Button 
                      className="w-full mt-2"
                      onClick={() => window.open('/pricing')}
                    >
                      View Plans
                    </Button>
                  )}
                </div>
              )}
              
              {status.userDisabled && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="font-medium">Feature Disabled</p>
                  <p className="text-sm">
                    You have disabled this feature in settings.
                  </p>
                  <Button 
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => {
                      // TODO: Navigate to settings
                      setShowDialog(false)
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Open Settings
                  </Button>
                </div>
              )}
              
              {featureConfig.beta && (
                <div className="p-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-sm">
                  <p className="font-medium">Beta Feature</p>
                  <p className="text-xs mt-1">This feature is still in development and may change.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
} 