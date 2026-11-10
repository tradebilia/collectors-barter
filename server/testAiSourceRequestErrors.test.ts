import { describe, expect, it } from 'vitest';
import { sourceRequestDisplayData, sourceRequestSafeErrorMessage, sourceEvidenceMessage, sourceEvidenceStatus } from '../shared/testAiSourceDisplay';

describe('safe source request errors', () => {
  it('shows dispatch overflow as a request not sent, not a marketplace with no matches', () => {
    const packet = sourceRequestDisplayData(undefined, true, new Error('Input is too big for a single dispatch'));
    expect(sourceEvidenceStatus(packet)).toBe('error');
    expect(sourceEvidenceMessage(packet)).toContain('request was not sent');
    expect(sourceEvidenceMessage(packet)).toContain('request-size limit');
    expect(sourceEvidenceMessage(packet)).not.toContain('zero matches');
  });
  it('preserves all already returned rows and the explicit reason after a failed refresh', () => {
    const rows = [{ title: 'Batman', price: 11 }];
    const packet = sourceRequestDisplayData({ listings: rows }, true, new Error('Input is too big for a single dispatch'));
    expect(packet?.listings).toBe(rows);
    expect(sourceEvidenceStatus(packet)).toBe('partial');
    expect(sourceEvidenceMessage(packet)).toContain('request was not sent');
    expect(sourceEvidenceMessage(packet)).not.toContain('See actual attempt outcomes');
  });
  it('keeps successful packets identical without allocating a new wrapper', () => {
    const packet = { listings: [{ title: 'Batman' }] };
    expect(sourceRequestDisplayData(packet, false, new Error('ignored'))).toBe(packet);
  });
  it('never copies a raw URL, stack, credential or request body from an error', () => {
    const error = new Error('Provider failed https://example.invalid/?api_key=SECRET_FIXTURE');
    const packet = sourceRequestDisplayData(undefined, true, error);
    const message = sourceEvidenceMessage(packet);
    expect(message).toContain('Source request failed');
    expect(message).not.toMatch(/SECRET_FIXTURE|api_key|example.invalid|stack/i);
  });
  it('recognizes overflow without exposing other raw details on the same error', () => {
    const message = sourceRequestSafeErrorMessage(new Error('Input is too big for a single dispatch https://example.invalid/?token=SECRET_FIXTURE'));
    expect(message).toContain('request was not sent');
    expect(message).not.toMatch(/SECRET_FIXTURE|token|example.invalid/i);
  });
  it('does not execute message getters or arbitrary string conversion', () => {
    let touched = false;
    const getter = Object.defineProperty({}, 'message', { get() { touched = true; throw new Error('must not execute'); } });
    expect(sourceRequestSafeErrorMessage(getter)).toBeNull();
    expect(sourceRequestSafeErrorMessage({ message: { toString() { touched = true; return 'Input is too big for a single dispatch'; } } })).toBeNull();
    expect(touched).toBe(false);
  });
});
