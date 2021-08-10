import { useRouter } from 'next/router';

export const setUpRouter = (route: string, sandbox: any, query = {}) => {
  const push = jest.fn();
  sandbox.push = push;
  // @ts-ignore
  useRouter.mockImplementation(() => ({
    push,
    pathname: '/',
    route,
    asPath: '/',
    query,
  }));
};
