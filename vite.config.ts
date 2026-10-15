import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiPort = process.env.MOCKROOM_API_PORT ?? "4317";

export default defineConfig({
  root: "src/ui",
  plugins: [react()],
  build: {
    outDir: "../../dist/ui",
    emptyOutDir: true,
  },
  server: {
    // In dev mode the API runs separately (src/server/dev.ts).
    // The trailing slash matters: "/api" alone would also catch the UI module src/ui/api.ts.
    proxy: { "/api/": `http://127.0.0.1:${apiPort}` },
  },
});
