import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('safe public build stamp', () => {
  it('writes only source commit, tree state, and build time from explicit build inputs', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tradebilia-build-stamp-'));
    const outputPath = path.join(tempDir, 'tradebilia-build.json');
    try {
      execFileSync('node', ['scripts/write-build-stamp.mjs'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          TRADEBILIA_BUILD_STAMP_OUTPUT: outputPath,
          TRADEBILIA_SOURCE_COMMIT: 'c8a8397193812d8e95bb2bcf72d9362a7fddbb0c',
          TRADEBILIA_SOURCE_TREE_STATE: 'clean',
        },
        stdio: 'pipe',
      });
      const stamp = JSON.parse(readFileSync(outputPath, 'utf8'));
      expect(stamp).toMatchObject({
        sourceCommit: 'c8a8397193812d8e95bb2bcf72d9362a7fddbb0c',
        sourceTreeState: 'clean',
      });
      expect(Object.keys(stamp).sort()).toEqual(['builtAt', 'sourceCommit', 'sourceFingerprint', 'sourceTreeState']);
      expect(Number.isNaN(Date.parse(stamp.builtAt))).toBe(false);
      expect(stamp.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(stamp)).not.toMatch(/database|token|secret|password|api.?key/i);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('reports a successful empty porcelain status as a clean source tree', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tradebilia-clean-build-stamp-'));
    const scriptDir = path.join(tempDir, 'scripts');
    const outputPath = path.join(tempDir, 'tradebilia-build.json');
    try {
      mkdirSync(scriptDir, { recursive: true });
      copyFileSync(path.resolve(process.cwd(), 'scripts/write-build-stamp.mjs'), path.join(scriptDir, 'write-build-stamp.mjs'));
      writeFileSync(path.join(scriptDir, 'source-fingerprint-manifest.json'), '["scripts/write-build-stamp.mjs"]\n');
      writeFileSync(path.join(tempDir, 'README.md'), '# Temporary clean repository\n');
      execFileSync('git', ['init', '--quiet'], { cwd: tempDir });
      execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: tempDir });
      execFileSync('git', ['config', 'user.name', 'Tradebilia Build Stamp Test'], { cwd: tempDir });
      execFileSync('git', ['add', '.'], { cwd: tempDir });
      execFileSync('git', ['commit', '--quiet', '-m', 'temporary clean source'], { cwd: tempDir });
      execFileSync('node', ['scripts/write-build-stamp.mjs'], {
        cwd: tempDir,
        env: { ...process.env, TRADEBILIA_BUILD_STAMP_OUTPUT: outputPath },
        stdio: 'pipe',
      });
      const stamp = JSON.parse(readFileSync(outputPath, 'utf8'));
      expect(stamp).toMatchObject({ sourceTreeState: 'clean' });
      expect(stamp.sourceFingerprint).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('excludes all platform-managed __manus__ metadata from the source fingerprint', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tradebilia-platform-metadata-fingerprint-'));
    const scriptDir = path.join(tempDir, 'scripts');
    const platformMetadataDir = path.join(tempDir, 'client/public/__manus__');
    const outputPath = path.join(tempDir, 'tradebilia-build.json');
    const runStamp = () => {
      execFileSync('node', ['scripts/write-build-stamp.mjs'], {
        cwd: tempDir,
        env: { ...process.env, TRADEBILIA_BUILD_STAMP_OUTPUT: outputPath },
        stdio: 'pipe',
      });
      return JSON.parse(readFileSync(outputPath, 'utf8')).sourceFingerprint;
    };
    try {
      mkdirSync(scriptDir, { recursive: true });
      mkdirSync(platformMetadataDir, { recursive: true });
      copyFileSync(path.resolve(process.cwd(), 'scripts/write-build-stamp.mjs'), path.join(scriptDir, 'write-build-stamp.mjs'));
      writeFileSync(path.join(scriptDir, 'source-fingerprint-manifest.json'), '["package.json", "scripts/write-build-stamp.mjs"]\n');
      writeFileSync(path.join(tempDir, 'package.json'), '{"name":"temporary-fingerprint-test"}\n');
      writeFileSync(path.join(platformMetadataDir, 'version.json'), '{"version":"first"}\n');
      const firstFingerprint = runStamp();
      writeFileSync(path.join(platformMetadataDir, 'runtime.json'), '{"generated":"different deployment metadata"}\n');
      writeFileSync(path.join(platformMetadataDir, 'version.json'), '{"version":"second"}\n');
      expect(runStamp()).toBe(firstFingerprint);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('includes the manifest contents in the source fingerprint without recursive manifest listing', () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tradebilia-manifest-fingerprint-'));
    const scriptDir = path.join(tempDir, 'scripts');
    const outputPath = path.join(tempDir, 'tradebilia-build.json');
    const runStamp = () => {
      execFileSync('node', ['scripts/write-build-stamp.mjs'], {
        cwd: tempDir,
        env: { ...process.env, TRADEBILIA_BUILD_STAMP_OUTPUT: outputPath },
        stdio: 'pipe',
      });
      return JSON.parse(readFileSync(outputPath, 'utf8')).sourceFingerprint;
    };
    try {
      mkdirSync(scriptDir, { recursive: true });
      copyFileSync(path.resolve(process.cwd(), 'scripts/write-build-stamp.mjs'), path.join(scriptDir, 'write-build-stamp.mjs'));
      writeFileSync(path.join(tempDir, 'package.json'), '{"name":"manifest-fingerprint-test"}\n');
      writeFileSync(path.join(scriptDir, 'source-fingerprint-manifest.json'), '["package.json"]\n');
      const firstFingerprint = runStamp();
      writeFileSync(path.join(scriptDir, 'source-fingerprint-manifest.json'), '[\n  "package.json"\n]\n');
      expect(runStamp()).not.toBe(firstFingerprint);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('lists exactly the tracked application/configuration source in the fingerprint manifest', () => {
    const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), 'scripts/source-fingerprint-manifest.json'), 'utf8'));
    const tracked = execFileSync('git', ['ls-files'], { cwd: process.cwd(), encoding: 'utf8' }).trim().split('\n');
    const rootFiles = new Set(['package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts']);
    const expected = tracked.filter((file) => (
      file !== 'scripts/source-fingerprint-manifest.json'
      && !file.startsWith('client/public/__manus__/')
      && file !== 'client/public/tradebilia-build.json'
      && (file.startsWith('client/') || file.startsWith('server/') || file.startsWith('shared/') || file.startsWith('drizzle/') || file.startsWith('scripts/') || rootFiles.has(file))
    )).sort();
    expect(manifest).toEqual(expected);
  });
});
