'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, AlertCircle, IterationCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EvaluationResultDisplayProps {
  evaluation: string
  successScore: number
  goalsMet: boolean
  iterationCount: number
  shouldContinue: boolean
  message: string
}

export function EvaluationResultDisplay({
  evaluation,
  successScore,
  goalsMet,
  iterationCount,
  shouldContinue,
  message
}: EvaluationResultDisplayProps) {
  const successPercentage = Math.round(successScore * 100)
  
  return (
    <div className="space-y-3 p-4 bg-foreground/5 rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {goalsMet ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : (
            <AlertCircle className="w-5 h-5 text-warning" />
          )}
          <span className="font-medium text-sm">Vision Analysis Complete</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <IterationCw className="w-3 h-3" />
            Iteration {iterationCount}/3
          </Badge>
          
          <Badge 
            variant={goalsMet ? "default" : "secondary"}
            className={cn(
              "text-xs",
              goalsMet && "bg-success hover:bg-success/90"
            )}
          >
            {successPercentage}% Success
          </Badge>
        </div>
      </div>
      
      {/* Success Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground/60">Success Score</span>
          <span className="font-medium">{successPercentage}%</span>
        </div>
        <Progress 
          value={successPercentage} 
          className="h-2"
        />
        <p className="text-xs text-foreground/60">
          {goalsMet ? "Goals achieved!" : "Room for improvement"}
        </p>
      </div>
      
      {/* Evaluation Details */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Analysis Results:</p>
        <div className="text-sm text-foreground/60 whitespace-pre-wrap bg-background/50 p-3 rounded">
          {evaluation}
        </div>
      </div>
      
      {/* Status Message */}
      <div className={cn(
        "text-sm p-3 rounded",
        goalsMet ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      )}>
        {message}
      </div>
      
      {/* Continue Indicator */}
      {shouldContinue && !goalsMet && (
        <div className="text-sm text-foreground/60 italic">
          The agent can continue improving the image. Would you like another iteration?
        </div>
      )}
      
      {/* Max Iterations Warning */}
      {iterationCount >= 3 && !goalsMet && (
        <div className="text-sm text-warning font-medium">
          Maximum iterations reached. Further improvements would require a new workflow.
        </div>
      )}
    </div>
  )
} 