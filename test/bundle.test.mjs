import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const nodeRequire = createRequire(import.meta.url);

test('built client bundle registers the panel and forwards openSession', async () => {
  const source = await readFile(resolve(root, 'lib/client.js'), 'utf8');
  let entry;
  const window = {
    __ModuleLoader__: {
      load(candidate) {
        entry = candidate;
      },
    },
  };
  vm.runInNewContext(source, { window, console });

  assert.equal(entry?.id, 'dsh-session-view');
  assert.equal(typeof entry.factory, 'function');

  const exported = entry.factory((id) => {
    if (id === 'react' || id === 'react/jsx-runtime') return nodeRequire(id);
    if (id === 'react-dom') return { createPortal: (node) => node };
    if (id === 'react-dom/client') return { createRoot: () => ({ render: () => {}, unmount: () => {} }) };
    throw new Error(`unexpected require: ${id}`);
  });
  assert.equal(typeof exported.apply, 'function');
  assert.deepEqual([...exported.inject], ['slots', 'locale', 'uiWorkspace', 'layout', 'sessions', 'workspaces']);

  const registrations = [];
  const injected = [];
  const effects = [];
  let opened;
  const ctx = {
    effect(fn, label) {
      effects.push({ label, dispose: fn() });
    },
    locale: {
      register(namespace, dictionaries) {
        registered = { namespace, dictionaries };
        return () => {};
      },
      bind() {
        return (key) => key;
      },
    },
    uiWorkspace: {
      openSession(target) {
        opened = target;
      },
    },
    slots: {
      inject(slot, register) {
        injected.push(slot);
        register();
      },
      register(options, component) {
        registrations.push({ options, component });
        return () => {};
      },
    },
  };
  let registered;

  exported.apply(ctx);

  assert.deepEqual(injected, ['main', 'sidebar.footer.action', 'settings.section']);
  assert.equal(registered.namespace, 'dsh-session-view');
  assert.ok(registered.dictionaries.zh.panel);
  assert.ok(registered.dictionaries.en.panel);
  assert.equal(effects.length, 1);

  const main = registrations.find((item) => item.options.name === 'main');
  assert.equal(main.options.key, 'dsh-session-view');
  assert.equal(main.options.locale, 'dsh-session-view');
  assert.equal(typeof main.component, 'function');

  const injectedProps = main.options.inject();
  injectedProps.openSession('session-1');
  assert.equal(opened, 'session-1');

  const footer = registrations.find((item) => item.options.name === 'sidebar.footer.action');
  assert.ok(footer);
  assert.equal(footer.options.id, 'dsh-session-view-mode');
  assert.equal(footer.options.locale, 'dsh-session-view');

  const paneProps = footer.options.inject();
  assert.equal(typeof paneProps.startSession, 'function');
  assert.equal(typeof paneProps.renameSession, 'function');
  assert.equal(typeof paneProps.searchSessions, 'function');
  assert.equal(typeof paneProps.createWorkspace, 'function');
  assert.equal(typeof paneProps.openPanel, 'function');

  const settings = registrations.find((item) => item.options.name === 'settings.section');
  assert.ok(settings);
  assert.equal(settings.options.id, 'dsh-session-view');
  assert.equal(settings.options.locale, 'dsh-session-view');
  assert.equal(settings.options.label(), 'settings.nav');
  assert.equal(typeof settings.component, 'function');
});
