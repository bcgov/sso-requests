jest.mock('@app/shared/sequelize/models/models', () => ({
  models: { event: { create: jest.fn(), update: jest.fn() } },
}));

import { models } from '@app/shared/sequelize/models/models';
import { createEvent, runAuditedOperation } from '@app/queries/event';

describe('audit event persistence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('normalizes legacy IDIR actors while preserving createEvent best-effort behavior', async () => {
    (models.event.create as jest.Mock).mockRejectedValueOnce(new Error('database unavailable'));

    await expect(createEvent({ eventCode: 'test', idirUserid: 'idir-1' })).resolves.toBeUndefined();
    expect(models.event.create).toHaveBeenCalledWith(expect.objectContaining({ actorType: 'user', actorId: 'idir-1' }));
  });

  it('uses the supplied transaction and propagates audit write failures so the transaction can roll back', async () => {
    const transaction = { id: 'transaction' } as any;
    const failure = new Error('database unavailable');
    (models.event.create as jest.Mock).mockRejectedValueOnce(failure);

    await expect(createEvent({ eventCode: 'test' }, transaction)).rejects.toBe(failure);
    expect(models.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventCode: 'test', actorType: 'system' }),
      { transaction },
    );
  });

  it('updates one requested event to the successful outcome', async () => {
    (models.event.create as jest.Mock).mockResolvedValueOnce({ id: 12 });
    const result = await runAuditedOperation(
      { eventCode: 'role-create-requested', requestId: 8, details: { roleName: 'admin' } },
      'role-create-success',
      'role-create-failure',
      async () => 'created',
    );

    expect(result).toBe('created');
    expect(models.event.update).toHaveBeenCalledWith(
      { eventCode: 'role-create-success', details: { roleName: 'admin' } },
      { where: { id: 12 } },
    );
  });

  it('records a failed outcome and preserves the external operation error', async () => {
    (models.event.create as jest.Mock).mockResolvedValueOnce({ id: 13 });
    const failure = new Error('external call failed');

    await expect(
      runAuditedOperation(
        { eventCode: 'role-create-requested', requestId: 8, details: { roleName: 'admin' } },
        'role-create-success',
        'role-create-failure',
        async () => {
          throw failure;
        },
      ),
    ).rejects.toBe(failure);

    expect(models.event.update).toHaveBeenCalledWith(
      { eventCode: 'role-create-failure', details: { roleName: 'admin' } },
      { where: { id: 13 } },
    );
  });

  it('continues the operation when the requested event cannot be written', async () => {
    (models.event.create as jest.Mock).mockRejectedValueOnce(new Error('database unavailable'));
    const operation = jest.fn().mockResolvedValue('completed');

    await expect(
      runAuditedOperation({ eventCode: 'requested', details: {} }, 'success', 'failure', operation),
    ).resolves.toBe('completed');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(models.event.update).not.toHaveBeenCalled();
  });
});
