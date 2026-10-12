import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Only the Figma-host-specific build plugins are removed. Source and CSS remain unchanged.
export default defineConfig({ plugins: [react(), tailwindcss()], server: { host: "127.0.0.1", port: 4173 } });
