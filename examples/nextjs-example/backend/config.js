require('dotenv').config({ path: __dirname + '/../.env.local' });
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const kcConfig = {
  clientId: process.env.CLIENT_ID,
  bearerOnly: true,
  serverUrl: process.env.SERVER_URL,
  realm: process.env.REALM,
};

const memoryStore = new session.MemoryStore();
let keycloak = new Keycloak({ store: memoryStore }, kcConfig);

module.exports = {
  HOSTNAME: process.env.HOST || '0.0.0.0',
  PORT: process.env.PORT || 3000,
  keycloak,
};
