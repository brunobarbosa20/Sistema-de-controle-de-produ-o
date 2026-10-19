import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

<<<<<<< HEAD
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
=======
export default defineConfig({
  plugins: [tanstackStart({ server: { entry: "server" } }), react(), tailwindcss()],
>>>>>>> 2a4d539 (primeiro git)
  resolve: { tsconfigPaths: true },
});
