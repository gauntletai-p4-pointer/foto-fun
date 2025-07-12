/**
 * PixelBuffer - Efficient pixel manipulation for image editing
 * Provides high-performance pixel operations with blend modes
 */
export class PixelBuffer {
  private imageData: ImageData;
  private width: number;
  private height: number;
  private data: Uint8ClampedArray;
  
  constructor(imageData: ImageData) {
    this.imageData = imageData;
    this.width = imageData.width;
    this.height = imageData.height;
    this.data = new Uint8ClampedArray(imageData.data);
  }
  
  /**
   * Get the current ImageData
   */
  getImageData(): ImageData {
    return new ImageData(this.data, this.width, this.height);
  }
  
  /**
   * Get pixel at coordinates
   */
  getPixel(x: number, y: number): { r: number; g: number; b: number; a: number } {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 };
    }
    
    const index = (y * this.width + x) * 4;
    return {
      r: this.data[index],
      g: this.data[index + 1],
      b: this.data[index + 2],
      a: this.data[index + 3]
    };
  }
  
  /**
   * Set pixel at coordinates
   */
  setPixel(x: number, y: number, r: number, g: number, b: number, a: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return;
    }
    
    const index = (y * this.width + x) * 4;
    this.data[index] = r;
    this.data[index + 1] = g;
    this.data[index + 2] = b;
    this.data[index + 3] = a;
  }
  
  /**
   * Apply ImageData with blend mode
   */
  applyImageData(sourceData: ImageData, blendMode: string): void {
    const source = sourceData.data;
    
    for (let i = 0; i < this.data.length; i += 4) {
      const srcR = source[i];
      const srcG = source[i + 1];
      const srcB = source[i + 2];
      const srcA = source[i + 3];
      
      if (srcA === 0) continue; // Skip transparent pixels
      
      const destR = this.data[i];
      const destG = this.data[i + 1];
      const destB = this.data[i + 2];
      const destA = this.data[i + 3];
      
      const blended = this.blendPixel(
        { r: srcR, g: srcG, b: srcB, a: srcA },
        { r: destR, g: destG, b: destB, a: destA },
        blendMode
      );
      
      this.data[i] = blended.r;
      this.data[i + 1] = blended.g;
      this.data[i + 2] = blended.b;
      this.data[i + 3] = blended.a;
    }
  }
  
  /**
   * Clear the buffer
   */
  clear(): void {
    this.data.fill(0);
  }
  
  /**
   * Fill with color
   */
  fill(r: number, g: number, b: number, a: number): void {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = a;
    }
  }
  
  /**
   * Copy region from another buffer
   */
  copyFrom(source: PixelBuffer, srcX: number, srcY: number, destX: number, destY: number, width: number, height: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcPixel = source.getPixel(srcX + x, srcY + y);
        this.setPixel(destX + x, destY + y, srcPixel.r, srcPixel.g, srcPixel.b, srcPixel.a);
      }
    }
  }
  
  /**
   * Create a copy of this buffer
   */
  clone(): PixelBuffer {
    const newImageData = new ImageData(this.width, this.height);
    newImageData.data.set(this.data);
    return new PixelBuffer(newImageData);
  }
  
  // Private blend mode implementations
  private blendPixel(
    source: { r: number; g: number; b: number; a: number },
    dest: { r: number; g: number; b: number; a: number },
    blendMode: string
  ): { r: number; g: number; b: number; a: number } {
    const srcA = source.a / 255;
    const destA = dest.a / 255;
    
    if (srcA === 0) return dest;
    if (destA === 0) return source;
    
    switch (blendMode) {
      case 'multiply':
        return {
          r: Math.round((source.r * dest.r) / 255),
          g: Math.round((source.g * dest.g) / 255),
          b: Math.round((source.b * dest.b) / 255),
          a: Math.round(255 * (srcA + destA * (1 - srcA)))
        };
        
      case 'screen':
        return {
          r: Math.round(255 - ((255 - source.r) * (255 - dest.r)) / 255),
          g: Math.round(255 - ((255 - source.g) * (255 - dest.g)) / 255),
          b: Math.round(255 - ((255 - source.b) * (255 - dest.b)) / 255),
          a: Math.round(255 * (srcA + destA * (1 - srcA)))
        };
        
      case 'overlay':
        return {
          r: dest.r < 128 
            ? Math.round(2 * source.r * dest.r / 255)
            : Math.round(255 - 2 * (255 - source.r) * (255 - dest.r) / 255),
          g: dest.g < 128 
            ? Math.round(2 * source.g * dest.g / 255)
            : Math.round(255 - 2 * (255 - source.g) * (255 - dest.g) / 255),
          b: dest.b < 128 
            ? Math.round(2 * source.b * dest.b / 255)
            : Math.round(255 - 2 * (255 - source.b) * (255 - dest.b) / 255),
          a: Math.round(255 * (srcA + destA * (1 - srcA)))
        };
        
      case 'soft-light':
        return {
          r: this.softLightBlend(source.r, dest.r),
          g: this.softLightBlend(source.g, dest.g),
          b: this.softLightBlend(source.b, dest.b),
          a: Math.round(255 * (srcA + destA * (1 - srcA)))
        };
        
      case 'hard-light':
        return {
          r: source.r < 128 
            ? Math.round(2 * source.r * dest.r / 255)
            : Math.round(255 - 2 * (255 - source.r) * (255 - dest.r) / 255),
          g: source.g < 128 
            ? Math.round(2 * source.g * dest.g / 255)
            : Math.round(255 - 2 * (255 - source.g) * (255 - dest.g) / 255),
          b: source.b < 128 
            ? Math.round(2 * source.b * dest.b / 255)
            : Math.round(255 - 2 * (255 - source.b) * (255 - dest.b) / 255),
          a: Math.round(255 * (srcA + destA * (1 - srcA)))
        };
        
      default: // 'normal'
        return {
          r: Math.round(source.r * srcA + dest.r * destA * (1 - srcA)),
          g: Math.round(source.g * srcA + dest.g * destA * (1 - srcA)),
          b: Math.round(source.b * srcA + dest.b * destA * (1 - srcA)),
          a: Math.round(255 * (srcA + destA * (1 - srcA)))
        };
    }
  }
  
  private softLightBlend(source: number, dest: number): number {
    const s = source / 255;
    const d = dest / 255;
    
    let result: number;
    if (s <= 0.5) {
      result = d - (1 - 2 * s) * d * (1 - d);
    } else {
      const g = d <= 0.25 ? ((16 * d - 12) * d + 4) * d : Math.sqrt(d);
      result = d + (2 * s - 1) * (g - d);
    }
    
    return Math.round(result * 255);
  }
} 