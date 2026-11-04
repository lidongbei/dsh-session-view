import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(root, 'lib/client.js');
const bodyFile = resolve(root, 'lib/client.body.js');

await mkdir(dirname(outfile), { recursive: true });
await build({
  entryPoints: [resolve(root, 'src/client/index.jsx')],
  outfile: bodyFile,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome120'],
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'],
  legalComments: 'none',
  logLevel: 'info',
});

const body = await readFile(bodyFile, 'utf8');
const wrapped = `window.__ModuleLoader__.load({
  id: "dsh-session-view",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${body}
    return module.exports;
  }
});
`;

await writeFile(outfile, wrapped);
await rm(bodyFile);
console.log(`built ${outfile} (${Buffer.byteLength(wrapped)} bytes)`);
