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
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  Sparkles,
  Info,
  Brain,
  Shield,
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
  [FEATURE_CATEGORIES.AI]: 'AI',
  [FEATURE_CATEGORIES.COLLABORATION]: 'Collaboration',
  [FEATURE_CATEGORIES.CLOUD]: 'Cloud',
  [FEATURE_CATEGORIES.ADVANCED_EDITING]: 'Advanced',
  [FEATURE_CATEGORIES.INTEGRATIONS]: 'Integrations',
}

interface AISettings {
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

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [mounted, setMounted] = useState(false)
  const [featureStates, setFeatureStates] = useState<Record<Feature, boolean>>({} as Record<Feature, boolean>)
  const [showSetupHelp, setShowSetupHelp] = useState<Feature | null>(null)
  const [aiSettings, setAISettings] = useState<AISettings>(defaultAISettings)
  const isCloud = getDeploymentMode() === 'cloud'
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (!mounted) return
    
    // Load current feature states
    const states: Record<Feature, boolean> = {} as Record<Feature, boolean>
    Object.keys(FEATURES).forEach(key => {
      const feature = FEATURES[key as keyof typeof FEATURES]
      states[feature] = featureManager.isFeatureEnabled(feature)
    })
    setFeatureStates(states)
    
    // Load AI settings from localStorage
    const savedAISettings = localStorage.getItem('ai-settings')
    if (savedAISettings) {
      setAISettings(JSON.parse(savedAISettings))
    }
  }, [open, mounted])
  
  const handleFeatureToggle = (feature: Feature, enabled: boolean) => {
    const config = FEATURE_DEFINITIONS[feature]
    
    // For self-hosted users, show setup help when enabling a feature
    if (!isCloud && enabled && config.setupGuide) {
      setShowSetupHelp(feature)
    }
    
    featureManager.setFeatureEnabled(feature, enabled)
    setFeatureStates(prev => ({ ...prev, [feature]: enabled }))
  }

  const updateAISetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    const newSettings = { ...aiSettings, [key]: value }
    setAISettings(newSettings)
    localStorage.setItem('ai-settings', JSON.stringify(newSettings))
  }
  
  const renderFeatureItem = (feature: Feature) => {
    const config = FEATURE_DEFINITIONS[feature]
    const isEnabled = featureStates[feature] || false
    const isCloudOnly = config.cloudOnly && !isCloud
    const isComingSoon = config.status === 'coming-soon'
    
    return (
      <div key={feature} className="flex items-start space-x-3 py-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={feature} className="text-sm font-medium cursor-pointer">
              {config.name}
            </Label>
            {config.status === 'beta' && (
              <span className="text-xs px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded">
                Beta
              </span>
            )}
            {isComingSoon && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                Coming Soon
              </span>
            )}
            {isCloudOnly && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                Cloud Only
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        
        <Switch
          id={feature}
          checked={isEnabled}
          onCheckedChange={(checked: boolean) => handleFeatureToggle(feature, checked)}
          disabled={isCloudOnly || isComingSoon}
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

  const renderAISettings = () => {
    return (
      <div className="space-y-6">
        {/* Step-by-Step Mode */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Step-by-Step Mode</Label>
          <RadioGroup 
            value={aiSettings.stepByStepMode}
            onValueChange={(value) => updateAISetting('stepByStepMode', value as AISettings['stepByStepMode'])}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="always" id="always" />
              <Label htmlFor="always" className="font-normal cursor-pointer">
                Always show steps (recommended for learning)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="complex-only" id="complex" />
              <Label htmlFor="complex" className="font-normal cursor-pointer">
                Only for complex edits (3+ steps)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="never" id="never" />
              <Label htmlFor="never" className="font-normal cursor-pointer">
                Never (fastest, for experienced users)
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Auto-Approval Threshold */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-base font-medium">Auto-Approval Confidence Threshold</Label>
            <p className="text-sm text-muted-foreground">
              Operations with confidence above this threshold will be applied automatically
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Slider
              value={[aiSettings.autoApproveThreshold]}
              onValueChange={([value]) => updateAISetting('autoApproveThreshold', value)}
              min={0}
              max={1}
              step={0.05}
              className="flex-1"
            />
            <span className="w-14 text-sm font-medium text-right">
              {Math.round(aiSettings.autoApproveThreshold * 100)}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Manual approval for all</span>
            <span>Auto-approve high confidence</span>
          </div>
        </div>
        
        {/* Transparency Settings */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Transparency Settings</Label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confidence-scores" className="font-normal cursor-pointer">
                Show Confidence Scores
              </Label>
              <p className="text-xs text-muted-foreground">
                Display AI confidence levels for each operation
              </p>
            </div>
            <Switch
              id="confidence-scores"
              checked={aiSettings.showConfidenceScores}
              onCheckedChange={(checked) => updateAISetting('showConfidenceScores', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="approval-decisions" className="font-normal cursor-pointer">
                Show Approval Decisions
              </Label>
              <p className="text-xs text-muted-foreground">
                See when operations require manual approval
              </p>
            </div>
            <Switch
              id="approval-decisions"
              checked={aiSettings.showApprovalDecisions}
              onCheckedChange={(checked) => updateAISetting('showApprovalDecisions', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="educational-content" className="font-normal cursor-pointer">
                Show Educational Tips
              </Label>
              <p className="text-xs text-muted-foreground">
                Learn about tools as the AI uses them
              </p>
            </div>
            <Switch
              id="educational-content"
              checked={aiSettings.showEducationalContent}
              onCheckedChange={(checked) => updateAISetting('showEducationalContent', checked)}
            />
          </div>
        </div>
        
        {/* Info Alert */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            These settings help you control how much autonomy the AI has. Lower thresholds mean more manual approvals, giving you more control but requiring more interaction.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  // Don't render content until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
            <DialogDescription>
              Loading settings...
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
            <DialogDescription>
              {isCloud 
                ? 'Toggle features on or off. All features are pre-configured for cloud users.' 
                : 'Toggle features on or off. You\'ll see setup instructions for features that need configuration.'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={FEATURE_CATEGORIES.AI} className="flex-1">
            <TabsList className="grid grid-cols-5 w-full h-10 p-1">
              {Object.values(FEATURE_CATEGORIES).slice(0, 4).map(category => (
                <TabsTrigger key={category} value={category} className="text-xs px-3 data-[state=active]:text-foreground">
                  <span className="flex items-center gap-1.5">
                    {categoryIcons[category]}
                    <span className="hidden sm:inline">{categoryTitles[category]}</span>
                  </span>
                </TabsTrigger>
              ))}
              <TabsTrigger value="ai-settings" className="text-xs px-3 data-[state=active]:text-foreground">
                <span className="flex items-center gap-1.5">
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Agent</span>
                </span>
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="h-[400px] mt-4">
              {Object.values(FEATURE_CATEGORIES).map(category => (
                <TabsContent key={category} value={category} className="px-1">
                  {renderCategoryContent(category)}
                </TabsContent>
              ))}
              <TabsContent value="ai-settings" className="px-1">
                {renderAISettings()}
              </TabsContent>
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
      
      {/* Setup Help Dialog */}
      {showSetupHelp && (
        <Dialog open={!!showSetupHelp} onOpenChange={() => setShowSetupHelp(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Setup Required
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                To use <strong>{FEATURE_DEFINITIONS[showSetupHelp].name}</strong>, you need to complete the setup:
              </p>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <code className="block mt-2 p-2 bg-muted rounded text-xs">
                    {FEATURE_DEFINITIONS[showSetupHelp].setupGuide}
                  </code>
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSetupHelp(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowSetupHelp(null)
                    window.open('/docs/features', '_blank')
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Guide
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 