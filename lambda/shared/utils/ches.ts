import axios from 'axios';
import url from 'url';
import compact from 'lodash.compact';
import uniq from 'lodash.uniq';
import { EmailOptions } from '../interfaces';

const compactUniq = (v) => uniq(compact(v));

const fetchChesToken = async (username, password) => {
  const tokenEndpoint = process.env.CHES_TOKEN_ENDPOINT;
  const params = new url.URLSearchParams({ grant_type: 'client_credentials' });
  try {
    const payload = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'application/json',
      },
      auth: {
        username,
        password,
      },
    });

    console.log(payload);
    const { access_token: accessToken } = payload.data;
    return [accessToken, null];
  } catch (err) {
    console.log(err);
    return [null, err];
  }
};

export const sendEmail = async ({ code, from = 'bcgov.sso@gov.bc.ca', to, cc, body, ...rest }: EmailOptions) => {
  const { CHES_USERNAME: username, CHES_PASSWORD: password, CHES_API_ENDPOINT: chesAPIEndpoint } = process.env;
  const [accessToken, error] = await fetchChesToken(username, password);
  if (error) throw Error(error);

  const reqPayload = {
    // see https://ches.nrs.gov.bc.ca/api/v1/docs#operation/postEmail for options
    bodyType: 'html',
    body,
    encoding: 'utf-8',
    from,
    priority: 'normal',
    subject: 'CHES Email Message',
    to: compactUniq(to),
    cc: compactUniq(cc),
    ...rest,
  };

  const reqOptions = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };

  console.log('DEBUG: ', chesAPIEndpoint, reqPayload, reqOptions);

  // see https://github.com/axios/axios/issues/1650#issuecomment-410403394
  // see https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  return axios.post(chesAPIEndpoint, reqPayload, reqOptions);
};
