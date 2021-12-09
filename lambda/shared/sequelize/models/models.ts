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
  // console.log('models[modelName].associate', modelName, Object.keys(models[modelName].options))
  if (models[modelName]?.options.associate) {
    models[modelName].options.associate(models);
  }
});

// models.user.hasMany(models.usersTeam, { foreignKey: 'userId', onDelete: 'cascade' });
// models.team.hasMany(models.usersTeam, { foreignKey: 'teamId', onDelete: 'cascade' });

export default { models, modelNames, sequelize };
