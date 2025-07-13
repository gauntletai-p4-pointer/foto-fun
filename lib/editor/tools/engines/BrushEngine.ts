import { PixelBuffer } from '@/lib/editor/pixel/PixelBuffer';

export interface BrushStrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface BrushStrokeData {
  id: string;
  targetObjectId: string;
  points: BrushStrokePoint[];
  options: BrushOptions;
  startTime: number;
}

export interface BrushOptions {
  size: number;
  opacity: number;
  color: string;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light';
  pressure: boolean;
  flow: number;
  hardness: number;
  spacing: number;
  roundness: number;
  angle: number;
}

/**
 * BrushEngine - Handles brush stroke rendering and pixel manipulation
 * Provides efficient brush painting with various brush properties
 */
export class BrushEngine {
  private options: BrushOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixelBuffer: PixelBuffer | null = null;
  
  constructor(options: BrushOptions) {
    this.options = { ...options };
    
    // Create temporary canvas for brush rendering
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Setup initial brush properties
    this.updateBrushSettings();
  }
  
  /**
   * Update brush options
   */
  updateOptions(options: BrushOptions): void {
    this.options = { ...options };
    this.updateBrushSettings();
  }
  
  /**
   * Start a new brush stroke
   */
  startStroke(strokeData: BrushStrokeData): void {
    if (strokeData.points.length === 0) return;
    
    const firstPoint = strokeData.points[0];
    
    // Setup canvas for stroke
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = this.getCompositeOperation(strokeData.options.blendMode);
    this.ctx.globalAlpha = strokeData.options.opacity / 100;
    
    // Draw initial brush dab
    this.drawBrushDab(firstPoint.x, firstPoint.y, firstPoint.pressure);
  }
  
  /**
   * Continue an existing brush stroke
   */
  continueStroke(strokeData: BrushStrokeData): void {
    if (strokeData.points.length < 2) return;
    
    const points = strokeData.points;
    const lastPoint = points[points.length - 2];
    const currentPoint = points[points.length - 1];
    
    // Draw stroke segment
    this.drawStrokeSegment(lastPoint, currentPoint);
  }
  
  /**
   * Complete a brush stroke
   */
  completeStroke(strokeData: BrushStrokeData): void {
    if (strokeData.points.length === 0) return;
    
    // Apply final stroke to pixel buffer if available
    if (this.pixelBuffer) {
      this.applyStrokeToPixelBuffer(strokeData);
    }
    
    // Clear temporary canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Set pixel buffer for direct pixel manipulation
   */
  setPixelBuffer(pixelBuffer: PixelBuffer): void {
    this.pixelBuffer = pixelBuffer;
  }
  
  /**
   * Get current brush preview as ImageData
   */
  getBrushPreview(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    this.pixelBuffer = null;
    // Canvas will be garbage collected
  }
  
  // Private methods
  private updateBrushSettings(): void {
    // Update canvas context properties based on brush options
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.fillStyle = this.options.color;
    this.ctx.strokeStyle = this.options.color;
  }
  
  private getCompositeOperation(blendMode: BrushOptions['blendMode']): GlobalCompositeOperation {
    switch (blendMode) {
      case 'multiply': return 'multiply';
      case 'screen': return 'screen';
      case 'overlay': return 'overlay';
      case 'soft-light': return 'soft-light';
      case 'hard-light': return 'hard-light';
      default: return 'source-over';
    }
  }
  
  private drawBrushDab(x: number, y: number, pressure: number): void {
    const size = this.options.size * (this.options.pressure ? pressure : 1.0);
    const opacity = (this.options.opacity / 100) * (this.options.flow / 100);
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    // Create brush shape
    if (this.options.roundness === 100) {
      // Circular brush
      this.drawCircularBrush(x, y, size);
    } else {
      // Elliptical brush
      this.drawEllipticalBrush(x, y, size);
    }
    
    this.ctx.restore();
  }
  
  private drawCircularBrush(x: number, y: number, size: number): void {
    const radius = size / 2;
    
    if (this.options.hardness === 100) {
      // Hard brush
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Soft brush with gradient
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
      const hardnessRatio = this.options.hardness / 100;
      
      gradient.addColorStop(0, this.options.color);
      gradient.addColorStop(hardnessRatio, this.options.color);
      gradient.addColorStop(1, this.options.color + '00'); // Transparent
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  private drawEllipticalBrush(x: number, y: number, size: number): void {
    const radiusX = size / 2;
    const radiusY = (size * this.options.roundness / 100) / 2;
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate((this.options.angle * Math.PI) / 180);
    
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  private drawStrokeSegment(from: BrushStrokePoint, to: BrushStrokePoint): void {
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );
    
    if (distance === 0) return;
    
    // Calculate number of dabs based on spacing
    const spacing = (this.options.size * this.options.spacing) / 100;
    const numDabs = Math.max(1, Math.floor(distance / spacing));
    
    // Draw interpolated dabs
    for (let i = 0; i <= numDabs; i++) {
      const t = i / numDabs;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const pressure = from.pressure + (to.pressure - from.pressure) * t;
      
      this.drawBrushDab(x, y, pressure);
    }
  }
  
  private applyStrokeToPixelBuffer(strokeData: BrushStrokeData): void {
    if (!this.pixelBuffer) return;
    
    // Get stroke data from canvas
    const strokeImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply to pixel buffer with proper blend mode mapping
    const blendMode = strokeData.options.blendMode;
    this.pixelBuffer.applyImageData(strokeImageData, blendMode, strokeData.options.opacity / 100);
  }
} 