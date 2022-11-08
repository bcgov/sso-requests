import { wakeUpAll } from './controllers/heartbeat';
import { handlePRstage, getPlannedIds, updatePlannedItems } from './controllers/batch';
import { authenticate } from './authenticate';
import isString from 'lodash.isstring';

const tryJSON = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
};

const handleError = (res, err) => {
  let message = err.message || err;
  if (isString(message)) {
    message = tryJSON(message);
  }
  console.log({ success: false, message });
  res.status(422).json({ success: false, message });
};

export const setRoutes = (app: any) => {
  app.options(`/*`, async (req, res) => {
    res.status(200).json(null);
  });

  app.get(`/heartbeat`, async (req, res) => {
    try {
      const result = await wakeUpAll();
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.use(async (req, res, next) => {
    const valid = await authenticate(req.headers);
    if (!valid) {
      res.status(401).json({ success: false, message: 'not authorized' });
      return false;
    }

    if (next) next();
  });

  app.put(`/batch/pr`, async (req, res) => {
    try {
      const result = await handlePRstage(req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get(`/batch/items/:type`, async (req: any, res) => {
    try {
      const result = await getPlannedIds(req.params.type);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  app.put(`/batch/items`, async (req, res) => {
    try {
      const result = await updatePlannedItems(req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });
};
