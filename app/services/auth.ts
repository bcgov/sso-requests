import { handleAxiosError, instance } from './axios';
import keycloak from '@app/utils/keycloak';

export const getAuthHeader = async (): Promise<string> => {
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
