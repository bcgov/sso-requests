import * as fs from 'fs';
import Handlebars = require('handlebars');

const SUBJECT_TEMPLATE = `Invitation for pathfinder SSO team #{{teamId}}`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

export const render = (originalData) => {
  const { teamId, invitationLink, apiUrl } = originalData;
  const data = { teamId, invitationLink, apiUrl };
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export default { render };
