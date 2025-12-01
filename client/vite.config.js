import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: [
      'thanet-ukrainians.up.railway.app', // Ваша адреса з помилки
      'thanet-ukrainians-app.up.railway.app',
      '.railway.app' // Дозволити всі субдомени Railway (для зручності)
    ]
  }
})