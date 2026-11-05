import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function manifest() {
  return JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
}

async function index() {
  return JSON.parse(await readFile(resolve(root, 'market/index.json'), 'utf8'));
}

test('package.json is publishable without a private flag', async () => {
  const pkg = await manifest();
  assert.equal(pkg.private, undefined);
  assert.equal(typeof pkg.license, 'string');
  assert.equal(pkg.publishConfig?.access, 'public');
  assert.match(pkg.repository?.url ?? '', /github\.com/);
  assert.ok(Array.isArray(pkg.keywords) && pkg.keywords.length > 0);
});

test('package.json declares DSH compatibility the installer can check', async () => {
  const pkg = await manifest();
  assert.equal(typeof pkg.engines?.node, 'string');
  assert.match(pkg.engines?.dsh ?? '', /0\.2\.1-rc\.1/);
  assert.ok(pkg.peerDependencies?.['@deepseek-ai/dsh'], 'peerDependencies must list @deepseek-ai/dsh');
  for (const name of [
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-layout',
    '@deepseek-ai/dsh-client-ui-sidebar',
    '@deepseek-ai/dsh-client-ui-session',
    '@deepseek-ai/dsh-client-ui-workspace',
  ]) {
    assert.ok(pkg.peerDependencies?.[name], `peerDependencies must list ${name}`);
  }
});

test('the published tarball carries every runtime artifact', async () => {
  const pkg = await manifest();
  for (const entry of ['lib', 'cordis.patch.yml', 'locale/*.json', 'icon.svg', 'README.md']) {
    assert.ok(pkg.files.includes(entry), `files must include ${entry}`);
  }
  assert.ok(pkg.exports?.['.'], 'exports[.] must point at the host half');
  assert.ok(pkg.exports?.['./client'], 'exports[./client] must point at the client bundle');
  assert.ok(pkg.exports?.['./locale/*.json'], 'locale files must stay importable');
});

test('the bundle patch names this package so DSH can enable it', async () => {
  const pkg = await manifest();
  assert.equal(pkg.dsh?.bundle?.patch, './cordis.patch.yml');
  assert.equal(pkg.dsh?.client?.platform, 'web');
  const patch = await readFile(resolve(root, pkg.dsh.bundle.patch), 'utf8');
  assert.match(patch, /id:\s*dsh-session-view/);
  assert.match(patch, /name:\s*dsh-session-view/);
});

test('the install scripts exist and default to a dry run', async () => {
  for (const file of ['scripts/install-profile.mjs', 'scripts/uninstall-profile.mjs', 'scripts/market-index.mjs']) {
    const info = await stat(resolve(root, file));
    assert.ok(info.isFile(), `${file} must exist`);
  }
  const pkg = await manifest();
  assert.ok(pkg.scripts['install:profile']);
  assert.ok(pkg.scripts['uninstall:profile']);
  assert.ok(pkg.scripts['market:index']);
  const install = await readFile(resolve(root, 'scripts/install-profile.mjs'), 'utf8');
  assert.match(install, /--apply/);
  assert.match(install, /dry-run/);
});

test('market/index.json matches the package manifest', async () => {
  const pkg = await manifest();
  const market = await index();
  assert.equal(market.format, 1);
  assert.equal(typeof market.title?.en, 'string');
  const plugin = market.plugins.find((entry) => entry.name === pkg.name);
  assert.ok(plugin, 'index must list this package');
  assert.equal(plugin.versions[0].version, pkg.version);
  assert.equal(plugin.versions[0].engines.dsh, pkg.engines.dsh);
  const source = plugin.versions[0].source;
  assert.ok(source.type === 'npm' || source.type === 'git');
  if (source.type === 'git') assert.match(source.commit, /^[0-9a-f]{40}$/);
  assert.ok(Number.isInteger(plugin.versions[0].publishTimestamp));
  const versions = plugin.versions.map((entry) => entry.version);
  assert.deepEqual(versions, [...versions].sort((a, b) => (a === b ? 0 : compare(a, b) > 0 ? -1 : 1)));
});

/** Minimal SemVer precedence comparison for the index ordering assertion. */
function compare(left, right) {
  const parse = (value) => {
    const [core, pre = ''] = value.split('-');
    return { core: core.split('.').map(Number), pre: pre ? pre.split('.') : [] };
  };
  const a = parse(left);
  const b = parse(right);
  for (let i = 0; i < 3; i += 1) {
    if (a.core[i] !== b.core[i]) return a.core[i] - b.core[i];
  }
  if (!a.pre.length && !b.pre.length) return 0;
  if (!a.pre.length) return 1;
  if (!b.pre.length) return -1;
  return a.pre.join('.').localeCompare(b.pre.join('.'));
}
