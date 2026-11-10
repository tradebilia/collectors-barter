// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestAiSafeImage } from '../client/src/components/TestAiSafeImage';
import { TestAiCandidateImagePair } from '../client/src/components/TestAiCandidateStatus';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove(); vi.unstubAllGlobals();
});

// jsdom does not fetch these URLs: actual React/DOM events only, not live image proof.
describe('Approved broken marketplace image display repair', () => {
  it('loads a supplied image and replaces a real error event with an explicit placeholder', async () => {
    await act(async () => { root.render(<TestAiSafeImage src="https://example.test/goldin/lot.jpg" alt="Goldin lot" className="h-8 w-8" />); });
    const image = container.querySelector('img')!;
    expect(image.getAttribute('src')).toBe('https://example.test/goldin/lot.jpg');
    await act(async () => { image.dispatchEvent(new Event('error')); });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-image-unavailable]')?.textContent).toBe('Image unavailable');
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Goldin lot (image unavailable)');
    expect(container.querySelector('[role="img"]')?.className).toContain('h-8 w-8');
  });
  it('keeps the failed exact URL unavailable but gives a changed URL a fresh display attempt', async () => {
    const render = async (src: string) => act(async () => { root.render(<TestAiSafeImage src={src} />); });
    await render('https://example.test/expired.jpg');
    await act(async () => { container.querySelector('img')!.dispatchEvent(new Event('error')); });
    await render('https://example.test/expired.jpg');
    expect(container.querySelector('img')).toBeNull();
    await render('https://example.test/replacement.jpg');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/replacement.jpg');
    expect(container.querySelector('[data-image-unavailable]')).toBeNull();
  });
  it('an old request error cannot mark a still-pending replacement source failed', async () => {
    await act(async () => { root.render(<TestAiSafeImage src="https://example.test/old.jpg" />); });
    const old = container.querySelector('img')!;
    await act(async () => { root.render(<TestAiSafeImage src="https://example.test/new.jpg" />); });
    const replacement = container.querySelector('img')!;
    expect(replacement).not.toBe(old);
    await act(async () => { old.dispatchEvent(new Event('error')); });
    expect(container.querySelector('img')).toBe(replacement);
    expect(container.querySelector('[data-image-unavailable]')).toBeNull();
    await act(async () => { replacement.dispatchEvent(new Event('error')); });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-image-unavailable]')).not.toBeNull();
  });
  it('two instances using the same URL keep independent failure state', async () => {
    await act(async () => { root.render(<><TestAiSafeImage src="https://example.test/same.jpg" alt="Target" /><TestAiSafeImage src="https://example.test/same.jpg" alt="Candidate" /></>); });
    const images = container.querySelectorAll('img');
    await act(async () => { images[1].dispatchEvent(new Event('error')); });
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')?.alt).toBe('Target');
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain('Candidate');
  });
  it('does not create a fake image for a missing URL', async () => {
    await act(async () => { root.render(<TestAiSafeImage src={null} />); });
    expect(container.innerHTML).toBe('');
  });
  it('failed candidate image does not replace the working target or mutate source evidence', async () => {
    const listing = { title: 'Goldin auction lot', imageUrl: 'https://example.test/candidate.jpg',
      visualReviewVerdict: 'mismatch', metadataMatchScore: 85 } as any;
    const original = JSON.stringify(listing);
    await act(async () => { root.render(<TestAiCandidateImagePair listing={listing} targetImageUrl="https://example.test/target.jpg" />); });
    const images = container.querySelectorAll('img'); expect(images).toHaveLength(2);
    await act(async () => { images[1].dispatchEvent(new Event('error')); });
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.test/target.jpg');
    expect(container.textContent).toContain('Candidate'); expect(container.textContent).toContain('Image unavailable');
    expect(JSON.stringify(listing)).toBe(original);
  });
  it('specialist record thumbnails use the same actual safe-image component', () => {
    const page = readFileSync(resolve(import.meta.dirname, '../client/src/pages/TestAI.tsx'), 'utf8');
    expect(page).toContain('<TestAiSafeImage src={record.imageUrl}');
    expect(page).not.toContain('{record.imageUrl && <img');
    expect(page).toContain('data?.retrievalWarning');
  });
});
