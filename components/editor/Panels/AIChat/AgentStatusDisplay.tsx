'use client'

import { useEffect, useState } from 'react'
import { Brain, Sparkles, Camera, Eye, Wrench, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusUpdate {
  type: string
  message: string
  details?: string
  timestamp: string
}

interface AgentStatusDisplayProps {
  statusUpdates: StatusUpdate[]
  isActive: boolean
}

export function AgentStatusDisplay({ statusUpdates, isActive }: AgentStatusDisplayProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null)
  const [fadeOut, setFadeOut] = useState(false)
  
  useEffect(() => {
    if (statusUpdates.length > 0) {
      const latestStatus = statusUpdates[statusUpdates.length - 1]
      setCurrentStatus(latestStatus)
      setFadeOut(false)
      
      // Auto-hide completed statuses after a delay
      if (latestStatus.type === 'plan-ready' || latestStatus.type === 'generating-response') {
        const timer = setTimeout(() => {
          setFadeOut(true)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [statusUpdates])
  
  if (!currentStatus || !isActive) return null
  
  // Map status types to icons
  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'analyzing-request':
      case 'analyzing-prompt':
        return <Brain className="w-4 h-4" />
      case 'screenshot':
        return <Camera className="w-4 h-4" />
      case 'vision-analysis':
        return <Eye className="w-4 h-4" />
      case 'planning':
      case 'planning-steps':
        return <Wrench className="w-4 h-4" />
      case 'plan-ready':
      case 'generating-response':
        return <CheckCircle2 className="w-4 h-4" />
      default:
        return <Sparkles className="w-4 h-4" />
    }
  }
  
  return (
    <div className={cn(
      "transition-all duration-300 ease-in-out",
      fadeOut && "opacity-0 scale-95"
    )}>
      <div className="flex items-center gap-2 px-3 py-2 bg-foreground/10 rounded-lg">
        <div className="text-primary animate-pulse">
          {getStatusIcon(currentStatus.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {currentStatus.message}
          </p>
          {currentStatus.details && (
            <p className="text-xs text-foreground/60 truncate">
              {currentStatus.details}
            </p>
          )}
        </div>
      </div>
    </div>
  )
} 