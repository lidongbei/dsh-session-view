#!/usr/bin/env node
/**
 * Remove dsh-session-view from a DSH profile through the official CLI.
 *
 * Usage:
 *   node scripts/uninstall-profile.mjs --profile web
 *   node scripts/uninstall-profile.mjs --profile web --apply
 *
 * Without --apply the script only prints the command it would run.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { profile: 'web', apply: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') args.apply = true;
    else if (value === '--help' || value === '-h') args.help = true;
    else if (value === '--profile') {
      const next = argv[index + 1];
      if (!next) throw new Error('--profile 缺少参数值');
      args.profile = next;
      index += 1;
    } else {
      throw new Error(`未知参数：${value}`);
    }
  }
  return args;
}

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh');
}

function profileManifest(profile) {
  return join(dshHome(), 'profiles', profile, 'package.json');
}

function verify(profile, name) {
  const file = profileManifest(profile);
  if (!existsSync(file)) return { ok: false, reason: `找不到 profile 清单：${file}` };
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const dependency = manifest.dependencies?.[name];
  const bundles = manifest.dsh?.profile?.bundles ?? [];
  const enabled = bundles.includes(name);
  if (dependency) return { ok: false, reason: `依赖仍存在：${name}（${dependency}）` };
  if (enabled) return { ok: false, reason: `dsh.profile.bundles 仍包含 ${name}` };
  return { ok: true };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`用法：node scripts/uninstall-profile.mjs [--profile web] [--apply]`);
    return;
  }

  const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const dir = join(dshHome(), 'profiles', args.profile);
  if (!existsSync(dir)) throw new Error(`profile 目录不存在：${dir}`);

  const command = ['plugin', '--profile', args.profile, 'remove', manifest.name];
  console.log(`目标 profile：${args.profile}（${dir}）`);
  console.log(`命令：dsh ${command.join(' ')}`);

  if (!args.apply) {
    console.log('\n[dry-run] 未执行卸载。确认无误后追加 --apply。');
    return;
  }

  const result = spawnSync('dsh', command, { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`\n卸载失败（退出码 ${result.status ?? 'unknown'}）。`);
    process.exitCode = result.status ?? 1;
    return;
  }

  const check = verify(args.profile, manifest.name);
  if (!check.ok) {
    console.error(`\n卸载命令已返回，但校验失败：${check.reason}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n已移除 ${manifest.name}。请重启 DSH 使变化生效。`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
