const axios = require('axios');
import { EmailOptions } from '../interfaces';
import { models } from '../../sequelize/models/models';
import { EVENTS } from '../enums';
const url = require('url');

const fetchChesToken = async (username, password) => {
  const tokenEndpoint = process.env.CHES_TOKEN_ENDPOINT;
  const params = new url.URLSearchParams({ grant_type: 'client_credentials' });
  try {
    const { data } = await axios.post(tokenEndpoint, params.toString(), {
      auth: {
        username,
        password,
      },
    });
    const { access_token: accessToken } = data;
    return [accessToken, null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};

export const sendEmail = async ({ from = 'bcgov.sso@gov.bc.ca', to, body, event, ...rest }: EmailOptions) => {
  try {
    const { CHES_USERNAME: username, CHES_PASSWORD: password, CHES_API_ENDPOINT: chesAPIEndpoint } = process.env;
    const [accessToken, error] = await fetchChesToken(username, password);
    if (error) throw Error(error);

    return axios.post(
      chesAPIEndpoint,
      {
        // see https://ches.nrs.gov.bc.ca/api/v1/docs#operation/postEmail for options
        bodyType: 'html',
        body,
        encoding: 'utf-8',
        from,
        priority: 'normal',
        subject: 'CHES Email Message',
        to: [to],
        ...rest,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  } catch (err) {
    console.error(err);
    models.event
      .create({
        eventCode: EVENTS.EMAIL_SUBMISSION_FAILURE,
        requestId: event.requestId,
        details: { emailCode: event.emailCode, error: err.message || err },
      })
      .catch(() => {});
  }
};
