'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bot, Wrench } from 'lucide-react'

interface AgentModeToggleProps {
  agentMode: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
}

export function AgentModeToggle({ agentMode, onToggle, disabled }: AgentModeToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-foreground/10">
      <div className="flex items-center gap-2">
        <Label htmlFor="agent-mode" className="text-sm cursor-pointer">
          {agentMode ? (
            <>
              <Bot className="w-4 h-4 inline-block mr-1" />
              Agent Mode
            </>
          ) : (
            <>
              <Wrench className="w-4 h-4 inline-block mr-1" />
              Direct Mode
            </>
          )}
        </Label>
        <Switch
          id="agent-mode"
          checked={agentMode}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {agentMode 
          ? 'AI plans multi-step workflows'
          : 'AI executes tools directly'
        }
      </p>
    </div>
  )
} 