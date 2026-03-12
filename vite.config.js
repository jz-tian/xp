import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["framer-motion"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-slot",
            "lucide-react",
          ],
        },
      },
    },
  },
  server: {
    allowedHosts: [
      "macie-achievable-undubitatively.ngrok-free.dev",
    ],
    proxy: {
      "/data": "http://localhost:3001",
      "/upload": "http://localhost:3001",
      "/upload-audio": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
})
