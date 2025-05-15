import * as fs from 'fs';
import Handlebars from 'handlebars';
import { sendEmail } from '@app/utils/ches';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { User, UserSurveyInformation } from '@app/shared/interfaces';
import { getEmailTemplate, processUser } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Survey for {{triggerEvent}} submitted.`;
const template = getEmailTemplate('survey-completed-notification/survey-completed-notification.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE);
const bodyHandler = Handlebars.compile(template);

const triggerEventDisplayMap = {
  addUserToRole: 'role mappings',
  createRole: 'role creation',
  cssApiRequest: 'css api requests',
  createIntegration: 'integration creations and updates',
  downloadLogs: 'log downloads',
  viewMetrics: 'integration metrics',
};

interface DataProps {
  user: User;
  public: boolean;
  message: string;
  rating: number;
  triggerEvent: keyof UserSurveyInformation;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { user } = originalData;
  const triggerEventDisplay = triggerEventDisplayMap[originalData.triggerEvent];
  const data = { ...originalData, user: await processUser(user), triggerEventDisplay };
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  return sendEmail({
    code: EMAILS.REQUEST_LIMIT_EXCEEDED,
    to: [data.user.idirEmail],
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
