import { DataTypes } from 'sequelize';

export const name = '2026.09.16T10.00.00.create-organizations';

// The permission vocabulary an organization link may carry, frozen at this
// migration. Kept deliberately literal rather than imported: a migration must
// keep meaning what it meant on the day it ran, even after the application's
// vocabulary moves on. The admin-scoped permissions (approve-*, write-lifespans
// and the rest) are absent on purpose — they resolve from an app role and no
// stored consent may confer one.
const CONSENTABLE_PERMISSIONS = [
  'integrations:read',
  'integrations:write',
  'integrations:delete',
  'integrations:reassign-team',
  'roles:read',
  'roles:write',
  'user-role-mappings:read',
  'user-role-mappings:write',
  'idp-users:read',
];

const permissionsSubsetOf = (table: string) => {
  const allowedPermissions = CONSENTABLE_PERMISSIONS.map((permission) => `'${permission}'`).join(',');
  return `ALTER TABLE ${table} ADD CONSTRAINT ${table}_permissions_valid
     CHECK (permissions <@ ARRAY[${allowedPermissions}]::text[])`;
};

const timestamps = {
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
};

export const up = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('organizations', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ...timestamps,
  });

  // Organization membership is independent of team membership: being an
  // organization admin says nothing about which teams you belong to, and vice
  // versa. The role governs the organization — its members, its teams, its API
  // accounts — and never the integrations it reaches; those are whatever the
  // teams consented to, the same for both roles. There is no pending state
  // here: the invitation that needs accepting is the team's, on
  // organization_teams below.
  await queryInterface.createTable('organization_members', {
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'organization_id',
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ...timestamps,
  });

  // A team's link to an organization, and the team-wide consent, in one row.
  // `permissions` is the expansion of whatever preset was chosen rather than
  // the preset's name, so editing a preset later changes nothing a team has
  // already agreed to. While `pending` the organization has proposed a set and
  // the team has not accepted it, and nothing is in force. Deleting the row is
  // how a team leaves, which is why the overrides below cascade from it.
  await queryInterface.createTable('organization_teams', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'organization_id',
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'team_id',
      references: { model: 'teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    pending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'invited_by',
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    ...timestamps,
  });

  await queryInterface.addConstraint('organization_teams', {
    fields: ['organization_id', 'team_id'],
    type: 'unique',
    name: 'organization_teams_organization_id_team_id_key',
  });

  // A team belongs to at most one organization, but may sit on several
  // outstanding invitations while it decides.
  await sequelize.query(
    `CREATE UNIQUE INDEX organization_teams_team_id_active_key ON organization_teams (team_id) WHERE pending = false`,
  );

  // A per-integration cap under one link. It only ever narrows: resolution
  // intersects it with the link, so a link narrowed afterwards still bounds it
  // and an empty array is a plain "no access to this one". It carries no
  // `pending` of its own — a restriction needs nobody's consent, and inherits
  // the link's.
  await queryInterface.createTable('organization_integration_overrides', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationTeamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'organization_team_id',
      references: { model: 'organization_teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    requestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'request_id',
      references: { model: 'requests', key: 'id' },
      onDelete: 'CASCADE',
    },
    permissions: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    ...timestamps,
  });

  await queryInterface.addConstraint('organization_integration_overrides', {
    fields: ['organization_team_id', 'request_id'],
    type: 'unique',
    name: 'organization_integration_overrides_link_request_key',
  });

  await queryInterface.addIndex('organization_teams', ['organization_id']);
  await queryInterface.addIndex('organization_teams', ['team_id']);
  await queryInterface.addIndex('organization_integration_overrides', ['organization_team_id']);

  await sequelize.query(permissionsSubsetOf('organization_teams'));
  await sequelize.query(permissionsSubsetOf('organization_integration_overrides'));

  // An organization's API account is a request row owned by the organization
  // rather than by a team, and resolves to the organization's links the way a
  // team account resolves to its team.
  await queryInterface.addColumn('requests', 'organization_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organizations', key: 'id' },
    // Requests are retained for audit after their owning organization is deleted.
    onDelete: 'SET NULL',
  });

  // A service account is owned by exactly one of a team or an organization.
  // Archived accounts are exempt: deleting an organization deliberately nulls
  // organization_id on them so the audit record outlives the organization,
  // which leaves both columns null.
  await sequelize.query(
    `ALTER TABLE requests ADD CONSTRAINT requests_service_account_owner
       CHECK (
         NOT api_service_account
         OR archived
         OR ((team_id IS NULL) <> (organization_id IS NULL))
       )`,
  );

  await queryInterface.addColumn('events', 'organization_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  // An organization account has no team, so usage is recorded against the
  // account's own client id and team_id stops being the only way in.
  await queryInterface.addColumn('api_usage_metrics', 'api_client_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.changeColumn('api_usage_metrics', 'team_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await queryInterface.addIndex('api_usage_metrics', ['api_client_id']);
};

export const down = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.removeIndex('api_usage_metrics', ['api_client_id']);
  await queryInterface.removeColumn('api_usage_metrics', 'api_client_id');
  await queryInterface.removeColumn('events', 'organization_id');
  await sequelize.query(`ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_service_account_owner`);
  await queryInterface.removeColumn('requests', 'organization_id');
  await queryInterface.dropTable('organization_integration_overrides');
  await queryInterface.dropTable('organization_teams');
  await queryInterface.dropTable('organization_members');
  await queryInterface.dropTable('organizations');
};

export default { name, up, down };
