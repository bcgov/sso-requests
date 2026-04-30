import soapRequest from 'easy-soap-request';
import { parseString } from 'xml2js';
import { get, map } from 'lodash';
import util from 'node:util';
import { Session } from '@app/shared/interfaces';
import { createIdirUser } from '@app/keycloak/users';

export const parseStringSync = util.promisify(parseString);

export const defaultHeaders = {
  'Content-Type': 'text/xml;charset=UTF-8',
  authorization: `Basic ${process.env.BCEID_SERVICE_BASIC_AUTH}`,
};

export type SearchCriteria = 'userId' | 'firstName' | 'lastName' | 'email';

export const generateXML = (
  criteria: SearchCriteria,
  key: string,
  idirUserGuid: string,
  limit?: number,
  page?: number,
) => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:V10="http://www.bceid.ca/webservices/Client/V10/">
    <soapenv:Header />
    <soapenv:Body>
        <V10:searchInternalAccount>
            <V10:internalAccountSearchRequest>
                <V10:onlineServiceId>${process.env.BCEID_SERVICE_ID}</V10:onlineServiceId>
                <V10:requesterAccountTypeCode>Internal</V10:requesterAccountTypeCode>
                <V10:requesterUserGuid>${idirUserGuid}</V10:requesterUserGuid>
                <V10:pagination>
                    <V10:pageSizeMaximum>${String(limit || 100)}</V10:pageSizeMaximum>
                    <V10:pageIndex>${String(page || 1)}</V10:pageIndex>
                </V10:pagination>
                <V10:sort>
                    <V10:direction>Ascending</V10:direction>
                    <V10:onProperty>UserId</V10:onProperty>
                </V10:sort>
                <V10:accountMatch>
                    <V10:${criteria}>
                       <V10:value>${key}</V10:value>
                       <V10:matchPropertyUsing>StartsWith</V10:matchPropertyUsing>
                    </V10:${criteria}>
                 </V10:accountMatch>
            </V10:internalAccountSearchRequest>
        </V10:searchInternalAccount>
    </soapenv:Body>
</soapenv:Envelope>`;

export function parseAccount(data: any) {
  const baseIndividualIdentity = get(data, 'individualIdentity.0');
  const baseName = get(baseIndividualIdentity, 'name.0');
  const baseContact = get(data, 'contact.0');
  const guid = get(data, 'guid.0.value.0');
  const userId = get(data, 'userId.0.value.0');
  const displayName = get(data, 'displayName.0.value.0');
  const firstName = get(baseName, 'firstname.0.value.0');
  const lastName = get(baseName, 'surname.0.value.0');
  const email = get(baseContact, 'email.0.value.0');

  return {
    guid,
    userId,
    displayName,
    firstName,
    lastName,
    email,
  };
}

export const makeSoapRequest = async (xmlPayload: string) => {
  return await soapRequest({
    url: process.env.BCEID_WEB_SERVICE_URL ?? '',
    headers: defaultHeaders,
    xml: xmlPayload,
    timeout: 10000,
  });
};

export const getBceidAccounts = async (samlResponse: any) => {
  const { body } = samlResponse;
  const result = await parseStringSync(body);
  const data = get(
    result,
    'soap:Envelope.soap:Body.0.searchInternalAccountResponse.0.searchInternalAccountResult.0',
  ) as any;
  if (!data) throw new Error('no data');

  const status = get(data, 'code.0');
  if (status === 'Failed') {
    const failureCode = get(data, 'failureCode.0');
    const message = get(data, 'message.0');
    throw new Error(`${failureCode}: ${message}`);
  }

  return map(get(data, 'accountList.0.BCeIDAccount'), parseAccount);
};

export const searchIdirUsers = async (userSession: Session, { field, search }: { field: string; search: string }) => {
  try {
    const xml = generateXML(field as SearchCriteria, search, userSession.idir_userid);
    const { response }: any = await makeSoapRequest(xml);
    return await getBceidAccounts(response);
  } catch (err) {
    console.error(err);
    return false;
  }
};

/** Import a user into the keycloak instances for all envs. */
export const importIdirUser = async (data: any) => {
  const { guid, firstName, lastName, email, idirUsername, displayName } = data;

  await Promise.all(
    ['dev', 'test', 'prod'].map((env) =>
      createIdirUser({
        environment: env,
        guid,
        userId: idirUsername,
        email,
        firstName,
        lastName,
        displayName,
      }).catch(() => null),
    ),
  );
  return true;
};
