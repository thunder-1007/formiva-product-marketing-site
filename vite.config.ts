import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const plugins = [react(), tailwindcss()];
const resolvePath = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));
const projectRoot = resolvePath(".");

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": resolvePath("./client/src"),
      "@shared": resolvePath("./shared"),
      "@assets": resolvePath("./attached_assets"),
    },
  },
  envDir: projectRoot,
  root: resolvePath("./client"),
  build: {
    outDir: resolvePath("./dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
  },
});
