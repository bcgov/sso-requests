import { models, sequelize } from '@app/shared/sequelize/models/models';
import { Transaction } from 'sequelize';
import { createAuditWriter } from '@sso/audit/server';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'queries/event' });

// The app's audit writer: @sso/audit over the app's `event` model. Every new
// event goes through this; see packages/audit for what each function promises.
export const audit = createAuditWriter<Transaction>({
  model: models.event,
  transaction: (fn) => sequelize.transaction(fn),
  logger: log,
});
