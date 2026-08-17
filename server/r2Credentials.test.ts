import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const endpoint = process.env.R2_ENDPOINT?.replace(/\/$/, '');
const bucket = 'tradebilia-public-media';
const hasCredentials = Boolean(accessKeyId && secretAccessKey && endpoint);

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string, encoding?: 'hex'): Buffer | string {
  const digest = createHmac('sha256', key).update(value, 'utf8').digest();
  return encoding === 'hex' ? digest.toString('hex') : digest;
}

function buildAuthorizationHeader(input: {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  now: Date;
}): { authorization: string; amzDate: string; payloadHash: string } {
  const url = new URL(input.endpoint);
  const amzDate = input.now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256('');
  const canonicalQuery = 'list-type=2&max-keys=1';
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'GET',
    `/${bucket}`,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');
  const dateKey = hmac(`AWS4${input.secretAccessKey}`, dateStamp) as Buffer;
  const regionKey = hmac(dateKey, 'auto') as Buffer;
  const serviceKey = hmac(regionKey, 's3') as Buffer;
  const signingKey = hmac(serviceKey, 'aws4_request') as Buffer;
  const signature = hmac(signingKey, stringToSign, 'hex') as string;

  return {
    amzDate,
    payloadHash,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

describe.runIf(hasCredentials)('Cloudflare R2 public-media credentials', () => {
  it('lists at most one object without writing, deleting, or changing any media record', async () => {
    const now = new Date();
    const signature = buildAuthorizationHeader({
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      endpoint: endpoint!,
      now,
    });
    const response = await fetch(`${endpoint}/${bucket}?list-type=2&max-keys=1`, {
      headers: {
        Authorization: signature.authorization,
        'x-amz-content-sha256': signature.payloadHash,
        'x-amz-date': signature.amzDate,
      },
      signal: AbortSignal.timeout(15_000),
    });

    expect(response.ok).toBe(true);
  }, 25_000);
});

describe.skipIf(hasCredentials)('Cloudflare R2 public-media credentials', () => {
  it('requires secure S3-compatible credentials before live validation', () => {
    expect(hasCredentials).toBe(false);
  });
});
