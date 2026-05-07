import { useEffect } from 'react';
import { COLOR_PALETTES } from './Settings';

// CSS variables mapping for each palette
const getThemeVariables = (paletteId) => {
  const palette = COLOR_PALETTES.find(p => p.id === paletteId) || COLOR_PALETTES.find(p => p.id === 'blackwhite');
  
  switch (paletteId) {
    case 'default': // Azul (Actual)
      return {
        '--color-primary': '#3b82f6',
        '--color-primary-dark': '#2563eb',
        '--color-primary-light': '#60a5fa',
        '--color-secondary': '#64748b',
        '--color-accent': '#3b82f6',
        '--color-background': '#0f172a',
        '--color-surface': '#1e293b',
        '--color-surface-light': '#334155',
        '--color-text': '#ffffff',
        '--color-text-secondary': '#94a3b8',
        '--color-text-muted': '#64748b',
        '--color-border': '#475569',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'blackwhite': // Negro y Blanco
      return {
        '--color-primary': '#6b7280',
        '--color-primary-dark': '#4b5563',
        '--color-primary-light': '#9ca3af',
        '--color-secondary': '#6b7280',
        '--color-accent': '#6b7280',
        '--color-background': '#000000',
        '--color-surface': '#111827',
        '--color-surface-light': '#1f2937',
        '--color-text': '#ffffff',
        '--color-text-secondary': '#d1d5db',
        '--color-text-muted': '#9ca3af',
        '--color-border': '#374151',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'pinkblue': // Rosa y Azul
      return {
        '--color-primary': '#ec4899',
        '--color-primary-dark': '#db2777',
        '--color-primary-light': '#f472b6',
        '--color-secondary': '#3b82f6',
        '--color-accent': '#ec4899',
        '--color-background': '#0f172a',
        '--color-surface': '#1e293b',
        '--color-surface-light': '#334155',
        '--color-text': '#ffffff',
        '--color-text-secondary': '#94a3b8',
        '--color-text-muted': '#64748b',
        '--color-border': '#475569',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'redblue': // Roja y Azul
      return {
        '--color-primary': '#ef4444',
        '--color-primary-dark': '#dc2626',
        '--color-primary-light': '#f87171',
        '--color-secondary': '#3b82f6',
        '--color-accent': '#ef4444',
        '--color-background': '#0f172a',
        '--color-surface': '#1e293b',
        '--color-surface-light': '#334155',
        '--color-text': '#ffffff',
        '--color-text-secondary': '#94a3b8',
        '--color-text-muted': '#64748b',
        '--color-border': '#475569',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'brownwhite': // Café y Blanco
      return {
        '--color-primary': '#d97706',
        '--color-primary-dark': '#b45309',
        '--color-primary-light': '#f59e0b',
        '--color-secondary': '#78716c',
        '--color-accent': '#d97706',
        '--color-background': '#1c1917',
        '--color-surface': '#292524',
        '--color-surface-light': '#44403c',
        '--color-text': '#ffffff',
        '--color-text-secondary': '#d6d3d1',
        '--color-text-muted': '#a8a29e',
        '--color-border': '#57534e',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'creamblack': // Crema y Negro
      return {
        '--color-primary': '#eab308',
        '--color-primary-dark': '#ca8a04',
        '--color-primary-light': '#fde047',
        '--color-secondary': '#78716c',
        '--color-accent': '#eab308',
        '--color-background': '#1c1917',
        '--color-surface': '#292524',
        '--color-surface-light': '#44403c',
        '--color-text': '#ffffff',
        '--color-text-secondary': '#d6d3d1',
        '--color-text-muted': '#a8a29e',
        '--color-border': '#57534e',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'blackyellow': // Negro y Amarillo
      return {
        '--color-primary': '#facc15',
        '--color-primary-dark': '#eab308',
        '--color-primary-light': '#fde047',
        '--color-secondary': '#6b7280',
        '--color-accent': '#facc15',
        '--color-background': '#000000',
        '--color-surface': '#111827',
        '--color-surface-light': '#1f2937',
        '--color-text': '#ffffff',
        '--color-text-secondary': '#d1d5db',
        '--color-text-muted': '#9ca3af',
        '--color-border': '#374151',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'wells': // Wells Beige
      return {
        '--color-primary': '#78716c',
        '--color-primary-dark': '#57534e',
        '--color-primary-light': '#a8a29e',
        '--color-secondary': '#737373',
        '--color-accent': '#78716c',
        '--color-background': '#e7ddd7',
        '--color-surface': '#f0e6e0',
        '--color-surface-light': '#f5f1ed',
        '--color-text': '#1c1917',
        '--color-text-secondary': '#44403c',
        '--color-text-muted': '#78716c',
        '--color-border': '#d6d3d1',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
      
    case 'whiteblack': // Blanco y Gris (más agradable)
    default:
      return {
        '--color-primary': '#3b82f6',
        '--color-primary-dark': '#2563eb',
        '--color-primary-light': '#60a5fa',
        '--color-secondary': '#64748b',
        '--color-accent': '#3b82f6',
        '--color-background': '#ffffff',
        '--color-surface': '#f8fafc',
        '--color-surface-light': '#e2e8f0',
        '--color-text': '#1e293b',
        '--color-text-secondary': '#64748b',
        '--color-text-muted': '#94a3b8',
        '--color-border': '#cbd5e1',
        '--color-success': '#10b981',
        '--color-error': '#ef4444',
        '--color-warning': '#f59e0b'
      };
  }
};

// Hook to apply theme
export const useTheme = (colorPalette) => {
  useEffect(() => {
    const variables = getThemeVariables(colorPalette);
    const root = document.documentElement;
    
    // Apply CSS variables to root
    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    
    // Add theme class to body for additional styling
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${colorPalette}`);
    
  }, [colorPalette]);
};

export default useTheme;