import { describe, expect, it } from 'vitest';
import { resolveViteHmrPorts } from './_core/viteHmr';

describe('forwarded WebDev HMR ports', () => {
  it('uses internal port 3000 but public HTTPS port 443 by default', () => {
    expect(resolveViteHmrPorts({})).toEqual({ listenPort: 3000, clientPort: 443 });
  });
  it('never derives the advertised public port from the internal listener', () => {
    expect(resolveViteHmrPorts({ PORT: '3001' })).toEqual({ listenPort: 3001, clientPort: 443 });
  });
  it('supports an explicit local-development override', () => {
    expect(resolveViteHmrPorts({ PORT: '3000', VITE_HMR_CLIENT_PORT: '3000' })).toEqual({ listenPort: 3000, clientPort: 3000 });
  });
  it.each(['0', '-1', '65536', 'not-a-port', '3.5'])('rejects invalid port %s', value => {
    expect(resolveViteHmrPorts({ PORT: value, VITE_HMR_CLIENT_PORT: value })).toEqual({ listenPort: 3000, clientPort: 443 });
  });
});
