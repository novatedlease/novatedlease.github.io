import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "/assets/calculator/",
  resolve: {
    alias: {
      "@engine": path.resolve(__dirname, "../calculator/src/engine"),
    },
  },
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
