/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      scrollbar: {
        thin: {
          size: '6px',
          track: 'transparent',
          thumb: 'rgba(156, 163, 175, 0.5)',
          hover: 'rgba(156, 163, 175, 0.7)',
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgba(156, 163, 175, 0.5) transparent',
        },
        '.scrollbar-thin::-webkit-scrollbar': {
          width: '6px',
        },
        '.scrollbar-thin::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb': {
          'background-color': 'rgba(156, 163, 175, 0.5)',
          'border-radius': '3px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb:hover': {
          'background-color': 'rgba(156, 163, 175, 0.7)',
        },
        '.scrollbar-thumb-gray-300': {
          '--scrollbar-thumb': 'rgb(209 213 219)',
        },
        '.scrollbar-thumb-gray-600': {
          '--scrollbar-thumb': 'rgb(75 85 99)',
        },
        '.scrollbar-track-transparent': {
          '--scrollbar-track': 'transparent',
        },
        '.hover\\:scrollbar-thumb-gray-400:hover': {
          '--scrollbar-thumb': 'rgb(156 163 175)',
        },
        '.dark\\:hover\\:scrollbar-thumb-gray-500:hover': {
          '--scrollbar-thumb': 'rgb(107 114 128)',
        },
      }
      addUtilities(newUtilities, ['responsive', 'hover', 'dark'])
    }
  ],
}
