jest.mock('@app/shared/sequelize/models/models', () => ({
  models: { event: { create: jest.fn() } },
  sequelize: {},
}));

import { models } from '@app/shared/sequelize/models/models';
import { createEvent } from '@app/queries/event';

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
});
