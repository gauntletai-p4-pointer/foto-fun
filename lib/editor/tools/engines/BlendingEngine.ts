/**
 * BlendingEngine implements all Photoshop blend modes for pixel-perfect compositing
 */

interface ColorComponents {
  r: number
  g: number
  b: number
  a: number
}

export class BlendingEngine {
  /**
   * Blend two pixels using the specified blend mode
   */
  blendPixels(
    source: { r: number; g: number; b: number; a: number },
    destination: { r: number; g: number; b: number; a: number },
    mode: GlobalCompositeOperation,
    opacity: number = 1
  ): { r: number; g: number; b: number; a: number } {
    // Normalize values
    const src = {
      r: source.r / 255,
      g: source.g / 255,
      b: source.b / 255,
      a: source.a / 255 * opacity
    }
    
    const dst = {
      r: destination.r / 255,
      g: destination.g / 255,
      b: destination.b / 255,
      a: destination.a / 255
    }
    
    let result = { r: 0, g: 0, b: 0, a: 0 }
    
    // Apply blend mode
    switch (mode) {
      case 'source-over':
        result = this.normal(src, dst)
        break
      case 'multiply':
        result = this.multiply(src, dst)
        break
      case 'screen':
        result = this.screen(src, dst)
        break
      case 'overlay':
        result = this.overlay(src, dst)
        break
      case 'darken':
        result = this.darken(src, dst)
        break
      case 'lighten':
        result = this.lighten(src, dst)
        break
      case 'color-dodge':
        result = this.colorDodge(src, dst)
        break
      case 'color-burn':
        result = this.colorBurn(src, dst)
        break
      case 'hard-light':
        result = this.hardLight(src, dst)
        break
      case 'soft-light':
        result = this.softLight(src, dst)
        break
      case 'difference':
        result = this.difference(src, dst)
        break
      case 'exclusion':
        result = this.exclusion(src, dst)
        break
      default:
        result = this.normal(src, dst)
    }
    
    // Convert back to 0-255 range
    return {
      r: Math.round(result.r * 255),
      g: Math.round(result.g * 255),
      b: Math.round(result.b * 255),
      a: Math.round(result.a * 255)
    }
  }
  
  /**
   * Blend entire pixel arrays
   */
  blendImageData(
    source: ImageData,
    destination: ImageData,
    mode: GlobalCompositeOperation,
    opacity: number = 1
  ): ImageData {
    const result = new ImageData(destination.width, destination.height)
    const srcData = source.data
    const dstData = destination.data
    const resData = result.data
    
    for (let i = 0; i < srcData.length; i += 4) {
      const blended = this.blendPixels(
        { r: srcData[i], g: srcData[i + 1], b: srcData[i + 2], a: srcData[i + 3] },
        { r: dstData[i], g: dstData[i + 1], b: dstData[i + 2], a: dstData[i + 3] },
        mode,
        opacity
      )
      
      resData[i] = blended.r
      resData[i + 1] = blended.g
      resData[i + 2] = blended.b
      resData[i + 3] = blended.a
    }
    
    return result
  }
  
  // Blend mode implementations
  
  private normal(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    return {
      r: (src.r * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (src.g * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (src.b * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private multiply(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    return {
      r: (src.r * dst.r * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (src.g * dst.g * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (src.b * dst.b * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private screen(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    return {
      r: ((1 - (1 - src.r) * (1 - dst.r)) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: ((1 - (1 - src.g) * (1 - dst.g)) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: ((1 - (1 - src.b) * (1 - dst.b)) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private overlay(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    const overlayChannel = (s: number, d: number) => {
      if (d < 0.5) {
        return 2 * s * d
      } else {
        return 1 - 2 * (1 - s) * (1 - d)
      }
    }
    
    return {
      r: (overlayChannel(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (overlayChannel(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (overlayChannel(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private darken(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    return {
      r: (Math.min(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (Math.min(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (Math.min(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private lighten(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    return {
      r: (Math.max(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (Math.max(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (Math.max(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private colorDodge(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    const dodgeChannel = (s: number, d: number) => {
      if (s === 1) return 1
      return Math.min(1, d / (1 - s))
    }
    
    return {
      r: (dodgeChannel(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (dodgeChannel(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (dodgeChannel(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private colorBurn(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    const burnChannel = (s: number, d: number) => {
      if (s === 0) return 0
      return 1 - Math.min(1, (1 - d) / s)
    }
    
    return {
      r: (burnChannel(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (burnChannel(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (burnChannel(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private hardLight(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    const hardLightChannel = (s: number, d: number) => {
      if (s < 0.5) {
        return 2 * s * d
      } else {
        return 1 - 2 * (1 - s) * (1 - d)
      }
    }
    
    return {
      r: (hardLightChannel(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (hardLightChannel(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (hardLightChannel(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private softLight(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    const softLightChannel = (s: number, d: number) => {
      if (s < 0.5) {
        return 2 * s * d + d * d * (1 - 2 * s)
      } else {
        return 2 * d * (1 - s) + Math.sqrt(d) * (2 * s - 1)
      }
    }
    
    return {
      r: (softLightChannel(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (softLightChannel(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (softLightChannel(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private difference(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    return {
      r: (Math.abs(src.r - dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (Math.abs(src.g - dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (Math.abs(src.b - dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
  
  private exclusion(src: ColorComponents, dst: ColorComponents): ColorComponents {
    const alpha = src.a + dst.a * (1 - src.a)
    if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 }
    
    const exclusionChannel = (s: number, d: number) => {
      return s + d - 2 * s * d
    }
    
    return {
      r: (exclusionChannel(src.r, dst.r) * src.a + dst.r * dst.a * (1 - src.a)) / alpha,
      g: (exclusionChannel(src.g, dst.g) * src.a + dst.g * dst.a * (1 - src.a)) / alpha,
      b: (exclusionChannel(src.b, dst.b) * src.a + dst.b * dst.a * (1 - src.a)) / alpha,
      a: alpha
    }
  }
} 