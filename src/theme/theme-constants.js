/**
 * Theme Constants
 * Single source of truth for all colors and theme values
 * Used across popup, content scripts, and all UI components
 */

// Base colors
export const COLORS = {
  // Primary brand colors
  primary: {
    dark: 'rgba(1, 22, 39, 0.95)',      // Main dark background
    darker: 'rgba(1, 22, 39, 0.98)',    // Header background
    light: 'rgba(1, 22, 39, 0.75)',     // Lighter variant
    solid: '#011627'                     // Solid version for fallback
  },
  
  // Text colors
  text: {
    primary: 'rgba(255, 255, 255, 0.9)',   // Main text
    secondary: 'rgba(255, 255, 255, 0.6)', // Muted text
    tertiary: 'rgba(255, 255, 255, 0.4)',  // Very muted
    inverse: '#1f2937'                      // For light backgrounds
  },
  
  // Surface colors (cards, panels)
  surface: {
    glass: 'rgba(255, 255, 255, 0.05)',    // Glassmorphic surface
    glassHover: 'rgba(255, 255, 255, 0.1)', // Hover state
    border: 'rgba(255, 255, 255, 0.1)',     // Border color
    borderLight: 'rgba(255, 255, 255, 0.2)', // Light border
    borderHover: 'rgba(255, 255, 255, 0.3)' // Border hover
  },
  
  // Highlight colors
  highlights: {
    yellow: '#ffe066',
    green: '#6ee7b7',
    blue: '#93c5fd',
    pink: '#fca5a5'
  },
  
  // Highlight colors with opacity (for backgrounds)
  highlightsBg: {
    yellow: 'rgba(255, 224, 102, 0.3)',
    green: 'rgba(110, 231, 183, 0.3)',
    blue: 'rgba(147, 197, 253, 0.3)',
    pink: 'rgba(252, 165, 165, 0.3)'
  },
  
  // Status colors
  status: {
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6'
  },
  
  // Legacy colors (for migration)
  legacy: {
    purple: '#667eea',
    purpleDark: '#764ba2'
  }
}

// Effects
export const EFFECTS = {
  blur: '10px',
  borderRadius: '8px',
  borderRadiusSmall: '4px',
  transition: 'all 0.2s ease',
  transitionFast: 'all 0.1s ease',
  shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowSmall: '0 2px 4px rgba(0, 0, 0, 0.2)',
  shadowMedium: '0 4px 8px rgba(0, 0, 0, 0.3)',
  shadowLarge: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
}

// Spacing
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px'
}

// Typography
export const TYPOGRAPHY = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    xs: '11px',
    sm: '12px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    xxl: '24px',
    xxxl: '28px'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75
  }
}

// Z-index layers
export const Z_INDEX = {
  base: 0,
  highlight: 10,
  highlightButton: 100,
  miniToolbar: 200,
  colorPicker: 300,
  modal: 1000,
  tooltip: 1100
}

// Glassmorphism styles
export const GLASSMORPHISM = {
  background: COLORS.surface.glass,
  backdropFilter: `blur(${EFFECTS.blur})`,
  webkitBackdropFilter: `blur(${EFFECTS.blur})`,
  border: `1px solid ${COLORS.surface.border}`
}

// Component-specific styles
export const COMPONENTS = {
  highlightButton: {
    background: COLORS.primary.light,
    backdropFilter: `blur(${EFFECTS.blur})`,
    border: `1px solid ${COLORS.surface.border}`,
    color: COLORS.text.primary,
    padding: `${SPACING.sm} ${SPACING.lg}`,
    borderRadius: EFFECTS.borderRadius,
    transition: EFFECTS.transition
  },
  
  miniToolbar: {
    ...GLASSMORPHISM,
    padding: SPACING.sm,
    borderRadius: EFFECTS.borderRadius,
    boxShadow: EFFECTS.shadowLarge
  },
  
  colorPicker: {
    ...GLASSMORPHISM,
    padding: SPACING.md,
    borderRadius: EFFECTS.borderRadius,
    gap: SPACING.xs
  },
  
  popup: {
    header: {
      background: COLORS.primary.darker,
      ...GLASSMORPHISM,
      borderBottom: `1px solid ${COLORS.surface.border}`,
      padding: SPACING.xl
    },
    
    body: {
      background: COLORS.primary.dark,
      color: COLORS.text.primary
    },
    
    card: {
      ...GLASSMORPHISM,
      padding: SPACING.lg,
      borderRadius: EFFECTS.borderRadius
    }
  }
}

// Helper function to apply theme styles
export function applyThemeStyles(element, styles) {
  Object.assign(element.style, styles)
}

// Helper function to get CSS variables string
export function getThemeCSSVariables() {
  return `
    :root {
      /* Colors */
      --color-primary-dark: ${COLORS.primary.dark};
      --color-primary-darker: ${COLORS.primary.darker};
      --color-primary-light: ${COLORS.primary.light};
      --color-text-primary: ${COLORS.text.primary};
      --color-text-secondary: ${COLORS.text.secondary};
      --color-surface-glass: ${COLORS.surface.glass};
      --color-surface-border: ${COLORS.surface.border};
      
      /* Highlights */
      --color-highlight-yellow: ${COLORS.highlights.yellow};
      --color-highlight-green: ${COLORS.highlights.green};
      --color-highlight-blue: ${COLORS.highlights.blue};
      --color-highlight-pink: ${COLORS.highlights.pink};
      
      /* Effects */
      --effect-blur: ${EFFECTS.blur};
      --effect-border-radius: ${EFFECTS.borderRadius};
      --effect-transition: ${EFFECTS.transition};
      
      /* Spacing */
      --spacing-xs: ${SPACING.xs};
      --spacing-sm: ${SPACING.sm};
      --spacing-md: ${SPACING.md};
      --spacing-lg: ${SPACING.lg};
      --spacing-xl: ${SPACING.xl};
    }
  `
}

// Export default theme object
export default {
  COLORS,
  EFFECTS,
  SPACING,
  TYPOGRAPHY,
  Z_INDEX,
  GLASSMORPHISM,
  COMPONENTS
}