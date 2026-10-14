import type { NextFunction, Request, Response } from 'express';
import { vi } from 'vitest';

interface MockResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  headersSent: boolean;
  status: (code: number) => MockResponse;
  send: (body: unknown) => MockResponse;
  setHeader: (name: string, value: string) => MockResponse;
}

/** The slice of an Express response the middlewares touch, recording what they did. */
export function mockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    headersSent: false,
    status: vi.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    send: vi.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
    setHeader: vi.fn((name: string, value: string) => {
      res.headers[name.toLowerCase()] = value;
      return res;
    }),
  };
  return res;
}

export function asExpress(res: MockResponse): { req: Request; res: Response; next: NextFunction } {
  return { req: {} as Request, res: res as unknown as Response, next: vi.fn() };
}

let senderCount = 0;

/** A submission a person would send: every field valid, rendered ten seconds ago. */
export function validContact(overrides: Record<string, unknown> = {}) {
  senderCount += 1;
  return {
    email: `visitor-${senderCount}@example.com`,
    name: 'Ada Lovelace',
    message: 'Hola, me gustaría hablar contigo sobre un proyecto.',
    website: '',
    _t: Date.now() - 10_000,
    ...overrides,
  };
}

let callerCount = 0;

/** A fresh caller address (TEST-NET-3), so one test's rate-limit budget never leaks into another's. */
export function nextCaller(): string {
  callerCount += 1;
  return `203.0.113.${callerCount}`;
}
