import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launchCustom } from './launch-custom.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'custom-launch-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  await writeFile(path.join(root, '.gitignore'), '.cache/\nnode_modules/\n');
  await writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'irdashies-custom',
      productName: 'irDashies Custom',
    })
  );
  await writeFile(path.join(root, 'package-lock.json'), '{}');
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src', 'main.ts'), 'original');
  const commands = [];
  const launches = [];
  const options = {
    running: async () => false,
    launch: async (exe) => launches.push(exe),
    run: async (args) => {
      commands.push(args.join(' '));
      if (args[0] === 'ci') {
        await mkdir(path.join(root, 'node_modules'), { recursive: true });
        await writeFile(
          path.join(root, 'node_modules', '.package-lock.json'),
          '{}'
        );
      }
      if (args[1] === 'package') {
        const built = path.join(
          root,
          '.cache/custom-launcher/staging/irDashies Custom-win32-x64'
        );
        await mkdir(path.join(built, 'resources'), { recursive: true });
        await writeFile(
          path.join(built, 'irdashies-custom.exe'),
          'new package'
        );
        await writeFile(path.join(built, 'resources/app.asar'), 'resources');
      }
    },
  };
  return { root, commands, launches, options };
}

test('first launch builds; unchanged launch runs no npm commands', async (t) => {
  const f = await fixture(t);
  await launchCustom(f.root, f.options);
  assert.equal(f.commands.length, 3);
  f.commands.length = 0;
  await launchCustom(f.root, f.options);
  assert.deepEqual(f.commands, []);
  assert.equal(f.launches.length, 2);
});

test('uncommitted source edits rebuild without reinstalling dependencies', async (t) => {
  const f = await fixture(t);
  await launchCustom(f.root, f.options);
  f.commands.length = 0;
  await writeFile(path.join(f.root, 'src/main.ts'), 'changed without commit');
  await launchCustom(f.root, f.options);
  assert.equal(f.commands.length, 2);
  assert.equal(f.commands[0], 'run irsdk:build');
});

test('lockfile changes reinstall dependencies', async (t) => {
  const f = await fixture(t);
  await launchCustom(f.root, f.options);
  f.commands.length = 0;
  await writeFile(path.join(f.root, 'package-lock.json'), '{"changed":true}');
  await launchCustom(f.root, f.options);
  assert.equal(f.commands[0], 'ci');
});

test('failed packaging preserves the working app and stamp, and never launches it as an update', async (t) => {
  const f = await fixture(t);
  await launchCustom(f.root, f.options);
  const cache = path.join(f.root, '.cache/custom-launcher');
  const before = await readFile(path.join(cache, 'state.json'), 'utf8');
  await writeFile(path.join(f.root, 'src/main.ts'), 'new version');
  await assert.rejects(
    launchCustom(f.root, {
      ...f.options,
      run: async (args) => {
        if (args[1] === 'package') throw new Error('build failed');
        await f.options.run(args);
      },
    }),
    /build failed/
  );
  assert.equal(await readFile(path.join(cache, 'state.json'), 'utf8'), before);
  assert.equal(
    await readFile(path.join(cache, 'app/irdashies-custom.exe'), 'utf8'),
    'new package'
  );
  assert.equal(f.launches.length, 1);
  await launchCustom(f.root, f.options); // lock was released even on failure
});

test('running app blocks a rebuild, and an unchanged running app is not launched twice', async (t) => {
  const f = await fixture(t);
  await launchCustom(f.root, f.options);
  await launchCustom(f.root, { ...f.options, running: async () => true });
  assert.equal(f.launches.length, 1);
  await writeFile(path.join(f.root, 'src/main.ts'), 'changed');
  await assert.rejects(
    launchCustom(f.root, { ...f.options, running: async () => true }),
    /Exit the launcher-built/
  );
});

test('missing app resources forces rebuilding; docs-only changes do not', async (t) => {
  const f = await fixture(t);
  await launchCustom(f.root, f.options);
  f.commands.length = 0;
  await writeFile(path.join(f.root, 'README.md'), 'documentation');
  await launchCustom(f.root, f.options);
  assert.deepEqual(f.commands, []);
  await rm(path.join(f.root, '.cache/custom-launcher/app/resources/app.asar'));
  await launchCustom(f.root, f.options);
  assert.equal(f.commands.length, 2);
});

test('source changes during packaging cannot mark a stale package as current', async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    launchCustom(f.root, {
      ...f.options,
      run: async (args) => {
        await f.options.run(args);
        if (args[1] === 'package')
          await writeFile(
            path.join(f.root, 'src/main.ts'),
            'edited during build'
          );
      },
    }),
    /Sources changed during the build/
  );
  assert.equal(f.launches.length, 0);
});

test('a concurrent launcher cannot remove the existing lock', async (t) => {
  const f = await fixture(t);
  const lock = path.join(f.root, '.cache/custom-launcher/lock');
  await mkdir(lock, { recursive: true });
  await writeFile(path.join(lock, 'owner'), 'another launcher');
  await assert.rejects(launchCustom(f.root, f.options), /Another launcher/);
  assert.equal(
    await readFile(path.join(lock, 'owner'), 'utf8'),
    'another launcher'
  );
  assert.equal(f.commands.length, 0);
});
