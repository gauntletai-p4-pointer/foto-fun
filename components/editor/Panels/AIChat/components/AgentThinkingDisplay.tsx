'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Brain, Camera, Search, Sparkles, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThinkingStep {
  id: string
  type: 'screenshot' | 'vision' | 'planning' | 'executing' | 'complete'
  message: string
  timestamp: string
  isActive: boolean
}

interface AgentThinkingDisplayProps {
  isThinking: boolean
  steps: ThinkingStep[]
  autoCollapse?: boolean
  className?: string
}

const stepIcons = {
  screenshot: Camera,
  vision: Search,
  planning: FileText,
  executing: Sparkles,
  complete: Brain
}

export function AgentThinkingDisplay({ 
  isThinking, 
  steps, 
  autoCollapse = true,
  className 
}: AgentThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(isThinking)
  
  // Auto-expand when thinking starts
  useEffect(() => {
    if (isThinking) {
      setIsExpanded(true)
    }
  }, [isThinking])
  
  // Auto-collapse when thinking completes (if enabled)
  useEffect(() => {
    if (!isThinking && autoCollapse && steps.length > 0) {
      // Delay collapse to let user see the final state
      const timer = setTimeout(() => {
        setIsExpanded(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isThinking, autoCollapse, steps.length])
  
  // Don't render if no steps
  if (steps.length === 0) return null
  
  const activeStep = steps.find(s => s.isActive)
  
  return (
    <div className={cn(
      "border rounded-lg bg-foreground/5 overflow-hidden transition-all duration-200",
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-foreground/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className={cn(
            "w-4 h-4",
            isThinking ? "text-primary animate-pulse" : "text-foreground/60"
          )} />
          <span className="font-medium text-sm">
            {isThinking ? 'Agent Thinking...' : 'Agent Analysis Complete'}
          </span>
          {activeStep && (
            <span className="text-xs text-foreground/60">
              - {activeStep.message}
            </span>
          )}
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-foreground/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-foreground/60" />
        )}
      </button>
      
      {/* Steps */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 border-t">
          {steps.map((step) => {
            const Icon = stepIcons[step.type] || Brain
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex items-start gap-3 py-1.5 transition-opacity",
                  step.isActive ? "opacity-100" : "opacity-60"
                )}
              >
                <Icon className={cn(
                  "w-4 h-4 mt-0.5 flex-shrink-0",
                  step.isActive ? "text-primary animate-pulse" : "text-foreground/60"
                )} />
                
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm",
                    step.isActive ? "text-foreground font-medium" : "text-foreground/60"
                  )}>
                    {step.message}
                  </p>
                  <p className="text-xs text-foreground/60">
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                
                {step.isActive && (
                  <div className="flex gap-1 mt-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-75" />
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-150" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 