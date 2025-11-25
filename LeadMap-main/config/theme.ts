/**
 * NextDeal Theme Configuration
 * 
 * This file contains all key theme data, font information, and design tokens
 * for the NextDeal website. Reference this file when making design changes.
 */

// ============================================================================
// BRANDING
// ============================================================================
export const BRAND = {
  name: 'NextDeal',
  tagline: 'The AI lead platform for faster, smarter closings',
  description: 'Access verified, high-intent leads curated for your market — all in one clean, intuitive platform built for modern real-estate professionals.',
} as const;

// ============================================================================
// COLORS
// ============================================================================
export const COLORS = {
  background: '#E8E3D6',
  primary: {
    DEFAULT: '#1A73E8',
    50: '#e8f0fe',
    100: '#d2e3fc',
    200: '#aec7fa',
    300: '#8ab4f8',
    400: '#5a9ef6',
    500: '#1A73E8',
    600: '#0B59C5',
    700: '#0948a0',
    800: '#07377b',
    900: '#052656',
  },
  secondary: {
    DEFAULT: '#0B59C5',
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#0B59C5',
    600: '#0948a0',
    700: '#07377b',
    800: '#052656',
    900: '#031531',
  },
  accent: {
    DEFAULT: '#F9AB00',
    50: '#fff8e1',
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    400: '#ffca28',
    500: '#F9AB00',
    600: '#ff8f00',
    700: '#ff6f00',
    800: '#e65100',
    900: '#bf360c',
  },
  neutral: {
    light: '#F5F5F7',
    dark: '#1C1C1E',
  },
  sand: {
    10: '#F5F3F0',
    50: '#FAF9F7',
    100: '#F5F3F0',
    200: '#EDE9E3',
    300: '#E0D9D0',
    400: '#D4C9BC',
    500: '#C4B5A3',
  },
  success: {
    DEFAULT: '#1DB954',
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#1DB954',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  error: {
    DEFAULT: '#D93025',
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#D93025',
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const TYPOGRAPHY = {
  // Font Families
  fonts: {
    heading: 'Montserrat', // For h1-h6, bold headings
    body: 'Inter', // For body text, paragraphs, labels
    ui: 'Lato', // For buttons, badges, UI elements
  },
  
  // Font Weights
  weights: {
    heading: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    body: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
    ui: {
      normal: 400,
      bold: 700,
    },
  },
  
  // Hero Headline (Apollo.io style)
  heroHeadline: {
    mobile: 'text-[44px] tracking-[-0.88px] leading-none',
    tablet: 'tablet:text-[56px] tablet:tracking-[-1.12px] tablet:leading-none',
    desktopS: 'desktop-s:text-[64px] desktop-s:tracking-[-1.28px] desktop-s:leading-[90%]',
    desktop: 'desktop:text-[72px] desktop:tracking-[-1.44px] desktop:leading-[90%]',
    desktopXL: 'desktop-xl:text-[80px] desktop-xl:tracking-[-1.6px] desktop-xl:leading-[90%]',
    maxWidth: {
      tablet: 'tablet:max-w-[500px]',
      desktopS: 'desktop-s:max-w-[700px]',
      desktop: 'desktop:max-w-[900px]',
      desktopXL: 'desktop-xl:max-w-[1100px]',
    },
  },
  
  // Testimonial Quote (Apollo.io style - 3 lines)
  testimonial: {
    mobile: 'text-[24px] tracking-[-0.48px] leading-[110%]',
    tablet: 'tablet:text-[28px] tablet:tracking-[-0.56px] tablet:leading-[110%]',
    desktopS: 'desktop-s:text-[32px] desktop-s:tracking-[-0.64px] desktop-s:leading-[110%]',
    desktop: 'desktop:text-[36px] desktop:tracking-[-0.72px] desktop:leading-[110%]',
    desktopXL: 'desktop-xl:text-[40px] desktop-xl:tracking-[-0.8px] desktop-xl:leading-[110%]',
    maxWidth: {
      desktopS: 'desktop-s:max-w-[520px]',
      desktop: 'desktop:max-w-[650px]',
      desktopXL: 'desktop-xl:max-w-[800px]',
    },
  },
  
  // Subheadline
  subheadline: {
    mobile: 'text-lg',
    tablet: 'tablet:text-xl',
    desktopS: 'desktop-s:text-2xl',
  },
} as const;

// ============================================================================
// SPACING & LAYOUT
// ============================================================================
export const LAYOUT = {
  // Container padding/margins (matches banner)
  container: {
    horizontal: 'mx-4 sm:mx-6 lg:mx-8',
    padding: 'px-4 sm:px-6 lg:px-8',
  },
  
  // Responsive Breakpoints (from tailwind.config.js)
  breakpoints: {
    tablet: '768px',
    desktopS: '1024px',
    desktop: '1280px',
    desktopXL: '1536px',
  },
  
  // White Overlay Container
  overlay: {
    className: 'bg-neutral-light dark:bg-neutral-dark rounded-2xl sm:rounded-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] overflow-hidden border border-gray-200 dark:border-gray-800',
    margin: 'mt-16 mx-4 sm:mx-6 lg:mx-8 mb-8',
  },
} as const;

// ============================================================================
// COMPONENT STYLES
// ============================================================================
export const COMPONENTS = {
  // Navigation
  nav: {
    height: 'h-16',
    link: 'text-sm font-normal',
  },
  
  // Buttons
  button: {
    primary: 'bg-primary text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors',
    secondary: 'bg-transparent border border-black dark:border-white text-black dark:text-white font-normal rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
  },
  
  // Cards
  card: {
    base: 'bg-neutral-light dark:bg-neutral-dark rounded-lg border border-gray-200 dark:border-gray-700 p-6',
  },
} as const;

// ============================================================================
// CONTENT
// ============================================================================
export const CONTENT = {
  customerCount: '1,000',
  testimonial: {
    quote: '"Every agent is more productive with NextDeal. We closed 75% more deals while cutting prospecting time in half."',
    author: 'John Froning',
    role: 'Real Estate Broker',
  },
  benefits: [
    {
      label: '75% increase in closed deals',
      value: '75%',
    },
    {
      label: '2X agent efficiency',
      value: '2X',
    },
    {
      label: '50% lower prospecting costs',
      value: '50%',
    },
  ],
} as const;

