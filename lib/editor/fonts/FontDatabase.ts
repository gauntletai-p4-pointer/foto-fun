/**
 * FontDatabase - Static database of available fonts
 * Organized by category for easy access
 */
export const FONT_DATABASE = {
  system: [
    'Arial',
    'Arial Black',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Helvetica',
    'Impact',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Palatino Linotype',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana'
  ],
  google: [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Raleway',
    'Poppins',
    'Merriweather',
    'Playfair Display',
    'Ubuntu',
    'Nunito',
    'Quicksand',
    'Bebas Neue',
    'Dancing Script',
    'Pacifico',
    'Caveat',
    'Satisfy',
    'Great Vibes',
    'Permanent Marker',
    'Amatic SC'
  ],
  adobe: [
    'Adobe Garamond',
    'Myriad Pro',
    'Minion Pro',
    'Adobe Caslon',
    'Futura PT',
    'Proxima Nova',
    'Brandon Grotesque'
  ]
}

/**
 * Font categories for UI display
 */
export const FONT_CATEGORIES = {
  'Sans Serif': [
    'Arial',
    'Helvetica',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Raleway',
    'Poppins',
    'Ubuntu',
    'Nunito',
    'Quicksand',
    'Proxima Nova',
    'Brandon Grotesque',
    'Futura PT',
    'Tahoma',
    'Verdana',
    'Lucida Sans Unicode',
    'Trebuchet MS',
    'Arial Black',
    'Impact'
  ],
  'Serif': [
    'Times New Roman',
    'Georgia',
    'Palatino Linotype',
    'Merriweather',
    'Playfair Display',
    'Adobe Garamond',
    'Minion Pro',
    'Adobe Caslon'
  ],
  'Display': [
    'Bebas Neue',
    'Oswald',
    'Permanent Marker',
    'Amatic SC',
    'Impact',
    'Arial Black'
  ],
  'Script': [
    'Dancing Script',
    'Pacifico',
    'Caveat',
    'Satisfy',
    'Great Vibes',
    'Comic Sans MS'
  ],
  'Monospace': [
    'Courier New',
    'Lucida Console'
  ]
}

/**
 * Default font stack fallbacks
 */
export const FONT_STACKS = {
  'sans-serif': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'serif': 'Georgia, Cambria, "Times New Roman", Times, serif',
  'monospace': 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
} 