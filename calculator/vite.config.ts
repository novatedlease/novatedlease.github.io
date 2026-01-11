import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/assets/calculator/",
  build: {
    outDir: "../docs/assets/calculator",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "main.js",
        chunkFileNames: "chunk-[name].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";
          if (name.endsWith(".css")) return "style.css";
          return "asset-[name][extname]";
        },
      },
    },
  },
});