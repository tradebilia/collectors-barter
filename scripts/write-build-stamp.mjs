import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = process.env.TRADEBILIA_BUILD_STAMP_OUTPUT
  ? path.resolve(process.env.TRADEBILIA_BUILD_STAMP_OUTPUT)
  : path.join(projectRoot, 'client', 'public', 'tradebilia-build.json');
const fingerprintInputs = ['client', 'server', 'shared', 'scripts', 'drizzle', '.gitignore', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts'];
const excludedFingerprintPathPrefixes = [
  // WebDev creates this full directory in each build environment. None of its
  // contents represent application-controlled source.
  'client/public/__manus__/',
  'client/public/tradebilia-build.json',
];

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

async function collectFingerprintFiles(relativePath, files) {
  if (excludedFingerprintPathPrefixes.some((prefix) => relativePath === prefix || relativePath.startsWith(prefix))) return;
  const absolutePath = path.join(projectRoot, relativePath);
  let details;
  try {
    details = await stat(absolutePath);
  } catch {
    return;
  }
  if (details.isDirectory()) {
    for (const entry of await readdir(absolutePath)) {
      await collectFingerprintFiles(path.posix.join(relativePath, entry), files);
    }
    return;
  }
  if (details.isFile()) files.push(relativePath);
}

/**
 * Identifies the application source without depending on a `.git` directory.
 * Platform-managed metadata and this generated stamp are intentionally
 * excluded so the same committed source produces the same fingerprint across
 * WebDev and public builders.
 */
async function sourceFingerprint() {
  const files = [];
  for (const input of fingerprintInputs) await collectFingerprintFiles(input, files);
  const hash = createHash('sha256');
  for (const relativePath of files.sort()) {
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
