import soapRequest from 'easy-soap-request';
import { parseString } from 'xml2js';
import { get } from 'lodash';
import util from 'node:util';
import { injectable } from 'tsyringe';
import logger from '@/logger';
import { getBceidCredentials } from '@/utils';

const parseStringSync = util.promisify(parseString);

/** IDPs handled by the BCeID SOAP web service, and the "account type" used to search for them. */
export const BCEID_SOAP_IDPS = ['idir', 'bceidbasic', 'bceidboth', 'bceidbusiness'] as const;
export type BceidSoapIdp = typeof BCEID_SOAP_IDPS[number];

/**
 * Maps an IDP alias to the "account type code(s)" used to look it up with the BCeID web service's
 * `getAccountDetail` operation. `idir` accounts are "Internal" accounts; the "External" BCeID
 * accounts are split into `Individual` (bceidbasic) and `Business` (bceidbusiness) account types.
 * `bceidboth` has no single account type upstream, so both are attempted.
 */
const getAccountTypeCodes = (idp: BceidSoapIdp): string[] => {
  switch (idp) {
    case 'idir':
      return ['Internal'];
    case 'bceidbasic':
      return ['Individual'];
    case 'bceidbusiness':
      return ['Business'];
    case 'bceidboth':
      return ['Individual', 'Business'];
  }
};

// `getAccountDetail` looks up a single account directly by GUID, avoiding the `searchInternalAccount`
// / `searchBCeIDAccount` list-search operations, which require additional `sort`/`accountMatch`
// query properties that aren't needed (or reliably accepted) for a simple exact-GUID lookup.
const generateAccountDetailXML = (
  guid: string,
  accountTypeCode: string,
  serviceId: string,
  requesterUserGuid: string,
) => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:V10="http://www.bceid.ca/webservices/Client/V10/">
    <soapenv:Header />
    <soapenv:Body>
        <V10:getAccountDetail>
            <V10:accountDetailRequest>
                <V10:onlineServiceId>${serviceId}</V10:onlineServiceId>
                <V10:requesterAccountTypeCode>Internal</V10:requesterAccountTypeCode>
                <V10:requesterUserGuid>${requesterUserGuid}</V10:requesterUserGuid>
                <V10:userGuid>${guid}</V10:userGuid>
                <V10:accountTypeCode>${accountTypeCode}</V10:accountTypeCode>
            </V10:accountDetailRequest>
        </V10:getAccountDetail>
    </soapenv:Body>
</soapenv:Envelope>`;

const makeSoapRequest = async (xmlPayload: string, url: string, basicAuth: string) => {
  return await soapRequest({
    url: url ?? '',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      authorization: `Basic ${basicAuth}`,
    },
    xml: xmlPayload,
    timeout: 10000,
  });
};

export interface BceidAccount {
  guid: string;
  userId?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

function parseAccount(data: any): BceidAccount {
  const guid = get(data, 'guid.0.value.0');
  const userId = get(data, 'userId.0.value.0');
  const displayName = get(data, 'displayName.0.value.0');
  const baseIndividualIdentity = get(data, 'individualIdentity.0');
  const baseName = get(baseIndividualIdentity, 'name.0');
  const baseContact = get(data, 'contact.0');
  const firstName = get(baseName, 'firstname.0.value.0');
  const lastName = get(baseName, 'surname.0.value.0');
  const email = get(baseContact, 'email.0.value.0');

  return { guid, userId, displayName, firstName, lastName, email };
}

async function extractAccount(body: string): Promise<BceidAccount | null> {
  const result = (await parseStringSync(body)) as any;
  const data = get(result, 'soap:Envelope.soap:Body.0.getAccountDetailResponse.0.getAccountDetailResult.0') as any;
  if (!data) return null;

  const status = get(data, 'code.0');
  if (status === 'Failed') {
    const failureCode = get(data, 'failureCode.0');
    const message = get(data, 'message.0');
    // No matching account is a "failure" per this webservice, not an exception-worthy state.
    logger.info(`BCeID webservice lookup returned no match: ${failureCode} ${message}`);
    return null;
  }

  const account = get(data, 'account.0');
  if (!account) return null;
  return parseAccount(account);
}

@injectable()
export class BceidWebserviceService {
  /**
   * Verifies that the given GUID resolves to a real, existing account for the given IDP with the
   * BCeID web service. Returns the matched account, or null if no account was found.
   */
  public async verifyAccountByGuid(idp: BceidSoapIdp, guid: string, environment: string): Promise<BceidAccount | null> {
    try {
      const { bceidServiceBasicAuth, bceidServiceId, bceidWebServiceUrl, bceidRequesterUserGuid } =
        getBceidCredentials(environment);
      const accountTypeCodes = getAccountTypeCodes(idp);
      for (const accountTypeCode of accountTypeCodes) {
        const xml = generateAccountDetailXML(guid, accountTypeCode, bceidServiceId, bceidRequesterUserGuid);
        const { response }: any = await makeSoapRequest(xml, bceidWebServiceUrl, bceidServiceBasicAuth);
        const account = await extractAccount(response.body);
        if (account && account.guid?.toLowerCase() === guid.toLowerCase()) return account;
      }
      return null;
    } catch (err) {
      logger.error('Failed to verify account with the BCeID webservice:', err);
      return null;
    }
  }
}
