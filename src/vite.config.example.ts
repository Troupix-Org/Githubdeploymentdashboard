import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Uncomment and configure the base path if deploying to GitHub Pages project site
  // For username.github.io/repo-name/, set base to '/repo-name/'
  // For username.github.io (user/org site), leave base as '/'
  // base: '/your-repo-name/',
  
  build: {
    // Output directory for production build
    outDir: 'dist',
    
    // Generate source maps for debugging
    sourcemap: true,
    
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
  },
  
  server: {
    // Development server port
    port: 3000,
    
    // Automatically open browser
    open: true,
  },
});
