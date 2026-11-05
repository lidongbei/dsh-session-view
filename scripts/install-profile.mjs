#!/usr/bin/env node
/**
 * Install dsh-session-view into a DSH profile through the official CLI.
 *
 * Usage:
 *   node scripts/install-profile.mjs --profile web --source link
 *   node scripts/install-profile.mjs --profile web --source tgz --apply
 *   node scripts/install-profile.mjs --profile web --source git --apply
 *   node scripts/install-profile.mjs --profile web --source registry --apply
 *
 * Without --apply the script only prints the command it would run.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = new Set(['link', 'tgz', 'git', 'registry']);

function usage() {
  console.log(`用法：node scripts/install-profile.mjs [选项]

  --profile <name>   目标 profile（默认 web）
  --source <kind>    link | tgz | git | registry（默认 link）
  --registry <url>   安装 registry 版本时使用的 registry
  --apply            真正执行安装；缺省只做 dry-run
  --help             显示本帮助`);
}

function parseArgs(argv) {
  const args = { profile: 'web', source: 'link', apply: false, registry: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--apply') args.apply = true;
    else if (value === '--help' || value === '-h') args.help = true;
    else if (value === '--profile' || value === '--source' || value === '--registry') {
      const next = argv[index + 1];
      if (!next) throw new Error(`${value} 缺少参数值`);
      if (value === '--profile') args.profile = next;
      else if (value === '--source') args.source = next;
      else args.registry = next;
      index += 1;
    } else {
      throw new Error(`未知参数：${value}`);
    }
  }
  if (!SOURCES.has(args.source)) throw new Error(`--source 必须是 ${[...SOURCES].join(' | ')}`);
  return args;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh');
}

function profileDir(profile) {
  return join(dshHome(), 'profiles', profile);
}

function gitHead() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    throw new Error('--source git 需要当前目录是 git 仓库');
  }
}

function buildSpec(args, manifest) {
  const spec = `${manifest.name}@${manifest.version}`;
  if (args.source === 'link') return `link:local-plugins/${manifest.name}`;
  if (args.source === 'tgz') return `file:${join(ROOT, `${manifest.name}-${manifest.version}.tgz`)}`;
  if (args.source === 'git') {
    const remote = (manifest.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
    if (!remote) throw new Error('package.json 缺少 repository.url');
    return `git+${remote}.git#${gitHead()}`;
  }
  return spec;
}

/**
 * Windows 上 pnpm 处理跨盘绝对 `file:` 依赖会拼错路径，因此 link 安装把插件
 * 以 junction / symlink 挂到 profile 内的 local-plugins，再用相对 link: 依赖。
 */
function ensureLink(profile, manifest, apply) {
  const dir = join(profileDir(profile), 'local-plugins');
  const target = join(dir, manifest.name);
  const relative = `local-plugins/${manifest.name}`;
  if (existsSync(target)) {
    let pointsAt = '';
    try {
      pointsAt = realpathSync(target);
    } catch {
      pointsAt = '';
    }
    if (pointsAt && resolve(pointsAt) !== ROOT) {
      throw new Error(`${target} 已存在且不指向 ${ROOT}（当前：${pointsAt}），请先移除后再安装`);
    }
    return { target, relative, state: 'reused' };
  }
  if (!apply) return { target, relative, state: 'missing' };
  mkdirSync(dir, { recursive: true });
  symlinkSync(ROOT, target, process.platform === 'win32' ? 'junction' : 'dir');
  return { target, relative, state: 'created' };
}

function verify(profile, name) {
  const file = join(profileDir(profile), 'package.json');
  if (!existsSync(file)) return { ok: false, reason: `找不到 profile 清单：${file}` };
  const manifest = readJson(file);
  const dependency = manifest.dependencies?.[name];
  const bundles = manifest.dsh?.profile?.bundles ?? [];
  const enabled = bundles.includes(name);
  if (!dependency) return { ok: false, reason: `依赖未写入 profile：${name}` };
  if (!enabled) return { ok: false, reason: `dsh.profile.bundles 未包含 ${name}` };
  return { ok: true, dependency, enabled };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const manifest = readJson(join(ROOT, 'package.json'));
  const dir = profileDir(args.profile);
  if (!existsSync(dir)) throw new Error(`profile 目录不存在：${dir}`);

  let link = null;
  if (args.source === 'link') {
    link = ensureLink(args.profile, manifest, args.apply);
    if (link.state === 'created') console.log(`已建立链接：${link.target} -> ${ROOT}`);
    else if (link.state === 'reused') console.log(`复用已有链接：${link.target}`);
    else console.log(`[dry-run] 将建立链接：${link.target} -> ${ROOT}`);
  }

  const spec = buildSpec(args, manifest);
  const command = ['plugin', '--profile', args.profile, 'add', spec];
  if (args.registry) command.push('--registry', args.registry);

  console.log(`目标 profile：${args.profile}（${dir}）`);
  console.log(`安装规格：${spec}`);
  console.log(`命令：dsh ${command.join(' ')}`);

  if (!args.apply) {
    console.log('\n[dry-run] 未执行安装。确认无误后追加 --apply。');
    console.log('提示：安装完成后需要重启 DSH 才会加载新的客户端 bundle。');
    return;
  }

  const result = spawnSync('dsh', command, { cwd: dir, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`\n安装失败（退出码 ${result.status ?? 'unknown'}）。`);
    console.error('如果失败信息是版本不兼容，可执行：');
    console.error(`  dsh plugin --profile ${args.profile} allow-version ${manifest.name}@${manifest.version} --dsh-version <当前版本> --accept-risk`);
    process.exitCode = result.status ?? 1;
    return;
  }

  const check = verify(args.profile, manifest.name);
  if (!check.ok) {
    console.error(`\n安装命令已返回，但校验失败：${check.reason}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n已安装 ${manifest.name}（${check.dependency}），bundle 已启用。`);
  console.log('请重启 DSH 使客户端 bundle 生效。');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
