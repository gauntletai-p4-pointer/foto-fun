import { Brain, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

export interface WorkflowProgress {
  currentStep: string
  steps: Array<{
    id: string
    label: string
    icon: React.ReactNode
    status: 'pending' | 'active' | 'completed'
  }>
  progress: number
}

export function WorkflowProgressIndicator({ progress }: { progress: WorkflowProgress }) {
  return (
    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
        <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
          AI Agent Working: {progress.currentStep}
        </span>
      </div>
      
      <div className="space-y-2">
        {progress.steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
              step.status === 'completed' && "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
              step.status === 'active' && "bg-primary/10 dark:bg-primary/20 text-primary animate-pulse",
              step.status === 'pending' && "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
            )}>
              {step.status === 'completed' ? (
                <Check className="w-4 h-4" />
              ) : (
                step.icon
              )}
            </div>
            <span className={cn(
              "text-sm transition-all duration-300",
              step.status === 'completed' && "text-green-700 dark:text-green-300 font-medium",
              step.status === 'active' && "text-primary font-medium",
              step.status === 'pending' && "text-gray-500 dark:text-gray-400"
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      
      <Progress value={progress.progress} className="mt-3 h-1.5" />
    </div>
  )
} 