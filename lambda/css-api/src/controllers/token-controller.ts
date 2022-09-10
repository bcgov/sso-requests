import { injectable } from 'tsyringe';
import axios from 'axios';
import url from 'url';

@injectable()
export class TokenController {
  public async getToken(reqHeaders: any, reqPayload: any) {
    const headers = {
      authorization: reqHeaders.authorization,
    };
    const params = new url.URLSearchParams(reqPayload);

    const { data } = await axios.post(
      `${process.env.KEYCLOAK_V2_PROD_URL}/auth/realms/standard/protocol/openid-connect/token`,
      params,
      {
        headers,
      },
    );
    return data;
  }
}
