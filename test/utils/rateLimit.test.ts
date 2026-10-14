import { consume, createRateLimiter, sweepExpired } from '../../src/utils/rateLimit';

const WINDOW = 60_000;
const T0 = 1_000_000;

describe('consume', () => {
  it('allows up to the limit, then reports how long until the oldest request expires', () => {
    const limiter = createRateLimiter(3, WINDOW);

    expect(consume(limiter, 'a', T0)).toBe(0);
    expect(consume(limiter, 'a', T0 + 1000)).toBe(0);
    expect(consume(limiter, 'a', T0 + 2000)).toBe(0);
    expect(consume(limiter, 'a', T0 + 5000)).toBe(WINDOW - 5000);
  });

  it('does not count a refused request against the caller', () => {
    const limiter = createRateLimiter(1, WINDOW);

    consume(limiter, 'a', T0);
    consume(limiter, 'a', T0 + 10);
    consume(limiter, 'a', T0 + 20);

    expect(limiter.hits.get('a')).toEqual([T0]);
  });

  it('slides: a request is allowed again once the oldest one leaves the window', () => {
    const limiter = createRateLimiter(1, WINDOW);

    consume(limiter, 'a', T0);
    expect(consume(limiter, 'a', T0 + WINDOW - 1)).toBe(1);
    expect(consume(limiter, 'a', T0 + WINDOW)).toBe(0);
  });

  it('keeps every key independent', () => {
    const limiter = createRateLimiter(1, WINDOW);

    expect(consume(limiter, 'a', T0)).toBe(0);
    expect(consume(limiter, 'b', T0)).toBe(0);
    expect(consume(limiter, 'a', T0)).toBeGreaterThan(0);
  });

  it('evicts the least recently seen key when the size bound is reached', () => {
    const limiter = createRateLimiter(5, WINDOW, 2);

    consume(limiter, 'a', T0);
    consume(limiter, 'b', T0 + 1);
    consume(limiter, 'a', T0 + 2);
    consume(limiter, 'c', T0 + 3);

    expect([...limiter.hits.keys()]).toEqual(['a', 'c']);
  });
});

describe('sweepExpired', () => {
  it('drops keys with no request left in the window and prunes the rest', () => {
    const limiter = createRateLimiter(5, WINDOW);
    consume(limiter, 'old', T0);
    consume(limiter, 'mixed', T0);
    consume(limiter, 'mixed', T0 + WINDOW);

    sweepExpired(limiter, T0 + WINDOW + 1);

    expect(limiter.hits.has('old')).toBe(false);
    expect(limiter.hits.get('mixed')).toEqual([T0 + WINDOW]);
  });
});
