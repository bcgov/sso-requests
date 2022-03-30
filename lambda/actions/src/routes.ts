import { wakeUpAll } from './controllers/heartbeat';
import { handlePRstage, getPlannedIds, updatePlannedItems } from './controllers/batch';

const responseHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Origin': 'https://bcgov.github.io',
  'Access-Control-Allow-Methods': 'OPTIONS,PUT,GET',
};

const BASE_PATH = '/actions';

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

  app.use((req, res, next) => {
    try {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.GH_SECRET) {
        res.status(401).json({ success: false, message: 'not authorized' });
        return false;
      }
    } catch (err) {
      handleError(res, err);
    }

    if (next) next();
  });

  app.put(`${BASE_PATH}/batch/pr`, async (req, res) => {
    try {
      const result = await handlePRstage(req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`${BASE_PATH}/batch/items/:type`, async (req: any, res) => {
    try {
      const result = await getPlannedIds(req.params.type);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`${BASE_PATH}/batch/items`, async (req, res) => {
    try {
      const result = await updatePlannedItems(req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });
};
