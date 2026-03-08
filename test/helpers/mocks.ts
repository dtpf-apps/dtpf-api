import { vi } from 'vitest';

export function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  } as any;
}

export function createMockResponse() {
  const res: any = {
    statusCode: 200,
    _body: null,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.send = vi.fn((body: unknown) => {
    res._body = body;
    return res;
  });
  res.json = vi.fn((body: unknown) => {
    res._body = body;
    return res;
  });
  return res;
}

export function createMockNext() {
  return vi.fn();
}

export function createValidContactBody(overrides: Record<string, unknown> = {}) {
  return {
    email: 'test@example.com',
    name: 'Test User',
    message: 'Este es un mensaje de prueba lo suficientemente largo.',
    website: '',
    _t: Date.now() - 10000, // 10 seconds ago
    ...overrides,
  };
}
