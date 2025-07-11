// Text-specific types for FotoFun

import type Konva from 'konva'

export interface TextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: number | string
  fontStyle: 'normal' | 'italic' | 'oblique'
  textAlign: 'left' | 'center' | 'right' | 'justify'
  lineHeight: number
  letterSpacing: number
  color: string
  backgroundColor?: string
  underline: boolean
  overline: boolean
  linethrough: boolean
  textDecoration: string
}

export interface CharacterStyle extends TextStyle {
  baseline: number
  superscript: boolean
  subscript: boolean
  allCaps: boolean
  smallCaps: boolean
}

export interface ParagraphStyle {
  align: 'left' | 'center' | 'right' | 'justify'
  indentLeft: number
  indentRight: number
  indentFirst: number
  spaceBefore: number
  spaceAfter: number
  lineHeight: number
}

export interface FontInfo {
  family: string
  name: string
  category: 'system' | 'google' | 'adobe' | 'custom'
  variants?: string[]
  loaded?: boolean
}

export interface TextToolState {
  currentText: Konva.Text | null
  isEditing: boolean
  originalText: string
  lastClickTime: number
  lastClickPosition: { x: number; y: number }
}

export interface TextOnPathOptions {
  text: string
  path: Konva.Path
  fontSize?: number
  fontFamily?: string
  fill?: string
  spacing?: number
  offset?: number
  side?: 'left' | 'right'
}

export interface TextMetrics {
  width: number
  height: number
  ascent: number
  descent: number
  lineHeight: number
  actualBoundingBoxLeft: number
  actualBoundingBoxRight: number
  actualBoundingBoxAscent: number
  actualBoundingBoxDescent: number
} 