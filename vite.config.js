import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    minify: false,
  },
  server: {
    port: 3000,
    open: false,
  },
});
