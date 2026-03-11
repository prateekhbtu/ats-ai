import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Using the function form so we can load .env values at config time via loadEnv.
// This ensures VITE_* variables are read from the .env file (not just process.env)
// and are available for compile-time define replacements.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // Compile-time replacements — values baked into the bundle.
      // Fallbacks ensure the build always has a valid value even if .env is absent.
      'import.meta.env.VITE_API_BASE': JSON.stringify(
        env.VITE_API_BASE ?? 'https://ats-ai.workspace-infoga.workers.dev'
      ),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(
        env.VITE_GOOGLE_CLIENT_ID ?? ''
      ),
      'import.meta.env.VITE_ENABLE_LOGS': JSON.stringify(
        env.VITE_ENABLE_LOGS ?? 'false'
      ),
    },
  };
});
