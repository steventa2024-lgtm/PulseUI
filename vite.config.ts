import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    // Generated projects, starters and runtime data are not part of PulseUI's own module graph.
    watch: { ignored: ["**/.pulseui/**", "**/starters/**", "**/tests/**"] },
  },
  plugins: [tailwindcss(), tanstackStart({ server: { entry: "server" } }), react()],
});
