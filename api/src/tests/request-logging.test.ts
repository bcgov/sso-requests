jest.mock('@/logger', () => {
  const httpLog = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return {
    logger: { child: jest.fn(() => httpLog) },
    runWithLogContext: (_context: unknown, callback: () => unknown) => callback(),
  };
});

import { logger } from '@/logger';
import { requestLogging } from '@/middleware/request-logging';

describe('requestLogging', () => {
  it('includes the authenticated service-account client id in the access log', () => {
    let finish = () => {};
    const req = {
      headers: {},
      originalUrl: '/api/v1/roles?view=all',
      method: 'POST',
      apiClientId: 'service-account-123',
    } as any;
    const res = {
      setHeader: jest.fn(),
      statusCode: 201,
      once: jest.fn((_event: string, callback: () => void) => {
        finish = callback;
      }),
    } as any;

    requestLogging(req, res, jest.fn());
    finish();

    const httpLog = (logger.child as jest.Mock).mock.results[0].value;
    expect(httpLog.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/api/v1/roles',
        status: 201,
        apiClientId: 'service-account-123',
      }),
      'request completed',
    );
  });
});
