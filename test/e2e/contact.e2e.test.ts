/**
 * POST /api/v1/contact-me over real HTTP, stored in a real MongoDB. Only SMTP is
 * replaced, at the email service boundary, so the notification can be inspected.
 */

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock('../../src/services/email', () => ({
  sendEmail,
  verifyEmailConnection: vi.fn(),
  transporter: { close: vi.fn() },
}));

import request from 'supertest';
import app from '../../src/app';
import Contact from '../../src/models/contact';
import { EMAIL_COOLDOWN_MS } from '../../src/services/contact.service';
import { nextCaller, validContact } from '../helpers/mocks';

const ENDPOINT = '/api/v1/contact-me';
const ACCEPTED = { status: 201, message: 'Mensaje enviado correctamente.' };
const HOUR_MS = 60 * 60 * 1000;

function post(body: string | object, caller = nextCaller()) {
  return request(app).post(ENDPOINT).set('X-Forwarded-For', caller).send(body);
}

beforeEach(async () => {
  sendEmail.mockReset();
  sendEmail.mockResolvedValue(true);
  await Contact.deleteMany({});
});

describe('a real submission', () => {
  it('is stored normalised and answered with 201', async () => {
    const res = await post(
      validContact({
        email: '  Ada@Example.COM ',
        name: '  Ada Lovelace ',
        message: '  Hola, me gustaría hablar contigo.  ',
      })
    );

    expect(res.status).toBe(201);
    expect(res.body).toEqual(ACCEPTED);
    const stored = await Contact.find().lean();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      message: 'Hola, me gustaría hablar contigo.',
    });
  });

  it('notifies the owner with a reply-to of the sender and a header-safe subject', async () => {
    await post(validContact({ email: 'Ada@Example.com', name: 'Ada\r\nBcc: victim@example.com' }));

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const mail = sendEmail.mock.calls[0]![0];
    expect(mail).toMatchObject({ to: 'dtpf@dtpf.es', replyTo: 'ada@example.com' });
    expect(mail.subject).toBe('Nuevo mensaje de Ada  Bcc: victim@example.com — dtpf.es');
  });

  it('dates the notification in the owner’s time zone', async () => {
    await post(validContact());

    const html: string = sendEmail.mock.calls[0]![0].html;
    const madridYear = new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      timeZone: 'Europe/Madrid',
    }).format(new Date());
    expect(html).toContain(madridYear);
  });

  it('stores an absent name as an empty one', async () => {
    const res = await post(validContact({ name: null }));

    expect(res.status).toBe(201);
    expect((await Contact.findOne().lean())?.name).toBe('');
  });
});

describe('bot traps answer exactly like a real submission and store nothing', () => {
  it.each([
    ['the honeypot is filled', { website: 'http://spam.example' }],
    ['the render stamp is missing', { _t: undefined }],
    ['the render stamp is not a number', { _t: '1700000000000' }],
    ['the form was sent faster than a person types', { _t: Date.now() - 500 }],
  ])('when %s', async (_label, overrides) => {
    const res = await post(validContact(overrides));

    expect(res.status).toBe(201);
    expect(res.body).toEqual(ACCEPTED);
    expect(await Contact.countDocuments()).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('checks the honeypot before validation, so a bot never learns what was invalid', async () => {
    const res = await post({ website: 'x', email: 'not-an-address' });

    expect(res.status).toBe(201);
  });
});

describe('validation', () => {
  it.each([
    ['a missing address', { email: undefined }, 'invalid_email', 'El email no es válido.'],
    ['a malformed address', { email: 'not-an-address' }, 'invalid_email', 'El email no es válido.'],
    [
      'an address without a domain suffix',
      { email: 'ada@example' },
      'invalid_email',
      'El email no es válido.',
    ],
    ['an address over 254 characters', { email: `${'a'.repeat(250)}@example.com` }, 'invalid_email', null],
    ['an address that is not a string', { email: 42 }, 'invalid_email', null],
    ['a missing message', { message: undefined }, 'message_required', 'El mensaje es obligatorio.'],
    ['a blank message', { message: '     ' }, 'message_required', null],
    [
      'a short message',
      { message: 'Corto' },
      'message_too_short',
      'El mensaje debe tener al menos 10 caracteres.',
    ],
    ['a message over 5000 characters', { message: 'a'.repeat(5001) }, 'message_too_long', null],
    ['a name over 100 characters', { name: 'a'.repeat(101) }, 'name_too_long', null],
    ['a name that is not a string', { name: { first: 'Ada' } }, 'invalid_name', null],
    [
      'more than five links',
      { message: 'http://a.es https://b.es www.c.es http://d.es http://e.es www.f.es' },
      'too_many_links',
      null,
    ],
  ])('rejects %s with 400 %s', async (_label, overrides, code, message) => {
    const res = await post(validContact(overrides));

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ status: 400, code });
    if (message) expect(res.body.message).toBe(message);
    expect(await Contact.countDocuments()).toBe(0);
  });

  it('accepts exactly five links of mixed kinds', async () => {
    const res = await post(
      validContact({ message: 'Mira http://a.es https://b.es www.c.es http://d.es www.e.es' })
    );

    expect(res.status).toBe(201);
  });
});

