import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    // Raise the inline limit so tiny assets get inlined instead of extra requests
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        // Split vendor code into named chunks so the browser can cache them
        // independently from your own app code.
        manualChunks: {
          // Firebase Auth only — not the whole firebase package
          "vendor-firebase": ["firebase/app", "firebase/auth"],
          // Routing
          "vendor-router": ["react-router-dom"],
          // Socket.IO client (large — cache it separately)
          "vendor-socket": ["socket.io-client"],
          // React core (changes least often — longest cache life)
          "vendor-react": ["react", "react-dom"],
          // Icons
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },

  // Pre-bundle these so Vite doesn't do it on first request in dev
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "firebase/app", "firebase/auth"],
  },
});
