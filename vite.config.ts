import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const localModule = (modulePath: string) => path.resolve(__dirname, `./node_modules/${modulePath}`);

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      // Use WebSocket instead of SharedWorker to avoid cross-origin issues
      protocol: "ws",
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: localModule("react/index.js"),
      "react/jsx-runtime": localModule("react/jsx-runtime.js"),
      "react/jsx-dev-runtime": localModule("react/jsx-dev-runtime.js"),
      "react-dom": localModule("react-dom/index.js"),
      "react-dom/client": localModule("react-dom/client.js"),
      "react-router-dom": localModule("react-router-dom/dist/index.js"),
      "@tanstack/query-core": localModule("@tanstack/query-core/build/modern/index.js"),
    },
    dedupe: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
    include: ["react", "react-dom", "react/jsx-runtime", "react-router-dom", "@tanstack/query-core"],
  },
}));
