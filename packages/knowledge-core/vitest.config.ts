import { defineConfig } from "vitest/config";
import path from "node:path";

const sharedSrc = path.resolve(process.cwd(), "../shared/src/index.ts");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@ia-app/shared": sharedSrc,
    },
  },
});
