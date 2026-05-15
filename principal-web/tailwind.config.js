/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F8F9FB',
        surface: '#FFFFFF',
        subtle: '#F3F4F6',
        border: '#E5E7EB',
        primary: '#0D1117',
        secondary: '#4B5563',
        muted: '#9CA3AF',
        accent: '#6366F1',
        'accent-light': '#EEF2FF',
        'accent-dark': '#4338CA',
        success: '#10B981',
        'success-light': '#ECFDF5',
        warning: '#F59E0B',
        'warning-light': '#FFFBEB',
        danger: '#EF4444',
        'danger-light': '#FEF2F2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 12px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}
