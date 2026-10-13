import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = process.env.TRADEBILIA_BUILD_STAMP_OUTPUT
  ? path.resolve(process.env.TRADEBILIA_BUILD_STAMP_OUTPUT)
  : path.join(projectRoot, 'client', 'public', 'tradebilia-build.json');

function gitValue(args) {
  try {
    return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

function configuredCommit() {
  const explicit = String(process.env.TRADEBILIA_SOURCE_COMMIT ?? '').trim();
  if (/^[0-9a-f]{7,64}$/i.test(explicit)) return explicit;
  return gitValue(['rev-parse', 'HEAD']) ?? 'unavailable';
}

function sourceTreeState() {
  const explicit = String(process.env.TRADEBILIA_SOURCE_TREE_STATE ?? '').trim();
  if (explicit === 'clean' || explicit === 'dirty' || explicit === 'unavailable') return explicit;
  const status = gitValue(['status', '--porcelain']);
  if (status === null) return 'unavailable';
  return status ? 'dirty' : 'clean';
}

const stamp = {
  sourceCommit: configuredCommit(),
  sourceTreeState: sourceTreeState(),
  builtAt: new Date().toISOString(),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(stamp, null, 2)}\n`, 'utf8');
console.log(`Wrote safe Tradebilia build stamp to ${outputPath}`);
