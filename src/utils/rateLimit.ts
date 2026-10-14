export interface RateLimiter {
  /** Request timestamps per key, oldest first. Map order is least recently seen key first. */
  readonly hits: Map<string, number[]>;
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly maxKeys: number;
}

const SWEEP_INTERVAL_MS = 5 * 60 * 1000;

/** A sliding-window limiter held in memory: the API runs as a single process per environment. */
export function createRateLimiter(maxRequests: number, windowMs: number, maxKeys = 10_000): RateLimiter {
  const limiter: RateLimiter = { hits: new Map(), maxRequests, windowMs, maxKeys };
  // Drops keys that never come back. Unref'd so it never keeps a process or a test run alive.
  setInterval(() => sweepExpired(limiter), SWEEP_INTERVAL_MS).unref();
  return limiter;
}

export function sweepExpired(limiter: RateLimiter, now = Date.now()): void {
  for (const [key, timestamps] of limiter.hits) {
    const recent = timestamps.filter((t) => now - t < limiter.windowMs);
    if (recent.length === 0) limiter.hits.delete(key);
    else limiter.hits.set(key, recent);
  }
}

/**
 * Counts one request for `key`. Returns 0 when it is allowed, otherwise how many
 * milliseconds remain until the oldest request in the window expires.
 */
export function consume(limiter: RateLimiter, key: string, now = Date.now()): number {
  const recent = (limiter.hits.get(key) ?? []).filter((t) => now - t < limiter.windowMs);

  if (recent.length >= limiter.maxRequests) {
    limiter.hits.set(key, recent);
    const oldest = recent[0] ?? now;
    return oldest + limiter.windowMs - now;
  }

  recent.push(now);
  // Re-inserting moves the key to the end, so the first key is always the least
  // recently seen one and the size bound evicts it without scanning.
  limiter.hits.delete(key);
  if (limiter.hits.size >= limiter.maxKeys) {
    const leastRecent = limiter.hits.keys().next().value;
    if (leastRecent !== undefined) limiter.hits.delete(leastRecent);
  }
  limiter.hits.set(key, recent);
  return 0;
}
