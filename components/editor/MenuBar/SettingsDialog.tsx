'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  featureManager,
  FEATURE_CATEGORIES,
  FEATURES,
  FEATURE_DEFINITIONS,
  type Feature,
  type FeatureCategory,
  getDeploymentMode,
} from '@/lib/config/features'
import { 
  AlertCircle, 
  Cloud, 
  Code, 
  Palette, 
  Users, 
  Settings,
  ExternalLink,
  X,
  Sparkles,
  Lock,
} from 'lucide-react'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categoryIcons: Record<FeatureCategory, React.ReactNode> = {
  [FEATURE_CATEGORIES.AI]: <Sparkles className="w-4 h-4" />,
  [FEATURE_CATEGORIES.COLLABORATION]: <Users className="w-4 h-4" />,
  [FEATURE_CATEGORIES.CLOUD]: <Cloud className="w-4 h-4" />,
  [FEATURE_CATEGORIES.ADVANCED_EDITING]: <Palette className="w-4 h-4" />,
  [FEATURE_CATEGORIES.INTEGRATIONS]: <Code className="w-4 h-4" />,
}

const categoryTitles: Record<FeatureCategory, string> = {
  [FEATURE_CATEGORIES.AI]: 'AI Features',
  [FEATURE_CATEGORIES.COLLABORATION]: 'Collaboration',
  [FEATURE_CATEGORIES.CLOUD]: 'Cloud Services',
  [FEATURE_CATEGORIES.ADVANCED_EDITING]: 'Advanced Editing',
  [FEATURE_CATEGORIES.INTEGRATIONS]: 'Integrations',
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [featureStates, setFeatureStates] = useState<Record<Feature, boolean>>({} as Record<Feature, boolean>)
  const [missingServices, setMissingServices] = useState<string[]>([])
  const isCloud = getDeploymentMode() === 'cloud'
  
  useEffect(() => {
    // Load current feature states
    const states: Record<Feature, boolean> = {} as Record<Feature, boolean>
    Object.keys(FEATURES).forEach(key => {
      const feature = FEATURES[key as keyof typeof FEATURES]
      states[feature] = featureManager.isFeatureAvailable(feature)
    })
    setFeatureStates(states)
    
    // Get missing services
    setMissingServices(featureManager.getMissingServices())
  }, [open])
  
  const handleFeatureToggle = (feature: Feature, enabled: boolean) => {
    featureManager.setFeatureEnabled(feature, enabled)
    setFeatureStates(prev => ({ ...prev, [feature]: enabled }))
  }
  
  const renderFeatureItem = (feature: Feature) => {
    const config = FEATURE_DEFINITIONS[feature]
    const status = featureManager.getFeatureStatus(feature)
    const isEnabled = featureStates[feature] || false
    const canConfigure = config.configurable && status.available
    
    return (
      <div key={feature} className="flex items-start space-x-3 py-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={feature} className="text-sm font-medium cursor-pointer">
              {config.name}
            </Label>
            {config.beta && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded">
                Beta
              </span>
            )}
            {config.requiresPlan && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                {config.requiresPlan.join('/')}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          
          {!status.available && status.reason && (
            <div className="mt-2 text-xs space-y-1">
              {status.missingService && (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <AlertCircle className="w-3 h-3" />
                  <span>Requires {status.missingService} service</span>
                </div>
              )}
              {status.requiredPlan && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Lock className="w-3 h-3" />
                  <span>Requires {status.requiredPlan.join(' or ')} plan</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Switch
          id={feature}
          checked={isEnabled}
          onCheckedChange={(checked: boolean) => handleFeatureToggle(feature, checked)}
          disabled={!canConfigure}
          className="data-[state=checked]:bg-primary"
        />
      </div>
    )
  }
  
  const renderCategoryContent = (category: FeatureCategory) => {
    const features = featureManager.getFeaturesByCategory(category)
    
    return (
      <div className="space-y-1">
        {features.map(renderFeatureItem)}
      </div>
    )
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure FotoFun features and services. {isCloud ? 'Cloud features are pre-configured.' : 'Enable features by configuring required services.'}
          </DialogDescription>
        </DialogHeader>
        
        {missingServices.length > 0 && !isCloud && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Some services are not configured:</p>
              <ul className="text-sm space-y-1">
                {missingServices.map(service => (
                  <li key={service} className="flex items-center gap-2">
                    <X className="w-3 h-3 text-red-500" />
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{service}</code>
                  </li>
                ))}
              </ul>
              <Button
                variant="link"
                size="sm"
                className="mt-2 p-0 h-auto"
                onClick={() => window.open('/docs/setup', '_blank')}
              >
                View setup guide
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue={FEATURE_CATEGORIES.AI} className="flex-1">
          <TabsList className="grid grid-cols-4 w-full">
            {Object.values(FEATURE_CATEGORIES).slice(0, 4).map(category => (
              <TabsTrigger key={category} value={category} className="text-xs">
                <span className="flex items-center gap-1.5">
                  {categoryIcons[category]}
                  <span className="hidden sm:inline">{categoryTitles[category]}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <ScrollArea className="h-[400px] mt-4">
            {Object.values(FEATURE_CATEGORIES).map(category => (
              <TabsContent key={category} value={category} className="px-1">
                {renderCategoryContent(category)}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {isCloud ? (
              <span className="flex items-center gap-1">
                <Cloud className="w-3 h-3" />
                Cloud deployment
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Self-hosted deployment
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload to apply changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 