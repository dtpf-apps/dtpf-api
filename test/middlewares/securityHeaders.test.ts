import { describe, expect, it, vi } from 'vitest';
import {
  CONTENT_SECURITY_POLICY,
  securityHeadersMiddleware,
} from '../../src/middlewares/securityHeaders.middleware';
import { createMockRequest, createMockNext } from '../helpers/mocks';

function createResponseWithSetHeader() {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
  };
}

describe('securityHeadersMiddleware', () => {
  it('sets the five static security headers + CSP and calls next', () => {
    const req = createMockRequest();
    const res = createResponseWithSetHeader();
    const next = createMockNext();

    securityHeadersMiddleware(req, res as never, next);

    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(res.headers['Content-Security-Policy']).toBe(CONTENT_SECURITY_POLICY);
    expect(next).toHaveBeenCalledOnce();
  });

  it('CSP whitelists the portfolio runtime surface: own origin + Google Fonts + Umami', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("script-src 'self' https://analytics.dtpf.es");
    expect(CONTENT_SECURITY_POLICY).toContain('https://fonts.googleapis.com');
    expect(CONTENT_SECURITY_POLICY).toContain('https://fonts.gstatic.com');
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'self' https://analytics.dtpf.es");
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
  });
});
