import { Request } from 'express';

interface RateLimitStore {
  ipRequests: Map<string, number[]>;
  maxRequests: number;
  windowMs: number;
  maxIps: number;
}

export function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export function createRateLimiter(maxRequests: number, windowMs: number, maxIps = 10000): RateLimitStore {
  const store: RateLimitStore = {
    ipRequests: new Map(),
    maxRequests,
    windowMs,
    maxIps,
  };

  // Periodic cleanup every 5 minutes
  setInterval(() => cleanExpiredEntries(store), 5 * 60 * 1000);

  return store;
}

export function cleanExpiredEntries(store: RateLimitStore): void {
  const now = Date.now();
  for (const [ip, timestamps] of store.ipRequests) {
    const valid = timestamps.filter((t) => now - t < store.windowMs);
    if (valid.length === 0) {
      store.ipRequests.delete(ip);
    } else {
      store.ipRequests.set(ip, valid);
    }
  }
}

export function isRateLimited(store: RateLimitStore, clientIp: string): boolean {
  cleanExpiredEntries(store);

  const now = Date.now();
  const timestamps = store.ipRequests.get(clientIp) || [];
  const recent = timestamps.filter((t) => now - t < store.windowMs);

  if (recent.length >= store.maxRequests) {
    return true;
  }

  recent.push(now);

  // Guard against unbounded growth
  if (store.ipRequests.size >= store.maxIps && !store.ipRequests.has(clientIp)) {
    const oldest = [...store.ipRequests.entries()].sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]))[0];
    if (oldest) store.ipRequests.delete(oldest[0]);
  }

  store.ipRequests.set(clientIp, recent);
  return false;
}
