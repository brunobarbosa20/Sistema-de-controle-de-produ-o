import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const basePath = process.env["VITE_BASE_PATH"]?.replace(/\/+$/, "");

export default defineConfig({
  base: basePath ? `${basePath}/` : "/",
  plugins: [
    tanstackStart({
      server: { entry: "server" },
      prerender: { enabled: true },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: { tsconfigPaths: true },
});
