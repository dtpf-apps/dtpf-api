import { NextFunction, Request, Response } from 'express';

// Cloudflare proxies both `dtpf.es` and `www.dtpf.es` to this server, and NPM forwards
// the original Host, so without this the www host serves a second, identical copy of
// the site. A canonical tag only tells crawlers which copy counts; the 301 is what
// stops the copy existing. Generic on purpose — any `www.` host collapses onto its
// apex — so no hostname is configured. The scheme is fixed: every public host here is
// served over HTTPS, and a local `localhost` never starts with `www.`.
const WWW = 'www.';

export function canonicalHostMiddleware(req: Request, res: Response, next: NextFunction): void {
  const host = req.hostname;
  if (host && host.startsWith(WWW)) {
    res.redirect(301, `https://${host.slice(WWW.length)}${req.originalUrl}`);
    return;
  }
  next();
}
