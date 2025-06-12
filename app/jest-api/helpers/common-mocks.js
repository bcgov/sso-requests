jest.mock('@app/utils/authenticate');

jest.mock('@app/utils/ches', () => {
  return {
    ...jest.requireActual('@app/utils/ches'),
    sendEmail: jest.fn(),
  };
});

jest.mock('next/config', () => () => ({
  serverRuntimeConfig: {
    contextPath: '',
  },
}));
