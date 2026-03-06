import { getKeycloak } from '@app/utils/keycloak';
import { handleAxiosError, instance } from './axios';

export const getAuthHeader = async (): Promise<string> => {
  const keycloak = await getKeycloak();
  await keycloak.updateToken().catch(() => {
    keycloak.logout();
  });
  return `Bearer ${keycloak.token}`;
};

export async function wakeItUp() {
  try {
    return instance.get('heartbeat', { headers: { skipAuth: true } }).then((res) => res.data);
  } catch (err: any) {
    return handleAxiosError(err);
  }
}
