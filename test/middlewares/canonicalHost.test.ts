import { describe, expect, it, vi } from 'vitest';
import { canonicalHostMiddleware } from '../../src/middlewares/canonicalHost.middleware';
import { createMockNext, createMockRequest } from '../helpers/mocks';

function createRedirectingResponse() {
  return { redirect: vi.fn() };
}

describe('canonicalHostMiddleware', () => {
  it('301s a www host onto its apex, keeping path and query', () => {
    const req = createMockRequest({ hostname: 'www.dtpf.es', originalUrl: '/about?lang=en' });
    const res = createRedirectingResponse();
    const next = createMockNext();

    canonicalHostMiddleware(req, res as never, next);

    expect(res.redirect).toHaveBeenCalledWith(301, 'https://dtpf.es/about?lang=en');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirects the www root to the apex root', () => {
    const req = createMockRequest({ hostname: 'www.dtpf.es', originalUrl: '/' });
    const res = createRedirectingResponse();

    canonicalHostMiddleware(req, res as never, createMockNext());

    expect(res.redirect).toHaveBeenCalledWith(301, 'https://dtpf.es/');
  });

  it.each(['dtpf.es', 'dev.dtpf.es', 'localhost', undefined])(
    'passes host %s through untouched',
    (hostname) => {
      const req = createMockRequest({ hostname, originalUrl: '/about' });
      const res = createRedirectingResponse();
      const next = createMockNext();

      canonicalHostMiddleware(req, res as never, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();
    }
  );

  it('only matches a leading www. label, never one inside the host', () => {
    const req = createMockRequest({ hostname: 'notwww.dtpf.es', originalUrl: '/' });
    const res = createRedirectingResponse();
    const next = createMockNext();

    canonicalHostMiddleware(req, res as never, next);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
