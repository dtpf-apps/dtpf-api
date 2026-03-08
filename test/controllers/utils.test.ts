import { connection } from '../../src/controllers/utils';
import { createMockRequest, createMockResponse } from '../helpers/mocks';

describe('connection controller', () => {
  it('responds with status 200', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    connection(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ status: 200 });
  });
});
