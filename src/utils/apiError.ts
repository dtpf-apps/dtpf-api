import type { Response } from 'express';

// `code` is the contract: the web client maps it to its own copy in the visitor's
// language. `message` is the Spanish text for any caller that only shows a string.
export const ERROR_MESSAGES = {
  invalid_body: 'El cuerpo de la petición no es válido.',
  invalid_json: 'El cuerpo de la petición no es JSON válido.',
  unsupported_media_type: 'El cuerpo debe enviarse como application/json.',
  payload_too_large: 'La petición es demasiado grande.',
  invalid_email: 'El email no es válido.',
  invalid_name: 'El nombre no es válido.',
  name_too_long: 'El nombre no puede superar los 100 caracteres.',
  message_required: 'El mensaje es obligatorio.',
  message_too_short: 'El mensaje debe tener al menos 10 caracteres.',
  message_too_long: 'El mensaje no puede superar los 5000 caracteres.',
  too_many_links: 'El mensaje tiene demasiados enlaces.',
  rate_limited: 'Demasiadas solicitudes. Inténtalo más tarde.',
  email_cooldown: 'Ya has enviado un mensaje recientemente. Inténtalo más tarde.',
  invalid_client_error: 'El reporte de error no es válido.',
  not_found: 'Recurso no encontrado.',
  bad_request: 'Petición no válida.',
  server_error: 'Error interno del servidor.',
  service_unavailable: 'Servicio no disponible.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(ERROR_MESSAGES, value);
}

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  options: { retryAfterMs?: number } = {}
) {
  const body: Record<string, unknown> = { status, code, message: ERROR_MESSAGES[code] };
  if (options.retryAfterMs !== undefined) {
    const seconds = Math.max(1, Math.ceil(options.retryAfterMs / 1000));
    res.setHeader('Retry-After', String(seconds));
    body.retryAfter = seconds;
  }
  return res.status(status).send(body);
}
