import { authenticate } from '@lambda-app/authenticate';
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

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;
const mockedSendEmail = sendEmail as jest.Mock<any>;

mockedAuthenticate.mockImplementation(() => {
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

describe('Feature: Submit New Integration - User notification for non-BCeID', () => {
  let emailList;

  const integration = new Integration();

  it('should create a DRAFT integration without a team', async () => {
    const res = await integration.create({});
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, { integration: integration.current });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(1);
    expect(emailList[0].to[0]).toEqual(TEST_IDIR_EMAIL);
    expect(emailList[0].cc.length).toEqual(1);
    expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
  });
});

describe('Feature: Submit New Integration - Team notification for non-BCeID', () => {
  let emailList;

  const integration = new Integration();

  it('should create a DRAFT integration with a team', async () => {
    const res = await integration.create({ usesTeam: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, { integration: integration.current });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(2);
    expect(emailList[0].to).toEqual([TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2]);
    expect(emailList[0].cc.length).toEqual(1);
    expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
  });
});

describe('Feature: Submit New Integration - User notification for BCeID in non-Prod', () => {
  let emailList;

  const integration = new Integration();

  it('should create a DRAFT integration', async () => {
    const res = await integration.create({ bceid: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const templates = await Promise.all([
      renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, { integration: integration.current }),
      renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM, { integration: integration.current }),
    ]);

    expect(emailList.length).toEqual(2);

    for (let x = 0; x < templates.length; x++) {
      const template = templates[x];
      const email = emailList.find((email) => email.subject === template.subject);
      expect(email).toBeTruthy();

      // CREATE_INTEGRATION_SUBMITTED
      if (x === 0) {
        expect(email.subject).toContain(template.subject);
        expect(email.body).toContain(template.body);
        expect(email.to.length).toEqual(1);
        expect(email.to).toEqual([TEST_IDIR_EMAIL]);
        expect(email.cc.length).toEqual(1);
        expect(email.cc[0]).toEqual(SSO_EMAIL_ADDRESS);
      }
      // CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM
      else {
        expect(email.subject).toContain(template.subject);
        expect(email.body).toContain(template.body);
        expect(email.to.length).toEqual(1);
        expect(email.to).toEqual([IDIM_EMAIL_ADDRESS]);
        expect(email.cc.length).toEqual(1);
        expect(email.cc[0]).toEqual(SSO_EMAIL_ADDRESS);
      }
    }
  });
});

describe('Feature: Submit New Integration - Team notification for BCeID in non-Prod', () => {
  let emailList;

  const integration = new Integration();

  it('should create a DRAFT integration with a team', async () => {
    const res = await integration.create({ bceid: true, usesTeam: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const templates = await Promise.all([
      renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED, { integration: integration.current }),
      renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM, { integration: integration.current }),
    ]);

    expect(emailList.length).toEqual(2);

    for (let x = 0; x < templates.length; x++) {
      const template = templates[x];
      const email = emailList.find((email) => email.subject === template.subject);
      expect(email).toBeTruthy();

      // CREATE_INTEGRATION_SUBMITTED
      if (x === 0) {
        expect(email.subject).toContain(template.subject);
        expect(email.body).toContain(template.body);
        expect(email.to.length).toEqual(2);
        expect(email.to).toEqual([TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2]);
        expect(email.cc.length).toEqual(1);
        expect(email.cc[0]).toEqual(SSO_EMAIL_ADDRESS);
      }
      // CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM
      else {
        expect(email.subject).toContain(template.subject);
        expect(email.body).toContain(template.body);
        expect(email.to.length).toEqual(1);
        expect(email.to).toEqual([IDIM_EMAIL_ADDRESS]);
        expect(email.cc.length).toEqual(1);
        expect(email.cc[0]).toEqual(SSO_EMAIL_ADDRESS);
      }
    }
  });
});

describe('Feature: Submit New Integration - User notification for BCeID in Prod', () => {
  let emailList;

  const integration = new Integration();

  it('should create a DRAFT integration', async () => {
    const res = await integration.create({ bceid: true, prod: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_PROD, {
      integration: integration.current,
    });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(1);
    expect(emailList[0].to[0]).toEqual(TEST_IDIR_EMAIL);
    expect(emailList[0].cc.length).toEqual(2);
    expect(emailList[0].cc.sort()).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS].sort());
  });
});

describe('Feature: Submit New Integration - Team notification for non-BCeID', () => {
  let emailList;

  const integration = new Integration();

  it('should create a DRAFT integration with a team', async () => {
    const res = await integration.create({ bceid: true, prod: true, usesTeam: true });
    expect(res.statusCode).toEqual(200);
  });

  it('should submit the integration request', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.submit();
    expect(res.statusCode).toEqual(200);
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_PROD, {
      integration: integration.current,
    });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(2);
    expect(emailList[0].to).toEqual([TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2]);
    expect(emailList[0].cc.length).toEqual(2);
    expect(emailList[0].cc).toEqual([SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS]);
  });
});
