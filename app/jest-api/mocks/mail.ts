import * as chesModule from '@app/utils/ches';

const mockedSendEmail = jest.spyOn(chesModule, 'sendEmail') as jest.Mock<any>;

export const createMockSendEmail = () => {
  const result: any = [];
  mockedSendEmail.mockImplementation((data: any) => {
    result.push(data);
    return Promise.resolve(null);
  });

  return result;
};
