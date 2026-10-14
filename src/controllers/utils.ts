import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { sendError } from '../utils/apiError';

export function connection(_req: Request, res: Response) {
  // The API exists to store contact messages; without the database it cannot do that.
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    return sendError(res, 503, 'service_unavailable');
  }
  return res.status(200).send({ status: 200, message: 'ok' });
}
