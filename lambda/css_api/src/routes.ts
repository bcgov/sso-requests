import { Auth, authenticate } from './authenticate';
import { wakeUpAll } from './controllers/heartbeat';
import { fetchIntegrationsOfTeam } from './controllers/integrations';

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
};

const BASE_PATH = '/api';

const handleError = (res, err) => {
  console.error(err);
  res.status(422).json({ success: false, message: err.message || err });
};

export const setRoutes = (app: any) => {
  app.use((req, res, next) => {
    res.set(responseHeaders);
    if (next) next();
  });

  app.options('(.*)', async (req, res) => {
    res.status(200).json(null);
  });

  app.get(`${BASE_PATH}/heartbeat`, async (req, res) => {
    try {
      const result = await wakeUpAll();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.use(async (req, res, next) => {
    const auth: Auth = await authenticate(req.headers);
    if (!auth.success) {
      res.status(401).json(auth);
      return false;
    } else {
      req.teamId = auth.data.teamId;
    }
    if (next) next();
  });

  app.get(`${BASE_PATH}/verify-token`, async (req, res) => {
    try {
      res.status(200).json({ teamId: req.teamId });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/integrations`, async (req, res) => {
    try {
      const result = await fetchIntegrationsOfTeam(1);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });
};
