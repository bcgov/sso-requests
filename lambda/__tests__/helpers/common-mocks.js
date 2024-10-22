jest.mock('../../app/src/authenticate');

jest.mock('../../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});
