// https://vitejs.dev/config/
export default {
  // Use the repo name when provided, otherwise serve from root for local dev
  base: Deno.env.get("REPO_NAME") || "/",
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: true,
  },
};
