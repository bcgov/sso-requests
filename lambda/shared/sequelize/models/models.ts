const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];

export const models: any = {};
export const modelNames: string[] = [];
export let sequelize;

if (config.databaseUrl) {
  sequelize = new Sequelize(config.databaseUrl, config);
} else if (config.use_env_variable && process.env[config.use_env_variable]) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs.readdirSync(__dirname)
  .filter((file) => file.indexOf('.') !== 0 && file !== basename && ['.js', '.ts'].includes(file.slice(-3)))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    models[model.name] = model;
    modelNames.push(model.name);
  });

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.usersTeam.hasMany(models.user, { foreignKey: 'id' });
models.usersTeam.hasMany(models.team, { foreignKey: 'id' });

export default { models, modelNames, sequelize };
