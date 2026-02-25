/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            screens: {
                '3xl': '1920px',
            },
            fontFamily: {
                sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                cream: { 50: '#FBF8F3', 100: '#F5F2ED', 200: '#E8E4DF' },
                warm: { 700: '#2D2A26', 500: '#8A8580', 300: '#B5B0AA' },
            },
            boxShadow: {
                'warm': '0 2px 8px rgba(45,42,38,0.08)',
                'warm-lg': '0 4px 16px rgba(45,42,38,0.12)',
                'warm-xl': '0 8px 24px rgba(45,42,38,0.15)',
            },
        },
    },
    plugins: [],
}
