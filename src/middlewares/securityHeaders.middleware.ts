import { NextFunction, Request, Response } from 'express';

// Tuned for the portfolio's actual surface: own origin (the frontend build
// ships its fonts as hashed assets, so no font host is needed) + the
// self-hosted Umami analytics at analytics.dtpf.es. 'unsafe-inline' on
// style-src covers React's inline style props and the inline <style>
// blocks Framer Motion emits; script-src stays strict because Vite's
// production output is external.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://analytics.dtpf.es",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self' https://analytics.dtpf.es",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  next();
}
