/**
 * Client-side only Konva import utility
 * This ensures Konva is only loaded in the browser environment
 */

let KonvaModule: typeof import('konva') | null = null;

export async function getKonva() {
  if (typeof window === 'undefined') {
    throw new Error('Konva can only be used on the client side');
  }

  if (!KonvaModule) {
    KonvaModule = await import('konva');
  }

  return KonvaModule.default;
}

// For type imports, this is safe to use
export type { default as Konva } from 'konva'; 