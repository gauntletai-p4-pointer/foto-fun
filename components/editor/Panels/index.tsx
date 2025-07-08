'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Bot, Layers } from 'lucide-react'
import { AIChat } from './AIChat'

export function Panels() {
  const [activeTab, setActiveTab] = useState<'ai' | 'layers'>('ai')
  
  return (
    <div className="w-64 bg-background border-l border-border flex flex-col h-full">
      {/* Tab buttons */}
      <div className="border-b border-border flex">
        <button
          onClick={() => setActiveTab('ai')}
          className={cn(
            "flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            activeTab === 'ai'
              ? "text-foreground bg-secondary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <Bot className="w-4 h-4" />
          AI Chat
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={cn(
            "flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors",
            activeTab === 'layers'
              ? "text-foreground bg-secondary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <Layers className="w-4 h-4" />
          Layers
        </button>
      </div>
      
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'ai' ? (
          <AIChat />
        ) : (
          <div className="p-4 text-muted-foreground text-sm">
            <p>No layers yet</p>
          </div>
        )}
      </div>
    </div>
  )
} 