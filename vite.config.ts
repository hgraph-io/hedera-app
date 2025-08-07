import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// Helper to get __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// Keep __dirname for potential future use
void __dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
      // Specific modules to include
      include: ['buffer', 'crypto', 'stream', 'util', 'process'],
      // Use globals for buffer and process
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  build: {
    target: 'esnext',
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "Module level directives cause errors when bundled" warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        // Suppress specific comment warnings from ox library
        if (
          warning.code === 'INVALID_ANNOTATION' &&
          warning.message?.includes('/*#__PURE__*/')
        ) {
          return
        }
        // Suppress externalized module warnings for known Node.js modules
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.message?.includes('stream')) {
          return
        }
        warn(warning)
      },
      external: [
        // Don't bundle these Node.js modules
        ...(process.env.NODE_ENV === 'test' ? ['stream'] : []),
      ],
    },
  },
  resolve: {
    alias: {
      // Add stream polyfill
      stream: 'stream-browserify',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './setupTests.ts',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockServiceWorker.js',
        '**/*.test.*',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    server: {
      deps: {
        inline: [
          // Inline these dependencies to avoid external module warnings
          'cipher-base',
          '@walletconnect/universal-provider',
          '@walletconnect/utils',
          '@reown/appkit-siwx',
        ],
      },
    },
  },
  optimizeDeps: {
    include: [
      // Pre-bundle problematic dependencies
      '@walletconnect/universal-provider',
      '@walletconnect/utils',
      '@reown/appkit-siwx',
      'buffer',
    ],
    esbuildOptions: {
      // Silence pure annotation warnings
      logOverride: { 'invalid-annotation': 'silent' },
      // Define global for browser compatibility
      define: {
        global: 'globalThis',
      },
    },
  },
  // Suppress console warnings during build
  logLevel: process.env.NODE_ENV === 'test' ? 'error' : 'info',
})
