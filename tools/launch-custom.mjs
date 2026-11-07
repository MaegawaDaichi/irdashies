import { createHash } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  readFile,
  writeFile,
  mkdir,
  rm,
  rename,
  access,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const exists = async (file) =>
  access(file).then(
    () => true,
    () => false
  );
const digest = (data) => createHash('sha256').update(data).digest('hex');
const log = (message) => process.stdout.write(`${message}\n`);

export async function fingerprint(root) {
  const { stdout } = await exec(
    'git',
    ['ls-files', '-c', '-o', '--exclude-standard', '-z'],
    {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
    }
  );
  const files = [...new Set(stdout.split('\0').filter(Boolean))]
    .filter((file) =>
      /^(src\/|tools\/|docs\/assets\/|public\/|assets\/|binding\.gyp$|package(-lock)?\.json$|forge\.config\.|vite\.|tsconfig|index.*\.html$|postcss|tailwind|launch-custom\.cmd$)/.test(
        file
      )
    )
    .sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(`${file}\0`);
    try {
      hash.update(await readFile(path.join(root, file)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      hash.update('<deleted>');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function runCommand(args, root) {
  if (args.join(' ') === 'run package -- --platform=win32 --arch=x64') {
    // Forge's CLI has no --out option. Its API lets us build separately so
    // failures cannot overwrite the last working application.
    const { initializeProxy } = await import('@electron/get');
    const { api } = await import('@electron-forge/core');
    initializeProxy();
    await api.package({
      dir: root,
      outDir: path.join(root, '.cache/custom-launcher/staging'),
      platform: 'win32',
      arch: 'x64',
      interactive: true,
    });
    return;
  }
  // Only fixed npm commands below are accepted; no repository path enters a shell string.
  const command = ['ci', 'run irsdk:build'].find(
    (value) => value === args.join(' ')
  );
  if (!command) throw new Error('Unsupported build command');
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', `npm ${command}`],
      {
        cwd: root,
        stdio: 'inherit',
      }
    );
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`npm ${command} failed (${code})`))
    );
  });
}

async function isRunning(executable) {
  const { stdout } = await exec(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$p = Get-Process -Name irdashies-custom -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:IRDASHIES_LAUNCH_TARGET }; if ($p) { "running" }',
    ],
    { env: { ...process.env, IRDASHIES_LAUNCH_TARGET: executable } }
  );
  return stdout.trim() === 'running';
}

async function launchApp(executable) {
  await new Promise((resolve, reject) => {
    const child = spawn(executable, [], {
      cwd: path.dirname(executable),
      detached: true,
      stdio: 'ignore',
    });
    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

export async function launchCustom(
  root,
  { run = runCommand, running = isRunning, launch = launchApp } = {}
) {
  const cache = path.join(root, '.cache', 'custom-launcher');
  await mkdir(cache, { recursive: true });
  const lock = path.join(cache, 'lock');
  try {
    await mkdir(lock);
  } catch (error) {
    if (error.code === 'EEXIST')
      throw new Error(
        'Another launcher is running. If it was interrupted, delete .cache/custom-launcher/lock after checking it has stopped.',
        { cause: error }
      );
    throw error;
  }
  try {
    const pkg = JSON.parse(
      await readFile(path.join(root, 'package.json'), 'utf8')
    );
    if (
      pkg.name !== 'irdashies-custom' ||
      pkg.productName !== 'irDashies Custom'
    ) {
      throw new Error(
        'Select a Custom branch before launching; official app identity is not supported.'
      );
    }
    const executable = path.join(cache, 'app', 'irdashies-custom.exe');
    const stateFile = path.join(cache, 'state.json');
    let state = {};
    try {
      state = JSON.parse(await readFile(stateFile, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError))
        throw error;
    }
    const source = await fingerprint(root);
    const dependencies = digest(
      Buffer.concat([
        await readFile(path.join(root, 'package.json')),
        await readFile(path.join(root, 'package-lock.json')),
        Buffer.from(`${process.version}:${process.arch}`),
      ])
    );
    const modulesPresent = await exists(
      path.join(root, 'node_modules', '.package-lock.json')
    );
    const packaged =
      (await exists(executable)) &&
      (await exists(path.join(cache, 'app', 'resources', 'app.asar')));
    const rebuild =
      source !== state.source ||
      dependencies !== state.dependencies ||
      !modulesPresent ||
      !packaged;
    if (await running(executable)) {
      if (rebuild)
        throw new Error(
          'Exit the launcher-built Custom app from its tray menu before rebuilding.'
        );
      log('Custom app is already running.');
      return;
    }
    if (rebuild) {
      log('Changes detected (or first launch). Building Custom app...');
      if (dependencies !== state.dependencies || !modulesPresent)
        await run(['ci'], root);
      await run(['run', 'irsdk:build'], root);
      const staging = path.join(cache, 'staging');
      await rm(staging, { recursive: true, force: true });
      await run(
        ['run', 'package', '--', '--platform=win32', '--arch=x64'],
        root
      );
      const built = path.join(staging, `${pkg.productName}-win32-x64`);
      if (
        !(await exists(path.join(built, 'irdashies-custom.exe'))) ||
        !(await exists(path.join(built, 'resources', 'app.asar')))
      ) {
        throw new Error(
          'Custom package is incomplete. Previous package was preserved.'
        );
      }
      if (source !== (await fingerprint(root)))
        throw new Error(
          'Sources changed during the build. Close editors making changes and retry.'
        );
      const app = path.join(cache, 'app');
      const previous = path.join(cache, 'previous');
      await rm(previous, { recursive: true, force: true });
      const hadApp = await exists(app);
      if (hadApp) await rename(app, previous);
      try {
        await rename(built, app);
      } catch (error) {
        if (hadApp) await rename(previous, app);
        throw error;
      }
      await writeFile(stateFile, JSON.stringify({ source, dependencies }));
    } else {
      log('No changes. Starting packaged app.');
    }
    await launch(executable);
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.platform !== 'win32' || process.arch !== 'x64')
      throw new Error('This launcher requires Windows x64.');
    if (Number(process.versions.node.split('.')[0]) < 24)
      throw new Error('Install Node.js 24 or newer.');
    await launchCustom(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
