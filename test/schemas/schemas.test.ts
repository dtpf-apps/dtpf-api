import { clientErrorSchema } from '../../src/schemas/clientError.schema';
import { contactSchema, firstErrorCode } from '../../src/schemas/contact.schema';

function codeFor(body: unknown) {
  const result = contactSchema.safeParse(body);
  if (result.success) throw new Error('expected the body to be rejected');
  return firstErrorCode(result.error);
}

describe('contactSchema', () => {
  it('normalises what it accepts: trimmed fields, lower-cased address', () => {
    const result = contactSchema.parse({
      email: '  Ada@Example.COM ',
      name: '  Ada  ',
      message: '\n  Un mensaje con espacios alrededor.  \n',
    });

    expect(result).toEqual({
      email: 'ada@example.com',
      name: 'Ada',
      message: 'Un mensaje con espacios alrededor.',
    });
  });

  it('accepts a missing or null name as an empty one', () => {
    expect(contactSchema.parse({ email: 'a@example.com', message: 'Mensaje largo.' }).name).toBe('');
    expect(contactSchema.parse({ email: 'a@example.com', message: 'Mensaje largo.', name: null }).name).toBe(
      ''
    );
  });

  it('drops fields it does not know', () => {
    const result = contactSchema.parse({ email: 'a@example.com', message: 'Mensaje largo.', admin: true });

    expect(result).not.toHaveProperty('admin');
  });

  it('reports the first problem in field order: the address before the message', () => {
    expect(codeFor({ email: 'nope', message: '' })).toBe('invalid_email');
  });

  it('reports a blank message as missing, not as too short', () => {
    expect(codeFor({ email: 'a@example.com', message: '    ' })).toBe('message_required');
  });

  it.each([undefined, null, [], 'text'])(
    'reports a body that is not an object (%j) as invalid_body',
    (body) => {
      expect(codeFor(body)).toBe('invalid_body');
    }
  );
});

describe('clientErrorSchema', () => {
  it('clips long diagnostics instead of rejecting them', () => {
    const result = clientErrorSchema.parse({
      message: 'm'.repeat(600),
      source: 'error-boundary',
      stack: 's'.repeat(3000),
      url: 'u'.repeat(600),
      userAgent: 'a'.repeat(300),
    });

    expect(result.message).toHaveLength(500);
    expect(result.stack).toHaveLength(2000);
    expect(result.url).toHaveLength(500);
    expect(result.userAgent).toHaveLength(200);
  });

  it('rejects a source the client never sends', () => {
    expect(clientErrorSchema.safeParse({ message: 'x', source: 'fetch-error' }).success).toBe(false);
  });
});
