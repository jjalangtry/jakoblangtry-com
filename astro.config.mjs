import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      allowedHosts: [
        "jakoblangtry.com",
        "www.jakoblangtry.com",
        "jjalangtry.com",
        "www.jjalangtry.com",
      ],
    },
    preview: {
      allowedHosts: [
        "jakoblangtry.com",
        "www.jakoblangtry.com",
        "jjalangtry.com",
        "www.jjalangtry.com",
      ],
    },
  },
});
