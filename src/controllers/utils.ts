import { Request, Response } from 'express';

export function connection(_req: Request, res: Response) {
  return res.status(200).send({ status: 200, message: 'ok' });
}
