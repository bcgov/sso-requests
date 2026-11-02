import { actionLabel, eventActor, eventOutcome, eventTarget } from '@app/helpers/events';

describe('event panel helpers', () => {
  it('names the actor by display name, then by kind and id', () => {
    expect(eventActor({ idirUserDisplayName: 'Jo Smith', actorType: 'user', actorId: 'JSMITH' })).toBe('Jo Smith');
    expect(eventActor({ actorType: 'service-account', actorId: 'service-account-team-1-2' })).toBe(
      'API account: service-account-team-1-2',
    );
    expect(eventActor({ actorType: 'system', actorId: 'workflow-engine' })).toBe('System: workflow-engine');
    // A row from before @sso/audit with no user at all.
    expect(eventActor({ actorType: 'system', actorId: null })).toBe('System');
  });

  it('reads the target from its columns, or from the details of an older row', () => {
    expect(eventTarget({ targetType: 'role', targetId: 'admin' })).toBe('Role: admin');
    expect(eventTarget({ details: { username: 'abc@idir', roleName: 'admin' } })).toBe('User: abc@idir');
    expect(eventTarget({ details: { userId: 7 } })).toBe('App user: 7');
    expect(eventTarget({ details: {} })).toBeNull();
  });

  it('treats an older row with no outcome as a success, and labels actions readably', () => {
    expect(eventOutcome({})).toBe('success');
    expect(eventOutcome({ outcome: 'superseded' })).toBe('superseded');
    expect(actionLabel('role-bulk-update')).toBe('Role bulk update');
  });
});
