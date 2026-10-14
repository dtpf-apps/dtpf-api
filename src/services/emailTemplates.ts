interface ContactNotificationData {
  name: string;
  email: string;
  message: string;
  date: string;
}

export function contactNotificationHtml(data: ContactNotificationData): string {
  const escapedName = escapeHtml(data.name || 'Sin nombre');
  const escapedEmail = escapeHtml(data.email);
  const escapedMessage = escapeHtml(data.message).replace(/\n/g, '<br />');
  const escapedDate = escapeHtml(data.date);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nuevo mensaje de contacto</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0F19;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#E8ECF4;letter-spacing:-0.5px;">
                    dtpf
                  </td>
                  <td align="right" style="font-size:11px;font-family:'Courier New',monospace;color:#4B5567;letter-spacing:1.5px;text-transform:uppercase;">
                    Nuevo contacto
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background-color:#151C2C;border:1px solid #1E293B;border-radius:16px;overflow:hidden;">
              <!-- Accent top line -->
              <div style="height:3px;background:linear-gradient(90deg,#2DD4BF,#FBBF24);"></div>

              <!-- Content -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 36px;">
                <!-- Title -->
                <tr>
                  <td style="padding:0 0 24px 0;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;color:#E8ECF4;letter-spacing:-0.5px;">
                      Nuevo mensaje de contacto
                    </h1>
                    <p style="margin:8px 0 0 0;font-size:14px;color:#8B95A9;">
                      Alguien te ha escrito desde dtpf.es
                    </p>
                  </td>
                </tr>

                <!-- Sender info -->
                <tr>
                  <td style="padding:0 0 24px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0F19;border:1px solid #1E293B;border-radius:10px;padding:20px 24px;">
                      <tr>
                        <td>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:0 0 12px 0;">
                                <span style="font-size:10px;font-family:'Courier New',monospace;color:#2DD4BF;letter-spacing:1.5px;text-transform:uppercase;">De</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 4px 0;">
                                <span style="font-size:16px;font-weight:600;color:#E8ECF4;">${escapedName}</span>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <a href="mailto:${escapedEmail}" style="font-size:14px;color:#2DD4BF;text-decoration:none;">${escapedEmail}</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Message -->
                <tr>
                  <td style="padding:0 0 24px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 0 12px 0;">
                          <span style="font-size:10px;font-family:'Courier New',monospace;color:#2DD4BF;letter-spacing:1.5px;text-transform:uppercase;">Mensaje</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;line-height:1.7;color:#8B95A9;border-left:3px solid #2DD4BF;padding:12px 0 12px 20px;">
                          ${escapedMessage}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Reply CTA -->
                <tr>
                  <td style="padding:0 0 20px 0;" align="center">
                    <a href="mailto:${escapedEmail}?subject=Re:%20Contacto%20desde%20dtpf.es" style="display:inline-block;background-color:#2DD4BF;color:#0B0F19;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:10px;">
                      Responder a ${escapedName}
                    </a>
                  </td>
                </tr>

                <!-- Date -->
                <tr>
                  <td style="border-top:1px solid #1E293B;padding:16px 0 0 0;">
                    <span style="font-size:12px;font-family:'Courier New',monospace;color:#4B5567;">
                      ${escapedDate}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0 0;" align="center">
              <p style="margin:0;font-size:12px;color:#4B5567;">
                Este email fue generado automáticamente por
                <a href="https://dtpf.es" style="color:#2DD4BF;text-decoration:none;">dtpf.es</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
