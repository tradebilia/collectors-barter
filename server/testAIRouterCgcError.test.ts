import { describe, expect, it } from 'vitest';
import { formatParseBotApiError } from './testAIRouter';

describe('Parse.bot CGC error formatting', () => {
  it('explains a structured monthly credit-limit response without [object Object]', () => {
    const message = formatParseBotApiError({
      error: { error: 'Usage limit exceeded', message: "You've used all your credits this month." },
      status_code: 402,
    }, 402, 'Parse.bot CGC Comics');

    expect(message).toContain('monthly credit limit has been reached');
    expect(message).toContain('HTTP 402');
    expect(message).not.toContain('[object Object]');
  });

  it('preserves a useful message for ordinary provider errors', () => {
    expect(formatParseBotApiError({ error: { message: 'Certificate not found' } }, 404, 'Parse.bot CGC Comics'))
      .toBe('Parse.bot CGC Comics API error (HTTP 404): Certificate not found');
  });
});
