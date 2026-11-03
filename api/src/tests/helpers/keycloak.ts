import { KeycloakService, KeycloakServiceFactory } from '@/services/keycloak-service';
import {
  SEARCH_USER_EMAIL,
  SEARCH_USER_FIRST_NAME,
  SEARCH_USER_GUID,
  SEARCH_USER_LAST_NAME,
} from '@/tests/helpers/fixtures';

/**
 * Shape of a user as returned by the Keycloak admin API. Only the fields the API
 * reads are required; the rest mirror real responses so tests can assert they are stripped.
 */
export interface KeycloakUserRepresentation {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled?: boolean;
  createdTimestamp?: number;
  attributes?: Record<string, string[]>;
  [key: string]: unknown;
}

export const buildKeycloakUser = (overrides: Partial<KeycloakUserRepresentation> = {}): KeycloakUserRepresentation => ({
  id: 'f1b2b019-b657-4854-961b-739469d16c88',
  createdTimestamp: 1661664154156,
  username: `${SEARCH_USER_GUID}@idir`,
  enabled: true,
  emailVerified: false,
  firstName: SEARCH_USER_FIRST_NAME,
  lastName: SEARCH_USER_LAST_NAME,
  email: SEARCH_USER_EMAIL,
  attributes: {
    idir_userid: [SEARCH_USER_GUID.toUpperCase()],
    displayName: [`${SEARCH_USER_LAST_NAME}, ${SEARCH_USER_FIRST_NAME}`],
  },
  ...overrides,
});

/** Prevents any real Keycloak client from being configured (no credentials or network needed). */
export const mockKeycloakSetEnvironment = () =>
  jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => undefined);

/** Spies on the factory without changing behaviour, to assert which environment was selected. */
export const spyOnKeycloakServiceFactory = () => jest.spyOn(KeycloakServiceFactory.prototype, 'getKeycloakService');

export const mockKeycloakGetUsers = (users: KeycloakUserRepresentation[] = []) =>
  jest.spyOn(KeycloakService.prototype, 'getUsers').mockResolvedValue(users);

export const mockKeycloakGetUsersError = (error: unknown) =>
  jest.spyOn(KeycloakService.prototype, 'getUsers').mockRejectedValue(error);

/**
 * Mocks realm roles per username. Users missing from the map resolve to no roles.
 */
export const mockKeycloakGetUserRealmRoles = (rolesByUsername: Record<string, { name: string }[]> = {}) =>
  jest
    .spyOn(KeycloakService.prototype, 'getUserRealmRoles')
    .mockImplementation((username: string) => Promise.resolve(rolesByUsername[username] ?? []));
