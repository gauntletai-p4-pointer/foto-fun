import { CanvasEvent } from '@/lib/events/core/Event'

/**
 * Event emitted when a gradient is applied to the canvas
 */
export class GradientAppliedEvent extends CanvasEvent {
  constructor(
    canvasId: string,
    public readonly gradientId: string,
    public readonly gradientType: string,
    public readonly startPoint: { x: number; y: number },
    public readonly endPoint: { x: number; y: number },
    public readonly stops: Array<{ offset: number; color: string; opacity: number }>,
    public readonly layerId: string,
    metadata: CanvasEvent['metadata']
  ) {
    super('gradient.applied', canvasId, metadata)
  }
  
  apply(currentState: unknown): unknown {
    // Gradient is already applied via Konva, this is for history tracking
    return currentState
  }
  
  reverse(): CanvasEvent | null {
    // Gradients are not easily reversible
    return null
  }
  
  canApply(): boolean {
    return true
  }
  
  getDescription(): string {
    return `Applied ${this.gradientType} gradient`
  }
  
  protected getEventData(): Record<string, unknown> {
    return {
      gradientId: this.gradientId,
      gradientType: this.gradientType,
      startPoint: this.startPoint,
      endPoint: this.endPoint,
      stops: this.stops,
      layerId: this.layerId
    }
  }
} 