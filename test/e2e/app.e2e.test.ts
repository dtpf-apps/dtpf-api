/**
 * The application shell over real HTTP: health, host canonicalisation, the absence
 * of CORS, unknown routes, malformed URLs, and the static client with its
 * pre-rendered pages.
 */

// The static block serves the built SPA from `client/`, which this repo never
// contains. A throwaway fixture stands in for it so the per-route HTML resolution
// is exercised over real HTTP: a shell, two pre-rendered routes, and a file that
// sits OUTSIDE the client root and must never be reachable.
const { clientFixture } = await vi.hoisted(async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const nodePath = await import('node:path');
  const root = fs.mkdtempSync(nodePath.join(os.tmpdir(), 'dtpf-api-client-'));
  const client = nodePath.join(root, 'client');
  const write = (rel: string, title: string) => {
    const file = nodePath.join(root, rel);
    fs.mkdirSync(nodePath.dirname(file), { recursive: true });
    fs.writeFileSync(file, `<!doctype html><html><head><title>${title}</title></head><body></body></html>`);
  };
  write('client/index.html', 'shell');
  write('client/about/index.html', 'about page');
  write('client/en/index.html', 'english home');
  write('outside/index.html', 'outside the client root');
  process.env.CLIENT_DIR = client;
  return { clientFixture: { root, client } };
});

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app';

describe('health check', () => {
  it('answers 200 while the database is connected', async () => {
    const res = await request(app).get('/api/v1/connection');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 200, message: 'ok' });
  });
});

describe('no CORS', () => {
  it.each(['http://localhost:3000', 'https://dtpf.es', 'https://evil.example'])(
    'grants no cross-origin access to %s',
    async (origin) => {
      const res = await request(app).get('/api/v1/connection').set('Origin', origin);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    }
  );

  it('answers a preflight without granting anything', async () => {
    const res = await request(app)
      .options('/api/v1/contact-me')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('canonical host', () => {
  it('301s a www host onto the apex over real HTTP, path and query kept', async () => {
    const res = await request(app).get('/about?lang=en').set('Host', 'www.dtpf.es');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('https://dtpf.es/about?lang=en');
  });

  it('answers the apex host itself, no redirect', async () => {
    const res = await request(app).get('/api/v1/connection').set('Host', 'dtpf.es');
    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
  });
});

describe('unknown API routes', () => {
  it('get a JSON 404, never the SPA shell', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toMatchObject({ status: 404, code: 'not_found' });
  });

  it('get a JSON 404 for a method the route does not take', async () => {
    const res = await request(app).get('/api/v1/contact-me');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'not_found' });
  });
});

describe('error handler ordering (scanner-style malformed URL)', () => {
  // A scanner probing `GET /%c0` makes serve-static / the `{*splat}` param
  // decoder throw a URIError (status 400). The error handler must be registered
  // LAST (after the production static/catch-all block) so this reaches it and
  // returns clean JSON — not Express's default finalhandler, which leaks a
  // stack trace when NODE_ENV != production. Guards against re-introducing the
  // handler-before-static ordering bug.
  it('returns clean JSON 400 for a malformed-URL URIError, never the default HTML stack trace', async () => {
    const res = await request(app).get('/%c0');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toMatchObject({ status: 400, code: 'bad_request' });
    expect(JSON.stringify(res.body)).not.toContain('URIError');
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });
});

describe('SPA shell and pre-rendered routes', () => {
  afterAll(async () => {
    const fs = await import('node:fs');
    fs.rmSync(clientFixture.root, { recursive: true, force: true });
  });

  const html = async (url: string, status = 200) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(status);
    expect(res.headers['content-type']).toMatch(/html/);
    return res.text;
  };

  it('serves the shell at the root', async () => {
    expect(await html('/')).toContain('<title>shell</title>');
  });

  it('serves a route its own pre-rendered HTML, with and without the trailing slash', async () => {
    expect(await html('/about')).toContain('<title>about page</title>');
    expect(await html('/about/')).toContain('<title>about page</title>');
    expect(await html('/en')).toContain('<title>english home</title>');
  });

  it('serves the shell with a 404 for a path the build did not pre-render', async () => {
    expect(await html('/projects/anything', 404)).toContain('<title>shell</title>');
    expect(await html('/en/projects', 404)).toContain('<title>shell</title>');
  });

  it('sends every HTML response with no-transform, so the edge leaves the markup alone', async () => {
    // Static index (`/`, `/about/`), catch-all page (`/about`) and the 404 shell all go
    // through Cloudflare's HTML rewriter unless the origin declines it.
    for (const [url, status] of [
      ['/', 200],
      ['/about/', 200],
      ['/about', 200],
      ['/projects/anything', 404],
    ] as const) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(status);
      expect(res.headers['cache-control'], url).toBe('public, max-age=0, no-transform');
      expect(res.headers['cdn-cache-control'], url).toBe('no-store');
    }
  });

  it('keeps the 200 shell for a client built without pre-rendered pages', async () => {
    const fs = await import('node:fs');
    const nodePath = await import('node:path');
    const marker = nodePath.join(clientFixture.client, 'en', 'index.html');
    fs.renameSync(marker, `${marker}.off`);
    try {
      expect(await html('/projects/anything')).toContain('<title>shell</title>');
    } finally {
      fs.renameSync(`${marker}.off`, marker);
    }
  });

  it('never resolves a pre-rendered page outside the client root', async () => {
    // Node's HTTP client sends the path verbatim, so Express sees the `..` segments.
    expect(await html('/../outside', 404)).toContain('<title>shell</title>');
    expect(await html('/about/../../outside', 404)).toContain('<title>shell</title>');
    expect(await html('/..%2Foutside', 404)).toContain('<title>shell</title>');
  });
});

// Last on purpose: it takes the database away from the rest of this file.
describe('health check without a database', () => {
  it('answers 503 service_unavailable', async () => {
    await mongoose.disconnect();

    const res = await request(app).get('/api/v1/connection');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 503, code: 'service_unavailable' });
  });
});
