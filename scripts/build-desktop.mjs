import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';

await mkdir('desktop', { recursive: true });
await build({
  entryPoints: ['server.ts'],
  outfile: 'desktop/server.mjs',
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: false,
});
console.log('Desktop backend bundled.');
