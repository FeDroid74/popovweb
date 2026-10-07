import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const bash = windows ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const shellPath = path => windows ? path.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`) : path;
const script = shellPath(resolve('scripts/deploy-timeweb.sh'));
const sha = 'a'.repeat(40);

async function run(options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'popovweb-deploy-test-'));
  try {
    await mkdir(join(dir, 'bin'));
    await mkdir(join(dir, 'dist', 'en'), { recursive: true });
    for (const name of ['index.html', 'en/index.html', 'deployment.json']) await writeFile(join(dir, 'dist', name), '{}');
    const stubs = {
      ssh: `#!/usr/bin/env bash\nset -eu\nprintf 'ssh:%s\\n' "$*" >> "$TEST_LOG"\nif [[ "$*" == *'bash -s'* ]]; then cat >/dev/null; [[ "\${TEST_SSH_FAIL:-0}" == 0 ]] || exit 1; printf '%s\\n' "$TEST_ROOT"; fi\n`,
      rsync: `#!/usr/bin/env bash\nset -eu\nprintf 'rsync:%s\\n' "$*" >> "$TEST_LOG"\n[[ "\${TEST_RSYNC_FAIL:-0}" == 0 ]]\n`,
      curl: `#!/usr/bin/env bash\nset -eu\nif [[ "$*" == *'deployment.json'* ]]; then printf '{"commit":"%s"}' "$TEST_REVISION"; fi\n`,
    };
    for (const [name, content] of Object.entries(stubs)) await writeFile(join(dir, 'bin', name), content, { mode: 0o755 });
    const env = { ...process.env, TIMEWEB_SSH_HOST: 'example.timeweb.ru', TIMEWEB_SSH_USER: 'cz013423',
      TIMEWEB_SSH_KEY: 'DUMMY_TEST_KEY', TIMEWEB_KNOWN_HOSTS: 'DUMMY_KNOWN_HOST',
      GITHUB_SHA: sha, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1',
      GITHUB_STEP_SUMMARY: shellPath(join(dir, 'summary')), TEST_LOG: shellPath(join(dir, 'calls')),
      TEST_ROOT: '/home/c/cz013423/public_html', TEST_REVISION: sha, ...options };
    const result = spawnSync(bash, ['-c', 'export PATH="$PWD/bin:$PATH"; bash "$1"', 'test', script], { cwd: dir, env, encoding: 'utf8' });
    if (result.error) throw result.error;
    const log = await readFile(join(dir, 'calls'), 'utf8').catch(() => '');
    return { ...result, log };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test('deploy uploads assets, then HTML, then revision, preserving server configuration', async () => {
  const result = await run();
  assert.equal(result.status, 0, result.stderr);
  const uploads = result.log.split('\n').filter(l => l.startsWith('rsync:'));
  assert.equal(uploads.length, 3);
  assert(uploads[0].includes('--exclude=*.html'));
  assert(uploads[1].includes('--include=*.html'));
  assert(uploads[2].includes('dist/deployment.json'));
  assert(!result.log.includes('--delete'));
  assert(result.log.includes('StrictHostKeyChecking=yes'));
  assert(uploads.every(l => l.includes('--exclude=.htaccess') && l.includes('--backup-dir=')));
});
test('unknown SSH server or destination stops uploads', async () => {
  for (const options of [{ TEST_SSH_FAIL: '1' }, { TEST_ROOT: '/' }, { TIMEWEB_SSH_HOST: 'host;echo injected' }]) {
    const result = await run(options);
    assert.notEqual(result.status, 0);
    assert(!result.log.includes('rsync:'));
  }
});
test('failed resource upload prevents HTML publication', async () => {
  const result = await run({ TEST_RSYNC_FAIL: '1' });
  assert.notEqual(result.status, 0);
  assert.equal(result.log.split('\n').filter(l => l.startsWith('rsync:')).length, 1);
});
test('wrong public revision cannot report successful deployment', async () => {
  const result = await run({ TEST_REVISION: 'old' });
  assert.notEqual(result.status, 0);
});
