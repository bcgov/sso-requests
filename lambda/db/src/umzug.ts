import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '@lambda-shared/sequelize/models/models';

export const createMigrator = async (logger?: any) => {
  return new Umzug({
    migrations: [
      await import('./migrations/2021.07.01T15.57.60.create-requests-table'),
      await import('./migrations/2021.07.02T15.57.60.create-events-table'),
      await import('./migrations/2021.08.20T15.57.60.update-requests-table'),
      await import('./migrations/2021.08.31T15.57.70.add-requester-names'),
      await import('./migrations/2021.09.14T15.57.70.add-additional-emails'),
      await import('./migrations/2021.09.21T15.57.71.add-requester-notifications'),
      await import('./migrations/2021.11.26T15.57.71.add-browser-flow-override'),
      await import('./migrations/2021.11.26T15.57.72.update-browser-flow-override'),
      await import('./migrations/2021.12.08T12.00.00.create-users-table'),
      await import('./migrations/2021.12.08T12.00.01.create-teams-table'),
      await import('./migrations/2021.12.08T12.00.02.create-users-teams-table'),
      await import('./migrations/2021.12.08T12.00.03.create-users-teams-constraint'),
      await import('./migrations/2021.12.18T15.57.20.update-users-table'),
      await import('./migrations/2021.12.18T15.57.90.update-requests-table'),
      await import('./migrations/2021.12.18T15.57.91.add-users-teams-pending'),
      await import('./migrations/2021.12.18T15.57.91.update-requests-table'),
      await import('./migrations/2022.02.03T19.55.22.add-requester-in-request-table'),
      await import('./migrations/2022.02.10T09.52.22.convert-user-to-member'),
      await import('./migrations/2022.02.24T01.00.00.add-missing-composite-pkey'),
      await import('./migrations/2022.02.24T11.35.00.add-additional-email-in-user-table'),
      await import('./migrations/2022.03.02T00.00.00.add-user-id-field-in-requests-table'),
      await import('./migrations/2022.03.02T10.00.00.allow-idir-userid-null-in-requests-table'),
      await import('./migrations/2022.03.03T00.00.00.add-displayname-field-in-user-table'),
      await import('./migrations/2022.03.18T10.23.00.add-gold-fields-in-request-table'),
      await import('./migrations/2022.03.21T10.06.00.add-has_read_gold_notification-in-user-table'),
      await import('./migrations/2022.04.06T16.00.00.add-roles-fields-in-request-table'),
      await import('./migrations/2022.04.08T09.15.00.add-token-fields-in-request-table'),
      await import('./migrations/2022.04.11T11.36.00.update-action-number-field-type'),
      await import('./migrations/2022.04.25T09.00.00.add-columns-in-request-table'),
      await import('./migrations/2022.05.17T10.30.00.migrate-clientname-to-clientid'),
      await import('./migrations/2022.05.30T11.59.00.add-sa-columns-in-request-table'),
      await import('./migrations/2022.07.05T15.30.09.populate-user-id-in-requests-table'),
      await import('./migrations/2022.07.06T17.00.00.add-auth-type-in-request-table'),
    ],
    context: sequelize,
    storage: new SequelizeStorage({
      sequelize,
    }),
    logger: logger || console,
  });
};
