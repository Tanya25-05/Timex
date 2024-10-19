import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: "index.html",
        content: "content.js",
        background: "background.js",
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
