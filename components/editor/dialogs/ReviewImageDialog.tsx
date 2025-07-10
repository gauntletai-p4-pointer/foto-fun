'use client'

import { useCanvasStore } from '@/store/canvasStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useState, useRef, useCallback } from 'react'

export function ReviewImageDialog() {
  const reviewModal = useCanvasStore((state) => state.reviewModal)
  const setReviewModal = useCanvasStore((state) => state.setReviewModal)
  const [sliderPosition, setSliderPosition] = useState(50) // Percentage from left
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    updateSliderPosition(e)
  }, [])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    updateSliderPosition(e)
  }, [])
  
  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])
  
  const updateSliderPosition = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setSliderPosition(percentage)
  }, [])
  
  // Early return after all hooks are called
  if (!reviewModal) return null
  
  const handleClose = () => {
    setReviewModal(null)
  }
  
  const handleApplyInPlace = () => {
    reviewModal.onApplyInPlace()
  }
  
  const handleRejectChange = () => {
    reviewModal.onRejectChange()
  }
  
  const handleAcceptBoth = () => {
    reviewModal.onAcceptBoth()
  }
  
  return (
    <Dialog open={reviewModal.isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reviewModal.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Before/After Image Comparison with Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-foreground/80">Drag the slider to compare</h3>
              <div className="flex gap-4 text-xs text-foreground/60">
                <span>Before</span>
                <span>After</span>
              </div>
            </div>
            
            <div 
              ref={containerRef}
              className="relative aspect-[4/3] bg-foreground/5 rounded-lg overflow-hidden border border-foreground/10 cursor-col-resize select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* After Image (Right side) - Full image */}
              <div className="absolute inset-0">
                <Image
                  src={reviewModal.processedImage}
                  alt="Processed image"
                  fill
                  className="object-contain"
                  sizes="800px"
                  priority
                />
              </div>
              
              {/* Before Image (Left side) - Clipped */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ 
                  clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` 
                }}
              >
                <Image
                  src={reviewModal.originalImage}
                  alt="Original image"
                  fill
                  className="object-contain"
                  sizes="800px"
                  priority
                />
              </div>
              
              {/* Slider Handle */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              >
                {/* Slider Button */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-gray-200 flex items-center justify-center">
                  <div className="w-1 h-3 bg-gray-400 rounded-full"></div>
                </div>
              </div>
              
              {/* Labels */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                Before
              </div>
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                After
              </div>
            </div>
          </div>
          


          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-foreground/10">
            <Button 
              variant="outline" 
              onClick={handleRejectChange}
              className="flex-1 sm:flex-initial"
            >
              Reject Change
            </Button>
            <Button 
              variant="outline"
              onClick={handleAcceptBoth}
              className="flex-1 sm:flex-initial"
            >
              Accept Both
            </Button>
            <Button 
              onClick={handleApplyInPlace}
              className="flex-1 sm:flex-initial"
            >
              Apply Change in Place
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 