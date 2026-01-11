import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/assets/calculator/",           // important for GitHub Pages + MkDocs
  build: {
    outDir: "../docs/assets/calculator", // output into mkdocs-served assets
    emptyOutDir: true,
  },
});