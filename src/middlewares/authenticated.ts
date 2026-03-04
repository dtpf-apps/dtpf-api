import { dauth } from 'dauth-md-node';
import config from '../config/config';

export const dauth_md = dauth({
  tsk: config.dauth.TSK,
  domainName: config.dauth.DOMAIN_NAME,
  session: {},
});
