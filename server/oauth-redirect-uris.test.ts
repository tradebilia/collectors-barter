import { describe, it, expect } from 'vitest';

describe('OAuth Redirect URI env vars', () => {
  it('FACEBOOK_REDIRECT_URI is set and points to the correct callback path', () => {
    const uri = process.env.FACEBOOK_REDIRECT_URI;
    expect(uri).toBeTruthy();
    expect(uri).toContain('/api/facebook/callback');
  });

  it('LINKEDIN_REDIRECT_URI is set and points to the correct callback path', () => {
    const uri = process.env.LINKEDIN_REDIRECT_URI;
    expect(uri).toBeTruthy();
    expect(uri).toContain('/api/linkedin/callback');
  });
});
