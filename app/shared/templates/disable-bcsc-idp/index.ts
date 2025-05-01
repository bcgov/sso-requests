import Handlebars from 'handlebars';
import { processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { IDIM_EMAIL_ADDRESS, SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { disableBcscIdp } from './disable-bcsc-idp';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_env } = publicRuntimeConfig;

const SUBJECT_TEMPLATE = `BC Services Card integration disabled for Client ({{integration.projectName}})`;

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(disableBcscIdp, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { integration } = originalData;
  const data = { ...originalData, integration: await processRequest(integration) };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { integration } = data;
  const emails = [SSO_EMAIL_ADDRESS];
  const cc = [];
  if (app_env === 'production' && integration?.environments?.includes('prod')) {
    cc.push(IDIM_EMAIL_ADDRESS);
  }

  return sendEmail({
    code: EMAILS.DISABLE_BCSC_IDP,
    to: emails,
    cc,
    ...rendered,
  });
};

export default { render, send };
