import { DataTypes, QueryTypes } from 'sequelize';

export const name = '2026.09.04T10.00.00.grants-and-ceilings-to-levels';

// Permission is expressed as one of a small ladder of nested levels rather than
// as individual resource/action pairs. Kept in step with api/src/constants.ts.
const LEVELS = ['none', 'viewer', 'role-manager', 'editor'];

const LEVEL_ADDS: Record<string, string[]> = {
  none: [],
  viewer: ['roles:read', 'user-role-mappings:read', 'integrations:read'],
  'role-manager': ['roles:write', 'user-role-mappings:write', 'idp-users:read'],
  editor: ['integrations:write'],
};

const LEVEL_PERMISSIONS: Record<string, string[]> = LEVELS.reduce((acc, level, index) => {
  acc[level] = LEVELS.slice(0, index + 1).flatMap((lower) => LEVEL_ADDS[lower]);
  return acc;
}, {} as Record<string, string[]>);

// The old model allowed arbitrary subsets, so a row set need not line up with a
// rung. Rounding up to the smallest rung that covers everything the row set
// held preserves the access that was actually in use; rounding down would
// silently revoke it. Only pre-release rows exist, so the difference is small.
const levelForPairs = (pairs: Set<string>) =>
  LEVELS.find((level) => Array.from(pairs).every((pair) => LEVEL_PERMISSIONS[level].includes(pair))) ?? 'editor';

const key = (parts: (number | string | null)[]) => parts.map((part) => (part === null ? '~' : part)).join('|');

export const up = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  for (const table of ['api_account_grants', 'organization_team_ceilings']) {
    await queryInterface.addColumn(table, 'level', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'none',
    });
  }

  const grants: {
    id: number;
    api_account_id: number;
    team_id: number | null;
    integration_id: number | null;
    environment: string | null;
    resource: string;
    action: string;
  }[] = await sequelize.query(
    `SELECT id, api_account_id, team_id, integration_id, environment, resource, action FROM api_account_grants`,
    { type: QueryTypes.SELECT },
  );

  const ceilings: {
    id: number;
    organization_team_id: number;
    integration_id: number | null;
    environment: string | null;
    resource: string;
    action: string;
  }[] = await sequelize.query(
    `SELECT id, organization_team_id, integration_id, environment, resource, action FROM organization_team_ceilings`,
    { type: QueryTypes.SELECT },
  );

  // Several pair rows collapse into a single level row, so the survivor of each
  // group keeps its id and the rest are deleted.
  const collapse = async (
    table: string,
    rows: { id: number; resource: string; action: string; [column: string]: any }[],
    keyColumns: string[],
  ) => {
    const groups = new Map<string, { keep: number; drop: number[]; pairs: Set<string> }>();

    for (const row of rows) {
      const groupKey = key(keyColumns.map((column) => row[column] ?? null));
      const group = groups.get(groupKey) ?? { keep: row.id, drop: [], pairs: new Set<string>() };
      if (row.id !== group.keep) group.drop.push(row.id);
      group.pairs.add(`${row.resource}:${row.action}`);
      groups.set(groupKey, group);
    }

    for (const group of Array.from(groups.values())) {
      await sequelize.query(`UPDATE ${table} SET level = :level WHERE id = :id`, {
        replacements: { level: levelForPairs(group.pairs), id: group.keep },
        type: QueryTypes.UPDATE,
      });
      if (group.drop.length > 0) {
        await sequelize.query(`DELETE FROM ${table} WHERE id IN (:ids)`, {
          replacements: { ids: group.drop },
          type: QueryTypes.DELETE,
        });
      }
    }
  };

  await collapse('api_account_grants', grants, ['api_account_id', 'team_id', 'integration_id', 'environment']);
  await collapse('organization_team_ceilings', ceilings, ['organization_team_id', 'integration_id', 'environment']);

  for (const table of ['api_account_grants', 'organization_team_ceilings']) {
    await queryInterface.removeColumn(table, 'resource');
    await queryInterface.removeColumn(table, 'action');
  }
};

export const down = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  for (const table of ['api_account_grants', 'organization_team_ceilings']) {
    await queryInterface.addColumn(table, 'resource', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'roles',
    });
    await queryInterface.addColumn(table, 'action', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'read',
    });
    await queryInterface.removeColumn(table, 'level');
  }
};
