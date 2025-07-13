import type { Point } from '@/types';

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Brush {
  size: number;
  hardness: number;  // 0-1
  opacity: number;   // 0-1
  flow: number;      // 0-1
  color: Color;
  blendMode: BlendMode;
  shape?: Float32Array;  // Custom brush shape
  pressure?: number;     // Current pressure 0-1
}

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'soft-light' 
  | 'hard-light'
  | 'color-dodge'
  | 'color-burn'
  | 'darken'
  | 'lighten'
  | 'difference'
  | 'exclusion';

/**
 * PixelBuffer - Efficient pixel manipulation for drawing operations
 * Provides low-level pixel access and drawing primitives
 */
export class PixelBuffer {
  private data: Uint8ClampedArray;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  
  constructor(
    private imageData: ImageData,
    private width: number,
    private height: number
  ) {
    this.data = imageData.data;
    
    // Create temporary canvas for complex operations
    this.tempCanvas = document.createElement('canvas');
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    this.tempCtx = this.tempCanvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: true
    })!;
  }

  /**
   * Get the ImageData object
   */
  getImageData(): ImageData {
    return this.imageData;
  }
  
  /**
   * Get pixel color at coordinates
   */
  getPixel(x: number, y: number): Color {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    
    const i = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    return {
      r: this.data[i],
      g: this.data[i + 1],
      b: this.data[i + 2],
      a: this.data[i + 3]
    };
  }
  
  /**
   * Set pixel color at coordinates
   */
  setPixel(x: number, y: number, color: Color): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    
    const i = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    this.data[i] = color.r;
    this.data[i + 1] = color.g;
    this.data[i + 2] = color.b;
    this.data[i + 3] = color.a;
  }
  
  /**
   * Apply brush at a point
   */
  applyBrush(point: Point, brush: Brush): void {
    const radius = Math.ceil(brush.size / 2);
    const startX = Math.max(0, Math.floor(point.x - radius));
    const endX = Math.min(this.width - 1, Math.ceil(point.x + radius));
    const startY = Math.max(0, Math.floor(point.y - radius));
    const endY = Math.min(this.height - 1, Math.ceil(point.y + radius));
    
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dx = x - point.x;
        const dy = y - point.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= radius) {
          // Calculate brush intensity at this pixel
          const intensity = this.calculateBrushIntensity(distance, radius, brush.hardness);
          if (intensity > 0) {
            const alpha = intensity * brush.opacity * brush.flow * (brush.pressure || 1.0);
            this.blendPixel(x, y, brush.color, alpha, brush.blendMode);
          }
        }
      }
    }
  }
  
  /**
   * Draw a line between two points
   */
  drawLine(from: Point, to: Point, brush: Brush): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) {
      this.applyBrush(from, brush);
      return;
    }
    
    // Calculate spacing based on brush size
    const spacing = Math.max(1, brush.size * 0.25);
    const steps = Math.ceil(distance / spacing);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: from.x + dx * t,
        y: from.y + dy * t
      };
      this.applyBrush(point, brush);
    }
  }
  
  /**
   * Apply ImageData with blend mode
   */
  applyImageData(sourceData: ImageData, blendMode: BlendMode, opacity: number = 1.0): void {
    const sourcePixels = sourceData.data;
    const sourceWidth = sourceData.width;
    const sourceHeight = sourceData.height;
    
    for (let y = 0; y < sourceHeight && y < this.height; y++) {
      for (let x = 0; x < sourceWidth && x < this.width; x++) {
        const sourceIndex = (y * sourceWidth + x) * 4;
        const destIndex = (y * this.width + x) * 4;
        
        const sourceColor: Color = {
          r: sourcePixels[sourceIndex],
          g: sourcePixels[sourceIndex + 1],
          b: sourcePixels[sourceIndex + 2],
          a: sourcePixels[sourceIndex + 3]
        };
        
        if (sourceColor.a > 0) {
          const alpha = (sourceColor.a / 255) * opacity;
          this.blendPixelByIndex(destIndex, sourceColor, alpha, blendMode);
        }
      }
    }
  }
  
  /**
   * Clear a rectangular area
   */
  clearRect(x: number, y: number, width: number, height: number): void {
    const startX = Math.max(0, Math.floor(x));
    const endX = Math.min(this.width, Math.ceil(x + width));
    const startY = Math.max(0, Math.floor(y));
    const endY = Math.min(this.height, Math.ceil(y + height));
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const i = (y * this.width + x) * 4;
        this.data[i] = 0;
        this.data[i + 1] = 0;
        this.data[i + 2] = 0;
        this.data[i + 3] = 0;
      }
    }
  }
  
  /**
   * Fill a rectangular area with color
   */
  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    const startX = Math.max(0, Math.floor(x));
    const endX = Math.min(this.width, Math.ceil(x + width));
    const startY = Math.max(0, Math.floor(y));
    const endY = Math.min(this.height, Math.ceil(y + height));
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        this.setPixel(x, y, color);
      }
    }
  }
  
  /**
   * Get a region of pixels as ImageData
   */
  getRegion(x: number, y: number, width: number, height: number): ImageData {
    const regionData = new ImageData(width, height);
    const regionPixels = regionData.data;
    
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const sourceX = x + dx;
        const sourceY = y + dy;
        
        if (sourceX >= 0 && sourceX < this.width && sourceY >= 0 && sourceY < this.height) {
          const sourceIndex = (sourceY * this.width + sourceX) * 4;
          const destIndex = (dy * width + dx) * 4;
          
          regionPixels[destIndex] = this.data[sourceIndex];
          regionPixels[destIndex + 1] = this.data[sourceIndex + 1];
          regionPixels[destIndex + 2] = this.data[sourceIndex + 2];
          regionPixels[destIndex + 3] = this.data[sourceIndex + 3];
        }
      }
    }
    
    return regionData;
  }
  
  /**
   * Apply a filter to the entire buffer
   */
  applyFilter(filter: (color: Color, x: number, y: number) => Color): void {
    const tempData = new Uint8ClampedArray(this.data);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        const color: Color = {
          r: tempData[i],
          g: tempData[i + 1],
          b: tempData[i + 2],
          a: tempData[i + 3]
        };
        
        const newColor = filter(color, x, y);
        this.data[i] = newColor.r;
        this.data[i + 1] = newColor.g;
        this.data[i + 2] = newColor.b;
        this.data[i + 3] = newColor.a;
      }
    }
  }
  
  // Private helper methods
  
  private calculateBrushIntensity(distance: number, radius: number, hardness: number): number {
    if (distance > radius) return 0;
    
    if (hardness >= 1.0) {
      return 1.0;
    }
    
    const falloffStart = radius * hardness;
    if (distance <= falloffStart) {
      return 1.0;
    }
    
    const falloffDistance = distance - falloffStart;
    const falloffRange = radius - falloffStart;
    let intensity = 1.0 - (falloffDistance / falloffRange);
    
    // Apply quadratic falloff for smoother edges
    intensity = intensity * intensity;
    
    return Math.max(0, Math.min(1, intensity));
  }
  
  private blendPixel(x: number, y: number, color: Color, alpha: number, blendMode: BlendMode): void {
    const i = (y * this.width + x) * 4;
    this.blendPixelByIndex(i, color, alpha, blendMode);
  }
  
  private blendPixelByIndex(index: number, sourceColor: Color, alpha: number, blendMode: BlendMode): void {
    const destR = this.data[index];
    const destG = this.data[index + 1];
    const destB = this.data[index + 2];
    const destA = this.data[index + 3];
    
    // Calculate blended color based on blend mode
    let blendedR: number, blendedG: number, blendedB: number;
    
    switch (blendMode) {
      case 'multiply':
        blendedR = (sourceColor.r * destR) / 255;
        blendedG = (sourceColor.g * destG) / 255;
        blendedB = (sourceColor.b * destB) / 255;
        break;
        
      case 'screen':
        blendedR = 255 - ((255 - sourceColor.r) * (255 - destR)) / 255;
        blendedG = 255 - ((255 - sourceColor.g) * (255 - destG)) / 255;
        blendedB = 255 - ((255 - sourceColor.b) * (255 - destB)) / 255;
        break;
        
      case 'overlay':
        blendedR = destR < 128 
          ? (2 * sourceColor.r * destR) / 255
          : 255 - (2 * (255 - sourceColor.r) * (255 - destR)) / 255;
        blendedG = destG < 128
          ? (2 * sourceColor.g * destG) / 255
          : 255 - (2 * (255 - sourceColor.g) * (255 - destG)) / 255;
        blendedB = destB < 128
          ? (2 * sourceColor.b * destB) / 255
          : 255 - (2 * (255 - sourceColor.b) * (255 - destB)) / 255;
        break;
        
      case 'soft-light':
        blendedR = this.softLight(sourceColor.r, destR);
        blendedG = this.softLight(sourceColor.g, destG);
        blendedB = this.softLight(sourceColor.b, destB);
        break;
        
      case 'hard-light':
        blendedR = sourceColor.r < 128
          ? (2 * sourceColor.r * destR) / 255
          : 255 - (2 * (255 - sourceColor.r) * (255 - destR)) / 255;
        blendedG = sourceColor.g < 128
          ? (2 * sourceColor.g * destG) / 255
          : 255 - (2 * (255 - sourceColor.g) * (255 - destG)) / 255;
        blendedB = sourceColor.b < 128
          ? (2 * sourceColor.b * destB) / 255
          : 255 - (2 * (255 - sourceColor.b) * (255 - destB)) / 255;
        break;
        
      case 'color-dodge':
        blendedR = destR === 0 ? 0 : Math.min(255, (sourceColor.r * 255) / (255 - destR));
        blendedG = destG === 0 ? 0 : Math.min(255, (sourceColor.g * 255) / (255 - destG));
        blendedB = destB === 0 ? 0 : Math.min(255, (sourceColor.b * 255) / (255 - destB));
        break;
        
      case 'color-burn':
        blendedR = destR === 255 ? 255 : Math.max(0, 255 - ((255 - sourceColor.r) * 255) / destR);
        blendedG = destG === 255 ? 255 : Math.max(0, 255 - ((255 - sourceColor.g) * 255) / destG);
        blendedB = destB === 255 ? 255 : Math.max(0, 255 - ((255 - sourceColor.b) * 255) / destB);
        break;
        
      case 'darken':
        blendedR = Math.min(sourceColor.r, destR);
        blendedG = Math.min(sourceColor.g, destG);
        blendedB = Math.min(sourceColor.b, destB);
        break;
        
      case 'lighten':
        blendedR = Math.max(sourceColor.r, destR);
        blendedG = Math.max(sourceColor.g, destG);
        blendedB = Math.max(sourceColor.b, destB);
        break;
        
      case 'difference':
        blendedR = Math.abs(sourceColor.r - destR);
        blendedG = Math.abs(sourceColor.g - destG);
        blendedB = Math.abs(sourceColor.b - destB);
        break;
        
      case 'exclusion':
        blendedR = sourceColor.r + destR - (2 * sourceColor.r * destR) / 255;
        blendedG = sourceColor.g + destG - (2 * sourceColor.g * destG) / 255;
        blendedB = sourceColor.b + destB - (2 * sourceColor.b * destB) / 255;
        break;
        
      case 'normal':
      default:
        blendedR = sourceColor.r;
        blendedG = sourceColor.g;
        blendedB = sourceColor.b;
        break;
    }
    
    // Apply alpha blending
    const srcAlpha = (sourceColor.a / 255) * alpha;
    const destAlpha = destA / 255;
    const outAlpha = srcAlpha + destAlpha * (1 - srcAlpha);
    
    if (outAlpha > 0) {
      this.data[index] = Math.round((blendedR * srcAlpha + destR * destAlpha * (1 - srcAlpha)) / outAlpha);
      this.data[index + 1] = Math.round((blendedG * srcAlpha + destG * destAlpha * (1 - srcAlpha)) / outAlpha);
      this.data[index + 2] = Math.round((blendedB * srcAlpha + destB * destAlpha * (1 - srcAlpha)) / outAlpha);
      this.data[index + 3] = Math.round(outAlpha * 255);
    }
  }
  
  private softLight(a: number, b: number): number {
    const aa = a / 255;
    const bb = b / 255;
    
    if (aa < 0.5) {
      return Math.round(255 * (bb - (1 - 2 * aa) * bb * (1 - bb)));
    } else {
      const dd = bb < 0.25 
        ? ((16 * bb - 12) * bb + 4) * bb
        : Math.sqrt(bb);
      return Math.round(255 * (bb + (2 * aa - 1) * (dd - bb)));
    }
  }
} 