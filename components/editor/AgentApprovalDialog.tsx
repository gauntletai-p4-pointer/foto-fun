'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { StepResult, ApprovalDecision, ComparisonMode } from '@/lib/ai/agents/types'
import { ImageComparison } from './ImageComparison'
import { AlternativeGrid } from './AlternativeGrid'
import { ConfidenceIndicator } from './ConfidenceIndicator'

interface AgentApprovalDialogProps {
  isOpen: boolean
  onClose: () => void
  stepResult: StepResult
  onApprove: (decision: ApprovalDecision) => void
  defaultComparisonMode?: ComparisonMode
}

export function AgentApprovalDialog({
  isOpen,
  onClose,
  stepResult,
  onApprove,
  defaultComparisonMode = 'side-by-side'
}: AgentApprovalDialogProps) {
  const [selectedAlternative, setSelectedAlternative] = useState<number | null>(null)
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>(defaultComparisonMode)
  const [feedback, setFeedback] = useState('')
  const [rememberDecision, setRememberDecision] = useState(false)
  
  const hasAlternatives = stepResult.alternatives && stepResult.alternatives.length > 0
  
  const handleApprove = () => {
    const decision: ApprovalDecision = {
      action: 'approve',
      feedback: feedback || undefined,
      rememberDecision
    }
    onApprove(decision)
    onClose()
  }
  
  const handleReject = () => {
    const decision: ApprovalDecision = {
      action: 'reject',
      feedback: feedback || undefined,
      rememberDecision
    }
    onApprove(decision)
    onClose()
  }
  
  const handleSelectAlternative = () => {
    if (selectedAlternative === null) return
    
    const decision: ApprovalDecision = {
      action: 'modify',
      alternativeIndex: selectedAlternative,
      feedback: feedback || undefined,
      rememberDecision
    }
    onApprove(decision)
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review AI Edit</DialogTitle>
          <DialogDescription>
            The AI has proposed an edit with {Math.round(stepResult.confidence * 100)}% confidence.
            Review the changes and decide how to proceed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Confidence Indicator */}
          <ConfidenceIndicator confidence={stepResult.confidence} />
          
          {/* Main Preview */}
          {stepResult.preview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Preview</h3>
                <div className="flex gap-2">
                  {(['side-by-side', 'overlay', 'slider'] as ComparisonMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant={comparisonMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setComparisonMode(mode)}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
              
              <ImageComparison
                before={stepResult.preview.before}
                after={stepResult.preview.after}
                mode={comparisonMode}
              />
            </div>
          )}
          
          {/* Alternatives */}
          {hasAlternatives && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Alternative Options</h3>
              <AlternativeGrid
                alternatives={stepResult.alternatives!}
                selectedIndex={selectedAlternative}
                onSelect={setSelectedAlternative}
              />
            </div>
          )}
          
          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-sm">
              Feedback (optional)
            </Label>
            <textarea
              id="feedback"
              className="w-full min-h-[60px] p-2 text-sm border rounded-md"
              placeholder="Help the AI learn by providing feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          
          {/* Remember Decision */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberDecision}
              onChange={(e) => setRememberDecision(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="remember" className="text-sm">
              Remember this decision for similar edits
            </Label>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="destructive" onClick={handleReject}>
            Reject
          </Button>
          {hasAlternatives && selectedAlternative !== null && (
            <Button variant="secondary" onClick={handleSelectAlternative}>
              Use Alternative
            </Button>
          )}
          <Button onClick={handleApprove}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 