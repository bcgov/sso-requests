import { getEmailBody } from '../shared/utils/templates';
import { formDataDev, formDataProd } from './fixtures';

describe('Email snapshots', () => {
  it('Should return the expeted email for created requests', () => {
    expect(getEmailBody('create-request-submitted', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for approved', () => {
    expect(getEmailBody('create-request-approved', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for updated submissions', () => {
    expect(getEmailBody('uri-change-request-submitted', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for updated approvals', () => {
    expect(getEmailBody('uri-change-request-approved', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for deletions', () => {
    expect(getEmailBody('request-deleted', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for deletions to admins', () => {
    expect(getEmailBody('request-deleted-notification-to-admin', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for exceeding the limit', () => {
    expect(getEmailBody('request-limit-exceeded', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for Dev IDIM submissions', () => {
    expect(getEmailBody('bceid-idim-dev-submitted', formDataDev)).toMatchSnapshot();
  });
  it('Should return the expeted email for Prod IDIM submissions', () => {
    expect(getEmailBody('bceid-idim-prod-submitted', formDataProd)).toMatchSnapshot();
  });
  it('Should return the expeted email for IDIM deletions', () => {
    expect(getEmailBody('bceid-idim-deleted', formDataProd)).toMatchSnapshot();
  });
  it('Should return the expeted email for bceid approvals', () => {
    expect(getEmailBody('bceid-request-approved', formDataDev)).toMatchSnapshot();
  });
});
