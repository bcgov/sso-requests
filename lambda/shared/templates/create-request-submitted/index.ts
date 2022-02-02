import fs from 'fs';
import Handlebars from 'handlebars';
import { processRequest } from '../helpers';

const SUBJECT_TEMPLATE = `Pathfinder SSO request submitted`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

export const render = (originalData) => {
  const { request } = originalData;
  const data = { request: processRequest(request) };
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export default { render };
