import { contactNotificationHtml } from '../../src/services/emailTemplates';

describe('contactNotificationHtml', () => {
  const baseData = {
    name: 'Juan García',
    email: 'juan@example.com',
    message: 'Hola, me interesa tu portfolio.',
    date: 'lunes, 1 de enero de 2026, 10:00',
  };

  it('generates valid HTML with provided data', () => {
    const html = contactNotificationHtml(baseData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Juan García');
    expect(html).toContain('juan@example.com');
    expect(html).toContain('Hola, me interesa tu portfolio.');
    expect(html).toContain('lunes, 1 de enero de 2026, 10:00');
  });

  it('escapes HTML special characters in name', () => {
    const html = contactNotificationHtml({ ...baseData, name: '<script>alert("xss")</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML special characters in email', () => {
    const html = contactNotificationHtml({ ...baseData, email: 'test@"evil".com' });
    expect(html).not.toContain('"evil"');
    expect(html).toContain('&quot;evil&quot;');
  });

  it('escapes HTML special characters in message', () => {
    const html = contactNotificationHtml({ ...baseData, message: 'a & b < c > d' });
    expect(html).toContain('a &amp; b &lt; c &gt; d');
  });

  it('escapes single quotes', () => {
    const html = contactNotificationHtml({ ...baseData, name: "O'Brien" });
    expect(html).toContain('O&#039;Brien');
  });

  it('converts newlines to <br /> in message', () => {
    const html = contactNotificationHtml({ ...baseData, message: 'Línea 1\nLínea 2\nLínea 3' });
    expect(html).toContain('Línea 1<br />Línea 2<br />Línea 3');
  });

  it('includes mailto link with email', () => {
    const html = contactNotificationHtml(baseData);
    expect(html).toContain('mailto:juan@example.com');
    expect(html).toContain('Responder a Juan García');
  });

  it('uses "Sin nombre" when name is empty', () => {
    const html = contactNotificationHtml({ ...baseData, name: '' });
    expect(html).toContain('Sin nombre');
    expect(html).toContain('Responder a Sin nombre');
  });

  it('handles very long strings (>1000 chars) without breaking', () => {
    const longMessage = 'A'.repeat(1500);
    const html = contactNotificationHtml({ ...baseData, message: longMessage });
    expect(html).toContain('A'.repeat(1500));
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('handles unicode and special characters combined', () => {
    const html = contactNotificationHtml({
      ...baseData,
      name: 'José María <Ñoño>',
      message: 'Hola 👋 ¿Qué tal? €100 & más — "comillas"',
    });
    expect(html).toContain('José María &lt;Ñoño&gt;');
    expect(html).toContain('€100 &amp; más — &quot;comillas&quot;');
    expect(html).toContain('👋');
  });

  it('converts consecutive newlines to multiple <br /> tags', () => {
    const html = contactNotificationHtml({
      ...baseData,
      message: 'Párrafo 1\n\n\nPárrafo 2',
    });
    expect(html).toContain('Párrafo 1<br /><br /><br />Párrafo 2');
  });
});
