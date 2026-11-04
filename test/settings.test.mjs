import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');

const fixture = `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SessionViewSettings } from ${JSON.stringify(resolve(root, 'src/client/settings-section.jsx'))};
import { zh } from ${JSON.stringify(resolve(root, 'src/client/locales.js'))};
import { resetPrefs } from ${JSON.stringify(resolve(root, 'src/client/prefs.js'))};

const t = (key, params) => {
  const template = zh[key] ?? key;
  return params ? template.replace(/\\\\{(\\\\w+)\\\\}/g, (match, name) => (name in params ? String(params[name]) : match)) : template;
};
resetPrefs();
globalThis.__DSV_SETTINGS_HTML = renderToStaticMarkup(React.createElement(SessionViewSettings, { t }));
resetPrefs();
`;

test('session view settings expose the workspace group switch and no layout option', async () => {
  const dir = await mkdtemp(join(root, 'test', '.settings-'));
  const outfile = join(dir, 'fixture.mjs');
  try {
    await build({
      stdin: { contents: fixture, resolveDir: root, sourcefile: 'settings.fixture.jsx', loader: 'jsx' },
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      jsx: 'automatic',
      external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server'],
      legalComments: 'none',
      logLevel: 'silent',
    });

    await import(pathToFileURL(outfile).href);
    const html = globalThis.__DSV_SETTINGS_HTML;
    delete globalThis.__DSV_SETTINGS_HTML;
    assert.equal(typeof html, 'string');
    assert.ok(html.includes('显示工作区会话分组'), 'missing workspace group switch');
    assert.ok(html.includes('显示活跃会话分组'), 'missing active group switch');
    assert.ok(!html.includes('布局'), 'layout option must be gone');
    assert.ok(html.includes('活跃会话显示个数'), 'missing active limit');
    assert.ok(html.includes('最近会话显示个数'), 'missing recent limit');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
