function validPort(value: string | undefined, fallback: number): number {
  const port = value === undefined || value.trim() === '' ? fallback : Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : fallback;
}

/** This WebDev preview is HTTPS-forwarded; local development may explicitly override the public port. */
export function resolveViteHmrPorts(env: { PORT?: string; VITE_HMR_CLIENT_PORT?: string }) {
  return {
    listenPort: validPort(env.PORT, 3000),
    clientPort: validPort(env.VITE_HMR_CLIENT_PORT, 443),
  };
}
