import Handlebars from 'handlebars';
import { sendEmail } from '@app/utils/ches';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { User } from '@app/shared/interfaces';
import { processUser } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { requestLimitExceeded } from './request-limit-exceeded';

const SUBJECT_TEMPLATE = `Pathfinder SSO request limit reached`;

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(requestLimitExceeded, { noEscape: true });

interface DataProps {
  user: User;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { user } = originalData;
  const data = { ...originalData, user: await processUser(user) };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  return sendEmail({
    code: EMAILS.REQUEST_LIMIT_EXCEEDED,
    to: [SSO_EMAIL_ADDRESS],
    cc: [],
    ...rendered,
  });
};

export default { render, send };
