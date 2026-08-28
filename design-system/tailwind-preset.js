/**
 * Mecodex Tailwind preset — the React adapter for tokens.css.
 *
 * Every value here points at a CSS custom property rather than duplicating a hex
 * code. That matters: if Tailwind carried its own copy of the palette, the light
 * and dark themes would have to be maintained in two places and would drift.
 * Pointing at the variables means `bg-surface` resolves to whatever the active
 * theme says, with no dark: variant needed for ordinary surfaces and text.
 *
 * Usage (tailwind.config.js in a product):
 *
 *   import mecodex from '../../path/to/design-system/tailwind-preset.js';
 *   export default { presets: [mecodex], content: ['./src/**\/*.{ts,tsx,html}'] };
 *
 * and import tokens.css once at the app entry point, before Tailwind's layers.
 *
 * shadcn/ui note: shadcn generates components against a fixed set of semantic
 * names (background, foreground, primary, border, ring, destructive, ...). Those
 * names are mapped below so generated components pick up Mecodex styling with no
 * per-component edits — that is what makes shadcn viable here rather than a
 * second design language living alongside this one.
 */

/** @type {import('tailwindcss').Config} */
export default {
  // Class strategy, not media: the products expose an explicit theme toggle, and
  // tokens.css already resolves the "system" case via prefers-color-scheme.
  darkMode: ['class', '[data-theme="dark"]'],

  theme: {
    extend: {
      colors: {
        // --- Mecodex roles -------------------------------------------------
        surface: {
          sunk: 'var(--mx-surface-sunk)',
          base: 'var(--mx-surface-base)',
          DEFAULT: 'var(--mx-surface)',
          raised: 'var(--mx-surface-raised)',
        },
        ink: {
          DEFAULT: 'var(--mx-text)',
          secondary: 'var(--mx-text-secondary)',
          muted: 'var(--mx-text-muted)',
          'on-accent': 'var(--mx-text-on-accent)',
        },
        accent: {
          DEFAULT: 'var(--mx-accent)',
          hover: 'var(--mx-accent-hover)',
          subtle: 'var(--mx-accent-subtle)',
          border: 'var(--mx-accent-border)',
        },
        // Semantic status is deliberately separate from accent: "interactive"
        // and "dangerous" must never be the same signal.
        success: { DEFAULT: 'var(--mx-success)', subtle: 'var(--mx-success-subtle)' },
        warning: { DEFAULT: 'var(--mx-warning)', subtle: 'var(--mx-warning-subtle)' },
        danger: { DEFAULT: 'var(--mx-danger)', subtle: 'var(--mx-danger-subtle)' },
        info: { DEFAULT: 'var(--mx-info)', subtle: 'var(--mx-info-subtle)' },

        brand: {
          teal: 'var(--mx-brand-teal)',
          blue: 'var(--mx-brand-blue)',
        },

        // --- shadcn/ui compatibility ---------------------------------------
        // shadcn components reference these names directly. Mapping them here
        // means a generated <Button> or <Card> is already on-brand.
        border: 'var(--mx-border)',
        input: 'var(--mx-border)',
        ring: 'var(--mx-accent)',
        background: 'var(--mx-surface-base)',
        foreground: 'var(--mx-text)',
        primary: {
          DEFAULT: 'var(--mx-accent)',
          foreground: 'var(--mx-text-on-accent)',
        },
        secondary: {
          DEFAULT: 'var(--mx-surface-sunk)',
          foreground: 'var(--mx-text)',
        },
        muted: {
          DEFAULT: 'var(--mx-surface-sunk)',
          foreground: 'var(--mx-text-muted)',
        },
        destructive: {
          DEFAULT: 'var(--mx-danger)',
          foreground: 'var(--mx-text-on-accent)',
        },
        card: {
          DEFAULT: 'var(--mx-surface)',
          foreground: 'var(--mx-text)',
        },
        popover: {
          DEFAULT: 'var(--mx-surface-raised)',
          foreground: 'var(--mx-text)',
        },
      },

      fontFamily: {
        sans: 'var(--mx-font-body)',
        heading: 'var(--mx-font-heading)',
        mono: 'var(--mx-font-mono)',
      },

      fontSize: {
        display: ['var(--mx-text-display)', { lineHeight: 'var(--mx-leading-tight)' }],
        h1: ['var(--mx-text-h1)', { lineHeight: 'var(--mx-leading-tight)' }],
        h2: ['var(--mx-text-h2)', { lineHeight: 'var(--mx-leading-tight)' }],
        h3: ['var(--mx-text-h3)', { lineHeight: 'var(--mx-leading-tight)' }],
        'body-lg': ['var(--mx-text-body-lg)', { lineHeight: 'var(--mx-leading-body)' }],
        body: ['var(--mx-text-body)', { lineHeight: 'var(--mx-leading-body)' }],
        caption: 'var(--mx-text-caption)',
        label: ['var(--mx-text-label)', { letterSpacing: 'var(--mx-tracking-label)' }],
      },

      spacing: {
        '3xs': 'var(--mx-space-3xs)',
        '2xs': 'var(--mx-space-2xs)',
        xs: 'var(--mx-space-xs)',
        sm: 'var(--mx-space-sm)',
        md: 'var(--mx-space-md)',
        lg: 'var(--mx-space-lg)',
        xl: 'var(--mx-space-xl)',
        '2xl': 'var(--mx-space-2xl)',
        '3xl': 'var(--mx-space-3xl)',
      },

      borderRadius: {
        sm: 'var(--mx-radius-sm)',
        md: 'var(--mx-radius-md)',
        lg: 'var(--mx-radius-lg)',
        pill: 'var(--mx-radius-pill)',
      },

      boxShadow: {
        sm: 'var(--mx-shadow-sm)',
        md: 'var(--mx-shadow-md)',
        lg: 'var(--mx-shadow-lg)',
        focus: 'var(--mx-focus-ring)',
      },

      maxWidth: {
        container: 'var(--mx-container)',
        // Running text past roughly 70 characters is measurably harder to read.
        prose: '65ch',
      },

      transitionTimingFunction: {
        mx: 'var(--mx-ease)',
      },

      backgroundImage: {
        'brand-gradient': 'var(--mx-gradient-brand)',
      },
    },
  },

  plugins: [],
};
