import { authenticate as appAuth } from '@lambda-app/authenticate';
import { renderTemplate } from '@lambda-shared/templates';
import { sendEmail } from '@lambda-shared/utils/ches';
import { EMAILS } from '@lambda-shared/enums';
import { SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS } from '@lambda-shared/local';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2, AuthMock } from './00.db.test';
import { Integration } from './helpers/integration';

jest.mock('@lambda-app/authenticate');
jest.mock('@lambda-app/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
  };
});
jest.mock('@lambda-shared/utils/ches');

const mockedAppAuth = appAuth as jest.Mock<AuthMock>;
const mockedSendEmail = sendEmail as jest.Mock<any>;

mockedAppAuth.mockImplementation(() => {
  return Promise.resolve({
    idir_userid: TEST_IDIR_USERID,
    email: TEST_IDIR_EMAIL,
    client_roles: [],
    given_name: '',
    family_name: '',
  });
});

const setMockedSendEmail = () => {
  const result = [];
  mockedSendEmail.mockImplementation((data: any) => {
    result.push(data);
    return Promise.resolve(null);
  });

  return result;
};

describe('Feature: Update Integration Approved - User notification', () => {
  let emailList: any = [];

  const integration = new Integration();

  it('should create a DRAFT integration without a team', async () => {
    const res = await integration.create({ bceid: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should update integration status to apply-success', async () => {
    await integration.success();
  });

  it('should update the integration', async () => {
    integration.set({ projectName: 'newproject' });
    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should update integration status to apply-success', async () => {
    emailList = setMockedSendEmail();
    await integration.success();
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, { integration: integration.current });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(1);
    expect(emailList[0].to[0]).toEqual(TEST_IDIR_EMAIL);
    expect(emailList[0].cc.length).toEqual(1);
    expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
  });
});

describe('Feature: Update Integration Approved - Team notification', () => {
  let emailList: any = [];

  const integration = new Integration();

  it('should create a DRAFT integration with a team', async () => {
    const res = await integration.create({ bceid: true, usesTeam: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should update integration status to apply-success', async () => {
    await integration.success();
  });

  it('should update the integration', async () => {
    integration.set({ projectName: 'newproject' });
    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should update integration status to apply-success', async () => {
    emailList = setMockedSendEmail();
    await integration.success();
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, { integration: integration.current });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(2);
    expect(emailList[0].to).toEqual([TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2]);
    expect(emailList[0].cc.length).toEqual(1);
    expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
  });
});

describe('Feature: Update Integration Approved w/ unapproved BCeID prod - User notification', () => {
  let emailList: any = [];

  const integration = new Integration();

  it('should create a DRAFT integration without a team', async () => {
    const res = await integration.create({ bceid: true, prod: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should update integration status to apply-success', async () => {
    await integration.success();
  });

  it('should update the integration', async () => {
    integration.set({ projectName: 'newproject' });
    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should update integration status to apply-success', async () => {
    emailList = setMockedSendEmail();
    await integration.success();
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.UPDATE_INTEGRATION_APPLIED, {
      integration: integration.current,
      waitingBceidProdApproval: true,
    });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(1);
    expect(emailList[0].to[0]).toEqual(TEST_IDIR_EMAIL);
    expect(emailList[0].cc.length).toEqual(1);
    expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
  });
});
