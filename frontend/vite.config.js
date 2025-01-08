import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite에서는 process.env 대신 import.meta.env를 사용
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    proxy: {
      "/api": {
        target: import.meta.env.VITE_API_URL || "http://localhost:3000", // import.meta.env 사용
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
