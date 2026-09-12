import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Every spec file boots its own app against the *same* live Postgres/
    // Valkey and truncates/flushes between tests - running files in
    // parallel would let one file's reset wipe another's fixtures mid-run.
    fileParallelism: false,
  },
});
