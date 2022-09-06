import axios from 'axios';
import { promisify } from 'util';
import { parseString } from 'xml2js';
import get from 'lodash.get';
import RealmRepresentation from 'keycloak-admin/lib/defs/realmRepresentation';
import ClientRepresentation from 'keycloak-admin/lib/defs/clientRepresentation';
import KeycloakAdminClient from 'keycloak-admin/lib/client';

const parseStringSync = promisify(parseString);

export const generateInstallation = async (data: {
  kcAdminClient: KeycloakAdminClient.KeycloakAdminClient;
  realm: RealmRepresentation;
  client: ClientRepresentation;
  authServerUrl: string;
}) => {
  const { kcAdminClient, realm, client, authServerUrl } = data;
  const samlMetadataUrl = `${authServerUrl}/realms/${realm.realm}/protocol/saml/descriptor`;
  const samlMetaXML = await axios.get(samlMetadataUrl).then((res) => res.data);
  const samlMeta = await parseStringSync(samlMetaXML);

  const idpInfo = get(samlMeta, 'md:EntityDescriptor.md:IDPSSODescriptor.0');
  const postBindingAttr = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST';
  const signOnUrls = get(idpInfo, 'md:SingleSignOnService');
  const signOnUrl = signOnUrls.find((v) => v.$.Binding === postBindingAttr).$.Location;

  const logoutUrls = get(idpInfo, 'md:SingleLogoutService');
  const logoutUrl = logoutUrls.find((v) => v.$.Binding === postBindingAttr).$.Location;

  const x509Certificate = get(idpInfo, 'md:KeyDescriptor.0.ds:KeyInfo.0.ds:X509Data.0.ds:X509Certificate.0');

  return {
    'Single Sign-On Service URL': signOnUrl,
    'Single Logout Service URL': logoutUrl,
    'Service Provider Entity ID': client.clientId,
    'X.509 Certificate': x509Certificate,
  };
};
