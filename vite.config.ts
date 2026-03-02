import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Legacy Kingdom",
        short_name: "Legacy",
        description: "Gestão Financeira Familiar Bíblica",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        icons: [
          {
            src: "/icon-192x192.png", // Adicione esta imagem na pasta public
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512x512.png", // Adicione esta imagem na pasta public
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
