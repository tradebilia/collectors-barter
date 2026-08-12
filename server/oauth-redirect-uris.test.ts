import { describe, it, expect } from 'vitest';
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { registerProviderOAuthCallbacks } from "./_core/providerOAuthCallbacks";

describe('OAuth Redirect URI env vars', () => {
  const original = process.env.TRADEBILIA_STAGING_MODE;

  afterEach(() => {
    if (original === undefined) delete process.env.TRADEBILIA_STAGING_MODE;
    else process.env.TRADEBILIA_STAGING_MODE = original;
  });

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

  it('blocks every provider callback before token exchange when staging mode is enabled', async () => {
    process.env.TRADEBILIA_STAGING_MODE = '1';
    const app = express();
    registerProviderOAuthCallbacks(app);

    for (const provider of ['ebay', 'facebook', 'linkedin']) {
      const res = await request(app).get(`/api/${provider}/callback`).query({ code: 'unused' });
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('reason=staging_disabled');
    }
  });

  it('does not apply the staging callback short-circuit by default', async () => {
    delete process.env.TRADEBILIA_STAGING_MODE;
    const app = express();
    registerProviderOAuthCallbacks(app);

    for (const provider of ['ebay', 'facebook', 'linkedin']) {
      const res = await request(app).get(`/api/${provider}/callback`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('reason=no_code');
      expect(res.headers.location).not.toContain('staging_disabled');
    }
  });
});
