import * as fs from 'fs';
import Handlebars from 'handlebars';
import { getEmailTemplate, processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { getReadableIntegrationDiff, sendEmail } from '@app/utils/ches';
import {
  SSO_EMAIL_ADDRESS,
  DIT_EMAIL_ADDRESS,
  IDIM_EMAIL_ADDRESS,
  DIT_ADDITIONAL_EMAIL_ADDRESS,
  SOCIAL_APPROVAL_EMAIL_ADDRESS,
} from '@app/shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import {
  usesBcServicesCardProd,
  usesBceidProd,
  usesDigitalCredential,
  usesDigitalCredentialProd,
  usesSocial,
} from '@app/helpers/integration';

const SUBJECT_TEMPLATE = `Pathfinder SSO change request approved and can be downloaded (email 2 of 2)`;
const template = getEmailTemplate('update-integration-applied/update-integration-applied.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  waitingBceidProdApproval?: boolean;
  hadBceid?: boolean;
  waitingGithubProdApproval?: boolean;
  waitingBcServicesCardProdApproval?: boolean;
  addingProd: boolean;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { integration } = originalData;
  const readableDiff = getReadableIntegrationDiff(integration?.lastChanges!);
  const data = { ...originalData, integration: await processRequest(integration), changes: readableDiff };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { integration, addingProd } = data;
  const emails = await getIntegrationEmails(integration);
  const cc = [SSO_EMAIL_ADDRESS];
  const resettingBceidApproval = data.integration.lastChanges?.some(
    (change) => change.path[0] === 'bceidApproved' && change.lhs === true && change.rhs === false,
  );

  if (usesBceidProd(integration) || usesBcServicesCardProd(integration) || resettingBceidApproval)
    cc.push(IDIM_EMAIL_ADDRESS);
  if (usesDigitalCredential(integration) && addingProd) cc.push(DIT_EMAIL_ADDRESS);
  if (usesDigitalCredentialProd(integration)) cc.push(DIT_ADDITIONAL_EMAIL_ADDRESS);
  if (usesSocial(integration)) cc.push(SOCIAL_APPROVAL_EMAIL_ADDRESS);

  return sendEmail({
    code: EMAILS.UPDATE_INTEGRATION_APPLIED,
    to: emails,
    cc,
    ...rendered,
  });
};

export default { render, send };
