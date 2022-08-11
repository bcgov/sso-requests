import { authenticate } from './authenticate';
import { wakeUpAll } from './controllers/heartbeat';

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
    const teamId = await authenticate(req.headers);
    if (!teamId) {
      res.status(401).json({ success: false, message: 'not authorized' });
      return false;
    } else req.teamId = teamId;
    if (next) next();
  });

  app.get(`${BASE_PATH}/verify-token`, async (req, res) => {
    try {
      if (!req.teamId) {
        res.status(401).json({ success: false, message: 'not authorized' });
      } else res.status(200).json({ success: true, teamId: req.teamId });
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/:environment/integrations`, async (req, res) => {
    try {
    } catch (err) {
      handleError(res, err);
    }
  });
};
