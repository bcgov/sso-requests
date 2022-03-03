import { notifyIdim } from '../utils/helpers';
import { formDataBceid } from './fixtures';
import { sendEmail } from '../../../shared/utils/ches';

jest.mock('../../../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

const TEST_EMAIL = 'ssoteam@bcgov.ca';

describe('Notify BCeID', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should not send an email to IDIM if updating and not approving', () => {
    notifyIdim(formDataBceid, 'update', TEST_EMAIL);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Should send an email to IDIM if deleting', () => {
    notifyIdim(formDataBceid, 'deletion', TEST_EMAIL);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('Should send an email to IDIM if submitting dev/test', () => {
    const formDataBceidDev = { ...formDataBceid, environments: ['dev'] };
    notifyIdim(formDataBceidDev, 'submission', TEST_EMAIL);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('Should not send an email to IDIM if submitting prod', () => {
    notifyIdim(formDataBceid, 'submission', TEST_EMAIL);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('Should not send an email to IDIM if in onestopauth', () => {
    const formDataIdir = { ...formDataBceid, realm: 'onestopauth' };
    notifyIdim(formDataIdir, 'submission', TEST_EMAIL);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
