import { defineConfig } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
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
