import { IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import Handlebars from 'handlebars';
import { getIntegrationEmails, getEmailTemplate, processRequest } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import { IDIM_EMAIL_ADDRESS, OTP_EMAIL_ADDRESS_BCC, OTP_EMAIL_ADDRESS_CC, SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { usesBceid, usesBcServicesCardProd, usesOTPProd } from '@app/helpers/integration';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `{{type}} Request ID {{integration.id}} approved and being processed (email 1 of 2)`;
const template = getEmailTemplate('environment-approved/environment-approved.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  environment?: string;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { integration } = originalData;
  const data = {
    ...originalData,
    environment: originalData.environment ?? 'production',
    integration: await processRequest(integration),
  };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { integration } = data;
  const emails = await getIntegrationEmails(integration);
  let cc = [SSO_EMAIL_ADDRESS];
  let bcc: string[] = [];
  if (usesBceid(integration) || usesBcServicesCardProd(integration)) cc.push(IDIM_EMAIL_ADDRESS);
  if (usesOTPProd(integration)) {
    cc = cc.concat(OTP_EMAIL_ADDRESS_CC);
    bcc = bcc.concat(OTP_EMAIL_ADDRESS_BCC);
  }

  return sendEmail({
    code: EMAILS.PROD_APPROVED,
    to: emails,
    cc,
    bcc,
    ...rendered,
  });
};

export default { render, send };
