/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                kitchen: {
                    // Base
                    page: '#FDF6EC',
                    card: '#FFFDF8',
                    warm: '#FAEBD7',
                    // Wood
                    'wood-light': '#F5E6D0',
                    'wood-dark': '#EDD8BC',
                    'wood-border': '#D4B896',
                    'wood-shadow': '#C8A880',
                    // Gold accent
                    gold: '#E8A830',
                    'gold-dark': '#D4952A',
                    'gold-deep': '#C87A20',
                    'gold-border': '#E8C878',
                    'gold-border-muted': '#DCC8A0',
                    // Text
                    'text-title': '#5A3A10',
                    'text-body': '#8B5E20',
                    'text-secondary': '#A08040',
                    'text-muted': '#C8B080',
                    // Semantic (desaturated)
                    'danger': '#E09080',
                    'danger-border': '#C07060',
                    'danger-text': '#C05050',
                    'success': '#80B890',
                    'success-border': '#60A070',
                    'info': '#7EB8D0',
                    'info-border': '#5EA0B8',
                },
            },
        },
    },
    plugins: [],
}
