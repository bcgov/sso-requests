jest.mock('../../app/src/authenticate');

jest.mock('../../app/src/utils/rate-limiters', () => {
  return {
    logsRateLimiter: jest.fn((req, res, next) => {
      next();
    }),
  };
});

jest.mock('../../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});
