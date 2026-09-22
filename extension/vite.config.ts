import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/firefox", // scripts/build.mjs overrides this per browser target
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: "src/content.tsx",
      output: {
        format: "iife",
        entryFileNames: "assets/content.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
