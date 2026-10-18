// Bundles web/main.ts into one self-contained HTML page.
// dist/index.html opens straight from disk; dist/artifact.html is the same page without the
// document skeleton, for hosts that wrap it themselves.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const out = await build({
  entryPoints: ['web/main.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
});
const js = out.outputFiles[0]!.text.replace(/<\/script/g, '<\\/script');
const body = readFileSync('web/template.html', 'utf8').replace('<!--APP-->', () => `<script>${js}</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/artifact.html', body);
writeFileSync('dist/index.html', `<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
console.log(`dist/index.html ${(body.length / 1024).toFixed(0)} KB`);
