import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routerSource = readFileSync(new URL('./testAIRouter.ts', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../client/src/pages/TestAI.tsx', import.meta.url), 'utf8');

describe('Test AI analyzer input compatibility', () => {
  it('accepts nullable certification metadata for both analyzer items', () => {
    const analyzeBlock = routerSource.slice(routerSource.indexOf('analyzeItems:'));
    expect(analyzeBlock.match(/certificationCompany: z\.string\(\)\.nullish\(\)/g)).toHaveLength(2);
  });

  it('normalizes nullable client certification values before mutation', () => {
    expect(clientSource).toContain('certificationCompany: leftItem.certificationCompany ?? undefined');
    expect(clientSource).toContain('certificationCompany: rightItem.certificationCompany ?? undefined');
  });
});