describe('request bodies that are not a JSON object', () => {
  it('answers a non-JSON content type with 415', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Content-Type', 'text/plain')
      .send('email=a@example.com');

    expect(res.status).toBe(415);
    expect(res.body).toMatchObject({ code: 'unsupported_media_type' });
  });

  it('answers a request with no body with 415', async () => {
    const res = await request(app).post(ENDPOINT);

    expect(res.status).toBe(415);
  });

  it('answers malformed JSON with 400 invalid_json', async () => {
    const res = await request(app).post(ENDPOINT).set('Content-Type', 'application/json').send('{"email":');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'invalid_json' });
  });

  it('answers a JSON array with 400 invalid_body', async () => {
    const res = await post([validContact()]);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'invalid_body' });
  });

  it('answers a body over 16 KB with 413', async () => {
    const res = await post(validContact({ message: 'a'.repeat(17 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ code: 'payload_too_large' });
  });
});

describe('per-caller rate limit (3 an hour)', () => {
  it('refuses the fourth submission from one caller with 429 and Retry-After', async () => {
    const caller = nextCaller();
    for (let i = 0; i < 3; i++) {
      expect((await post(validContact(), caller)).status).toBe(201);
    }

    const res = await post(validContact(), caller);

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      code: 'rate_limited',
      message: 'Demasiadas solicitudes. Inténtalo más tarde.',
    });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(3500);
    expect(await Contact.countDocuments()).toBe(3);
  });

  it('keys on the address the proxy appended, so a forged X-Forwarded-For prefix changes nothing', async () => {
    const realCaller = nextCaller();
    const statuses: number[] = [];
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post(ENDPOINT)
        .set('X-Forwarded-For', `198.51.100.${i}, ${realCaller}`)
        .send(validContact());
      statuses.push(res.status);
    }

    expect(statuses).toEqual([201, 201, 201, 429]);
  });

  it('keeps callers independent', async () => {
    const busy = nextCaller();
    for (let i = 0; i < 3; i++) await post(validContact(), busy);

    expect((await post(validContact(), busy)).status).toBe(429);
    expect((await post(validContact())).status).toBe(201);
  });
});

describe('per-address cooldown (one message a day)', () => {
  async function seed(email: string, ageMs: number) {
    await Contact.create({
      email,
      name: '',
      message: 'Mensaje anterior.',
      date: new Date(Date.now() - ageMs),
    });
  }

  it('refuses a second message within 24 h with the time left', async () => {
    await seed('ada@example.com', 2 * HOUR_MS);

    const res = await post(validContact({ email: 'ada@example.com' }));

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ code: 'email_cooldown' });
    const retryAfter = Number(res.headers['retry-after']);
    expect(retryAfter).toBe(res.body.retryAfter);
    expect(Math.abs(retryAfter - (EMAIL_COOLDOWN_MS - 2 * HOUR_MS) / 1000)).toBeLessThan(60);
    expect(await Contact.countDocuments()).toBe(1);
  });

  it('recognises the same address whatever its case and surrounding spaces', async () => {
    await seed('ada@example.com', HOUR_MS);

    const res = await post(validContact({ email: '  ADA@Example.com ' }));

    expect(res.status).toBe(429);
  });

  it('accepts a new message once 24 h have passed', async () => {
    await seed('ada@example.com', 25 * HOUR_MS);

    const res = await post(validContact({ email: 'ada@example.com' }));

    expect(res.status).toBe(201);
    expect(await Contact.countDocuments()).toBe(2);
  });

  it('stores only one of two submissions sent at the same moment', async () => {
    const [first, second] = await Promise.all([
      post(validContact({ email: 'twice@example.com' })),
      post(validContact({ email: 'twice@example.com' })),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 429]);
    expect(await Contact.countDocuments({ email: 'twice@example.com' })).toBe(1);
  });
});

describe('a failure on our side', () => {
  it('answers 500 server_error and releases the address for the next try', async () => {
    const create = vi.spyOn(Contact, 'create').mockRejectedValueOnce(new Error('database went away'));

    const failed = await post(validContact({ email: 'retry@example.com' }));

    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({
      status: 500,
      code: 'server_error',
      message: 'Error interno del servidor.',
    });
    expect(sendEmail).not.toHaveBeenCalled();

    create.mockRestore();
    const retried = await post(validContact({ email: 'retry@example.com' }));
    expect(retried.status).toBe(201);
  });
});
