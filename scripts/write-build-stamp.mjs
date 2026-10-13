import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = process.env.TRADEBILIA_BUILD_STAMP_OUTPUT
  ? path.resolve(process.env.TRADEBILIA_BUILD_STAMP_OUTPUT)
  : path.join(projectRoot, 'client', 'public', 'tradebilia-build.json');
const fingerprintManifestPath = path.join(projectRoot, 'scripts', 'source-fingerprint-manifest.json');

function gitValue(args) {
  try {
    // An empty `git status --porcelain` is the valid signal for a clean tree;
    // only a thrown command is unavailable.
    return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
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

/**
 * Identifies only the reviewed, Git-tracked application/configuration source
 * without depending on a `.git` directory. The tracked manifest prevents
 * platform build artifacts from becoming implicit parity inputs.
 */
async function sourceFingerprint() {
  const files = JSON.parse(await readFile(fingerprintManifestPath, 'utf8'));
  if (!Array.isArray(files) || files.some((file) => typeof file !== 'string' || !/^[A-Za-z0-9._/@-]+$/.test(file))) {
    throw new Error('Invalid source fingerprint manifest');
  }
  const hash = createHash('sha256');
  for (const relativePath of [...files].sort()) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(await readFile(path.join(projectRoot, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

const stamp = {
  sourceCommit: configuredCommit(),
  sourceTreeState: sourceTreeState(),
  sourceFingerprint: await sourceFingerprint(),
  builtAt: new Date().toISOString(),
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(stamp, null, 2)}\n`, 'utf8');
console.log(`Wrote safe Tradebilia build stamp to ${outputPath}`);
