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
  assert.deepEqual([...exported.inject], ['slots', 'locale', 'uiWorkspace', 'layout']);

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

  assert.deepEqual(injected, ['main', 'sidebar.panellist']);
  assert.equal(registered.namespace, 'dsh-session-view');
  assert.ok(registered.dictionaries.zh.panel);
  assert.ok(registered.dictionaries.en.panel);
  assert.equal(effects.length, 1);

  const main = registrations.find((item) => item.options.name === 'main');
  assert.equal(main.options.key, 'dsh-session-view');
  assert.equal(main.options.locale, 'dsh-session-view');
  assert.equal(typeof main.component, 'function');

  const panel = registrations.find((item) => item.options.name === 'sidebar.panellist');
  assert.equal(panel.options.id, 'dsh-session-view');
  assert.equal(panel.options.order, 10);
  assert.equal(panel.options.label(), 'panel');

  const injectedProps = main.options.inject();
  injectedProps.openSession('session-1');
  assert.equal(opened, 'session-1');
});
