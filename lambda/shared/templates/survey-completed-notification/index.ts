import * as fs from 'fs';
import Handlebars = require('handlebars');
import { sendEmail } from '@lambda-shared/utils/ches';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';
import { User, UserSurveyInformation } from '@lambda-shared/interfaces';
import { processUser } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Survey Completed`;
const template = fs.readFileSync(__dirname + '/survey-completed-notification.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE);
const bodyHandler = Handlebars.compile(template);

interface DataProps {
  user: User;
  public: boolean;
  message: string;
  rating: number;
  triggerEvent: keyof UserSurveyInformation;
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
    to: [data.public ? data.user.idirEmail : SSO_EMAIL_ADDRESS],
    cc: [],
    ...rendered,
  });
};

export default { render, send };
