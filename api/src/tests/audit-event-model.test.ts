import { AUDIT_EVENT_COLUMNS } from '@sso/audit';
import models from '@/sequelize/models/models';

// @sso/audit writes every event row; the api's model must accept each column it writes, as it writes it.
describe('api event model', () => {
  const attributes = models.event.getAttributes();

  it.each(Object.entries(AUDIT_EVENT_COLUMNS))('matches the audit column %s', (attribute, column) => {
    const definition = attributes[attribute as keyof typeof attributes];
    expect(definition).toBeDefined();
    expect(definition.field).toBe(column.column);
    expect(definition.allowNull ?? true).toBe(column.allowNull);
    expect(definition.references).toBeUndefined();
  });
});
