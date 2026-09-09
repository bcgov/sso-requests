import { API_ACTIONS, API_RESOURCES, Level, LEVEL_RANK } from '@app/shared/enums';

export interface LevelRow {
  integrationId?: number | null;
  environment?: string | null;
  level: Level;
}

// Mirrors the resolution in api/src/modules/authorization.ts. Most specific
// wins: an integration row overrides the team-wide row, and an environment
// specific row overrides the all-environment one. An absent row falls through
// to the next rung; an explicit `none` row does not, which is what makes a
// carve-out possible.
export const resolveLevel = (
  rows: LevelRow[],
  target: { integrationId?: number | null; environment?: string | null },
): Level => {
  const integrationId = target.integrationId ?? null;
  const environment = target.environment ?? null;

  const ladder: [number | null, string | null][] = [];
  if (integrationId !== null) {
    if (environment !== null) ladder.push([integrationId, environment]);
    ladder.push([integrationId, null]);
  }
  if (environment !== null) ladder.push([null, environment]);
  ladder.push([null, null]);

  for (const [candidateIntegration, candidateEnvironment] of ladder) {
    const row = rows.find(
      (item) =>
        (item.integrationId ?? null) === candidateIntegration && (item.environment ?? null) === candidateEnvironment,
    );
    if (row) return row.level;
  }

  return 'none';
};

export const atOrBelow = (proposed: Level, ceiling: Level) => LEVEL_RANK[proposed] <= LEVEL_RANK[ceiling];

export const lowerLevel = (first: Level, second: Level): Level =>
  LEVEL_RANK[first] <= LEVEL_RANK[second] ? first : second;

export const highestLevel = (levels: Level[]): Level =>
  levels.reduce<Level>((highest, level) => (LEVEL_RANK[level] > LEVEL_RANK[highest] ? level : highest), 'none');

export const requiredLevel = (
  resource: typeof API_RESOURCES[keyof typeof API_RESOURCES],
  action: typeof API_ACTIONS[keyof typeof API_ACTIONS],
): Level => {
  if (action === API_ACTIONS.READ) {
    return resource === API_RESOURCES.IDP_USERS ? 'role-manager' : 'viewer';
  }

  if (resource === API_RESOURCES.ROLES || resource === API_RESOURCES.USER_ROLE_MAPPINGS) {
    return 'role-manager';
  }

  return 'editor';
};

export const levelAllows = (
  level: Level,
  resource: typeof API_RESOURCES[keyof typeof API_RESOURCES],
  action: typeof API_ACTIONS[keyof typeof API_ACTIONS],
) => LEVEL_RANK[level] >= LEVEL_RANK[requiredLevel(resource, action)];
