import type { Rect, Point } from '@/types';

export type SelectionMode = 'new' | 'add' | 'subtract' | 'intersect';

/**
 * SelectionMask - Binary mask for pixel-level selections
 * Provides efficient storage and manipulation of selection data
 * with support for feathering, anti-aliasing, and boolean operations
 */
export class SelectionMask {
  private data: Uint8Array;
  private width: number;
  private height: number;
  public bounds: Rect;
  
  constructor(width: number, height: number, x: number = 0, y: number = 0) {
    this.width = width;
    this.height = height;
    this.bounds = { x, y, width, height };
    this.data = new Uint8Array(width * height);
  }
  
  /**
   * Set a pixel value in the mask (0-255)
   */
  setPixel(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const index = y * this.width + x;
    this.data[index] = Math.max(0, Math.min(255, Math.round(value)));
  }
  
  /**
   * Get a pixel value from the mask (0-255)
   */
  getPixel(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    const index = y * this.width + x;
    return this.data[index];
  }
  
  /**
   * Clear the entire mask
   */
  clear(): void {
    this.data.fill(0);
  }
  
  /**
   * Fill the entire mask
   */
  fill(value: number = 255): void {
    this.data.fill(Math.max(0, Math.min(255, Math.round(value))));
  }
  
  /**
   * Invert the selection
   */
  invert(): void {
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = 255 - this.data[i];
    }
  }
  
  /**
   * Apply feathering to soften selection edges
   */
  applyFeather(radius: number): void {
    if (radius <= 0) return;
    
    const tempData = new Uint8Array(this.data);
    const radiusInt = Math.ceil(radius);
    const radiusSq = radius * radius;
    
    // Create a normalized gaussian kernel
    const kernelSize = radiusInt * 2 + 1;
    const kernel: number[] = [];
    let kernelSum = 0;
    
    for (let y = -radiusInt; y <= radiusInt; y++) {
      for (let x = -radiusInt; x <= radiusInt; x++) {
        const distSq = x * x + y * y;
        if (distSq <= radiusSq) {
          const weight = Math.exp(-(distSq / (2 * radius * radius)));
          kernel.push(weight);
          kernelSum += weight;
        } else {
          kernel.push(0);
        }
      }
    }
    
    // Normalize kernel
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= kernelSum;
    }
    
    // Apply convolution
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let ky = -radiusInt; ky <= radiusInt; ky++) {
          for (let kx = -radiusInt; kx <= radiusInt; kx++) {
            const px = x + kx;
            const py = y + ky;
            
            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
              const kernelIndex = (ky + radiusInt) * kernelSize + (kx + radiusInt);
              const weight = kernel[kernelIndex];
              
              if (weight > 0) {
                const pixelIndex = py * this.width + px;
                sum += tempData[pixelIndex] * weight;
                weightSum += weight;
              }
            }
          }
        }
        
        if (weightSum > 0) {
          const index = y * this.width + x;
          this.data[index] = Math.round(sum / weightSum);
        }
      }
    }
  }
  
  /**
   * Apply anti-aliasing to smooth jagged edges
   */
  applyAntiAlias(): void {
    const tempData = new Uint8Array(this.data);
    
    // 3x3 anti-aliasing kernel
    const kernel = [
      1/16, 2/16, 1/16,
      2/16, 4/16, 2/16,
      1/16, 2/16, 1/16
    ];
    
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        let sum = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = x + kx;
            const py = y + ky;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            const pixelIndex = py * this.width + px;
            
            sum += tempData[pixelIndex] * kernel[kernelIndex];
          }
        }
        
        const index = y * this.width + x;
        this.data[index] = Math.round(sum);
      }
    }
  }
  
  /**
   * Combine with another mask using boolean operations
   */
  combine(other: SelectionMask, mode: SelectionMode, offset: Point = { x: 0, y: 0 }): void {
    for (let y = 0; y < other.height; y++) {
      for (let x = 0; x < other.width; x++) {
        const targetX = x + offset.x - this.bounds.x + other.bounds.x;
        const targetY = y + offset.y - this.bounds.y + other.bounds.y;
        
        if (targetX >= 0 && targetX < this.width && targetY >= 0 && targetY < this.height) {
          const targetIndex = targetY * this.width + targetX;
          const sourceIndex = y * other.width + x;
          const currentValue = this.data[targetIndex];
          const otherValue = other.data[sourceIndex];
          
          switch (mode) {
            case 'new':
              this.data[targetIndex] = otherValue;
              break;
              
            case 'add':
              this.data[targetIndex] = Math.min(255, currentValue + otherValue);
              break;
              
            case 'subtract':
              this.data[targetIndex] = Math.max(0, currentValue - otherValue);
              break;
              
            case 'intersect':
              this.data[targetIndex] = Math.min(currentValue, otherValue);
              break;
          }
        }
      }
    }
  }
  
  /**
   * Grow the selection by a number of pixels
   */
  grow(pixels: number): void {
    if (pixels <= 0) return;
    
    const tempData = new Uint8Array(this.data);
    const radiusInt = Math.ceil(pixels);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        
        if (tempData[index] === 0) {
          // Check if any neighboring pixel within radius is selected
          let hasNeighbor = false;
          
          for (let dy = -radiusInt; dy <= radiusInt && !hasNeighbor; dy++) {
            for (let dx = -radiusInt; dx <= radiusInt && !hasNeighbor; dx++) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= pixels) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                  const neighborIndex = ny * this.width + nx;
                  if (tempData[neighborIndex] > 0) {
                    hasNeighbor = true;
                  }
                }
              }
            }
          }
          
          if (hasNeighbor) {
            this.data[index] = 255;
          }
        }
      }
    }
  }
  
  /**
   * Shrink the selection by a number of pixels
   */
  shrink(pixels: number): void {
    if (pixels <= 0) return;
    
    const tempData = new Uint8Array(this.data);
    const radiusInt = Math.ceil(pixels);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        
        if (tempData[index] > 0) {
          // Check if any neighboring pixel within radius is not selected
          let hasEmptyNeighbor = false;
          
          for (let dy = -radiusInt; dy <= radiusInt && !hasEmptyNeighbor; dy++) {
            for (let dx = -radiusInt; dx <= radiusInt && !hasEmptyNeighbor; dx++) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= pixels) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                  hasEmptyNeighbor = true;
                } else {
                  const neighborIndex = ny * this.width + nx;
                  if (tempData[neighborIndex] === 0) {
                    hasEmptyNeighbor = true;
                  }
                }
              }
            }
          }
          
          if (hasEmptyNeighbor) {
            this.data[index] = 0;
          }
        }
      }
    }
  }
  
  /**
   * Create a border selection from the current selection
   */
  border(width: number): void {
    const originalData = new Uint8Array(this.data);
    this.shrink(width);
    
    // Subtract shrunken selection from original
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = Math.max(0, originalData[i] - this.data[i]);
    }
  }
  
  /**
   * Get the bounding box of the selection
   */
  getBounds(): Rect {
    let minX = this.width;
    let minY = this.height;
    let maxX = -1;
    let maxY = -1;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        if (this.data[index] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (maxX < 0 || maxY < 0) {
      return { x: this.bounds.x, y: this.bounds.y, width: 0, height: 0 };
    }
    
    return {
      x: this.bounds.x + minX,
      y: this.bounds.y + minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  }
  
  /**
   * Check if a point is selected
   */
  isSelected(x: number, y: number): boolean {
    const localX = x - this.bounds.x;
    const localY = y - this.bounds.y;
    return this.getPixel(localX, localY) > 0;
  }
  
  /**
   * Get the selection value at a point (0-1)
   */
  getSelectionValue(x: number, y: number): number {
    const localX = x - this.bounds.x;
    const localY = y - this.bounds.y;
    return this.getPixel(localX, localY) / 255;
  }
  
  /**
   * Count the number of selected pixels
   */
  getSelectedPixelCount(): number {
    let count = 0;
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] > 0) count++;
    }
    return count;
  }
  
  /**
   * Clone the selection mask
   */
  clone(): SelectionMask {
    const clone = new SelectionMask(this.width, this.height, this.bounds.x, this.bounds.y);
    clone.data.set(this.data);
    return clone;
  }
  
  /**
   * Export mask as ImageData for visualization
   */
  toImageData(color: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 }): ImageData {
    const imageData = new ImageData(this.width, this.height);
    const pixels = imageData.data;
    
    for (let i = 0; i < this.data.length; i++) {
      const value = this.data[i];
      const pixelIndex = i * 4;
      
      pixels[pixelIndex] = color.r;
      pixels[pixelIndex + 1] = color.g;
      pixels[pixelIndex + 2] = color.b;
      pixels[pixelIndex + 3] = value;
    }
    
    return imageData;
  }
  
  /**
   * Create from ImageData alpha channel
   */
  static fromImageData(imageData: ImageData, threshold: number = 128): SelectionMask {
    const mask = new SelectionMask(imageData.width, imageData.height);
    const pixels = imageData.data;
    
    for (let i = 0; i < mask.data.length; i++) {
      const alpha = pixels[i * 4 + 3];
      mask.data[i] = alpha >= threshold ? 255 : 0;
    }
    
    return mask;
  }
}