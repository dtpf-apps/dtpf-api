import { IDauthUser } from 'dauth-md-node';
import { Request } from 'express';

export interface IRequestUser extends Request {
  user: IDauthUser;
}
