import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
      expect(Object.keys(stamp).sort()).toEqual(['builtAt', 'sourceCommit', 'sourceTreeState']);
      expect(Number.isNaN(Date.parse(stamp.builtAt))).toBe(false);
      expect(JSON.stringify(stamp)).not.toMatch(/database|token|secret|password|api.?key/i);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
