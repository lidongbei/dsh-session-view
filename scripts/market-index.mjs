#!/usr/bin/env node
/**
 * Generate the DSH plugin-market index (format 1) for this package.
 *
 * Usage:
 *   node scripts/market-index.mjs
 *   node scripts/market-index.mjs --timestamp 1762300000
 *   node scripts/market-index.mjs --git https://github.com/lidongbei/dsh-session-view --commit <40-hex-sha>
 *
 * The output is written to market/index.json by default. Publishing to npm and
 * hosting this file are separate manual steps.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ZH = {
  title: 'DSH 会话视图',
  pluginTitle: '会话视图',
  description: '以会话为中心的 DSH 侧栏：会话视图、工作区分组、专注模式与回收站。',
};
const EN = {
  title: 'DSH Session View',
  pluginTitle: 'Session View',
  description: 'Session-first DSH sidebar with workspace groups, focus mode and a session trash bin.',
};

function parseArgs(argv) {
  const args = { out: join(ROOT, 'market', 'index.json'), timestamp: null, git: '', commit: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help' || value === '-h') args.help = true;
    else if (value === '--out' || value === '--timestamp' || value === '--git' || value === '--commit') {
      const next = argv[index + 1];
      if (!next) throw new Error(`${value} 缺少参数值`);
      if (value === '--out') args.out = resolve(ROOT, next);
      else if (value === '--timestamp') args.timestamp = Number(next);
      else if (value === '--git') args.git = next;
      else args.commit = next;
      index += 1;
    } else {
      throw new Error(`未知参数：${value}`);
    }
  }
  if (args.timestamp !== null && (!Number.isInteger(args.timestamp) || args.timestamp <= 0)) {
    throw new Error('--timestamp 必须是正整数（Unix 秒）');
  }
  if (args.git && !/^[0-9a-f]{40}$/.test(args.commit)) {
    throw new Error('--git 需要配合 40 位小写十六进制 --commit');
  }
  return args;
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function repositoryUrl(manifest) {
  return (manifest.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
}

function buildIndex(manifest, args) {
  const dshEngine = manifest.engines?.dsh;
  if (!dshEngine) throw new Error('package.json 缺少 engines.dsh，无法声明兼容范围');

  const commit = args.git ? args.commit : gitHead();
  const source = args.git
    ? { type: 'git', url: args.git, commit }
    : { type: 'npm' };

  return {
    format: 1,
    title: { en: EN.title, zh: ZH.title },
    description: { en: EN.description, zh: ZH.description },
    metadata: { categories: {}, labels: {}, sortKeys: {} },
    plugins: [
      {
        name: manifest.name,
        title: { en: EN.pluginTitle, zh: ZH.pluginTitle },
        description: { en: EN.description, zh: ZH.description },
        author: manifest.author,
        homepage: manifest.homepage,
        repository: { url: repositoryUrl(manifest) },
        metadata: { keywords: manifest.keywords ?? [], labels: [], sortKeys: {} },
        versions: [
          {
            version: manifest.version,
            publishTimestamp: args.timestamp ?? Math.floor(Date.now() / 1000),
            source,
            engines: { dsh: dshEngine },
          },
        ],
      },
    ],
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('用法：node scripts/market-index.mjs [--out market/index.json] [--timestamp <unix>] [--git <url> --commit <sha>]');
    return;
  }

  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const index = buildIndex(manifest, args);
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`已写入 ${args.out}`);
  console.log(`插件：${manifest.name}@${manifest.version}（${index.plugins[0].versions[0].source.type}）`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
