import { Session } from '@app/shared/interfaces';
import { searchUsers } from '../keycloak/users';
import { getAdminClient } from '@app/keycloak/adminClient';
import { Environment } from '@app/interfaces/types';
import { defaultStandardRealmSettings, environments } from '@app/utils/constants';
import { convertSeconds } from '@app/utils/helpers';
import { assertAuthorizedIntegration } from '@app/queries/integrationAccess';
import { API_ACTIONS, API_RESOURCES } from '@app/shared/enums';
import { appPermissions, hasAppPermission } from '@app/utils/authorize';
import { getIntegrationById } from '@app/queries/request';

export const searchKeycloakUsers = async (session: Session, data: any) => {
  const integration = hasAppPermission(session.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_ROLES_USERS)
    ? await getIntegrationById(data.integrationId)
    : await assertAuthorizedIntegration(session.user!.id, data.integrationId, {
        resource: API_RESOURCES.IDP_USERS,
        action: API_ACTIONS.READ,
        environment: data.environment,
      });

  data.clientId = integration.clientId;

  return searchUsers(data);
};

export const getKeycloakClientsByEnv = async (environment: string) => {
  const clientList = [];
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const max = 100;
  let first = 0;

  while (true) {
    const result = await kcAdminClient.clients.find({ realm: 'standard', max, first });
    if (result.length === 0) {
      break;
    }
    clientList.push(...result);
    first = first + max;
  }
  return clientList;
};

interface StandardRealmSettings {
  accessTokenLifespan: string;
  ssoSessionIdleTimeout: string;
  ssoSessionMaxLifespan: string;
  offlineSessionIdleTimeout: string;
  offlineSessionMaxLifespan: string;
}

type SessionSettings =
  | 'accessTokenLifespan'
  | 'ssoSessionIdleTimeout'
  | 'ssoSessionMaxLifespan'
  | 'offlineSessionIdleTimeout'
  | 'offlineSessionMaxLifespan';

export const getDefaultStandardRealmSessionSettings = async () => {
  let settings: Record<Environment, StandardRealmSettings> = {
    dev: { ...defaultStandardRealmSettings },
    test: { ...defaultStandardRealmSettings },
    prod: { ...defaultStandardRealmSettings },
  };

  await Promise.all(
    environments.map(async (environment) => {
      try {
        const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
        const realmSettings = await kcAdminClient.realms.findOne({ realm: 'standard' });
        if (!realmSettings) return;
        for (const key of Object.keys(defaultStandardRealmSettings) as SessionSettings[]) {
          if (realmSettings[key] !== undefined) {
            settings[environment][key] = convertSeconds(realmSettings[key]);
          }
        }
      } catch (err) {
        console.error(`Error fetching standard realm settings: ${err}`);
      }
    }),
  );
  return settings;
};
