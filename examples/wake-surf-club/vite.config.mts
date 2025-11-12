import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    hmr: { overlay: false },
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist/frontend",
    sourcemap: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
});

