/**
 * Utility functions for color contrast and accessibility
 */

// Calculate relative luminance
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(foreground: string, background: string): number {
  const getRGB = (color: string) => {
    const hex = color.replace('#', '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  };

  const fg = getRGB(foreground);
  const bg = getRGB(background);

  const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

// Check if contrast meets WCAG standards
export function meetsWCAGStandards(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// Enhanced color palette with better contrast
export const enhancedColors = {
  primary: {
    text: '#FFFFFF',
    background: '#1a365d',
    hover: '#2d4a7c',
  },
  destructive: {
    text: '#FFFFFF',
    background: '#dc2626',
    hover: '#b91c1c',
  },
  success: {
    text: '#FFFFFF',
    background: '#059669',
    hover: '#047857',
  },
  muted: {
    text: '#6b7280',
    background: '#f3f4f6',
  },
  navbar: {
    text: '#FFFFFF',
    background: 'from-gray-900 to-gray-800',
    accent: '#e2e8f0',
  },
};
