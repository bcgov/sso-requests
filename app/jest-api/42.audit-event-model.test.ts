import { AUDIT_EVENT_COLUMNS } from '@sso/audit';
import { models } from '@app/shared/sequelize/models/models';

// @sso/audit writes every event row; the app's model must accept each column it writes, as it writes it.
describe('app event model', () => {
  const attributes = models.event.getAttributes();

  it.each(Object.entries(AUDIT_EVENT_COLUMNS))('matches the audit column %s', (attribute, column) => {
    expect(attributes[attribute]).toBeDefined();
    expect(attributes[attribute].field).toBe(column.column);
    expect(attributes[attribute].allowNull ?? true).toBe(column.allowNull);
    expect(attributes[attribute].references).toBeUndefined();
  });
});
