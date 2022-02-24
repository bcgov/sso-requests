// see https://sequelize.org/master/class/src/dialects/abstract/query-interface.js~QueryInterface.html#instance-method-addIndex
// see https://sequelize.org/master/class/src/dialects/abstract/query-interface.js~QueryInterface.html#instance-method-addConstraint
export const up = async ({ context: sequelize }) => {
  // add a constraint instead of index to make the fields as a composite key.
  // this composite primary key can be created through the table creation with `primaryKey` flags,
  // however, it won't be created with the separate column creations.
  //
  // example of creating an index
  // await sequelize.getQueryInterface().addIndex('users_teams', ['user_id', 'team_id'], {
  //   name: 'users_teams_pkey',
  //   unique: true,
  // });
  //
  // it creates an index `"users_teams_pkey" UNIQUE, btree (user_id, team_id)`,
  // but what we want here is an index `"users_teams_pkey" PRIMARY KEY, btree (user_id, team_id)`
  await sequelize.getQueryInterface().addConstraint('users_teams', {
    name: 'users_teams_pkey',
    type: 'PRIMARY KEY',
    fields: ['user_id', 'team_id'],
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeConstraint('users_teams', 'users_teams_pkey');
};
