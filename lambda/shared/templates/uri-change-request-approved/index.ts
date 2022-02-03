import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest } from '../helpers';

const SUBJECT_TEMPLATE = `Pathfinder SSO change request approved`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

export const render = (originalData) => {
  const { request, appUrl } = originalData;
  const data = { request: processRequest(request), appUrl };
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export default { render };
