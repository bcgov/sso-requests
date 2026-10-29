import { diffRoles, hasChanges } from '@app/helpers/roles';

describe('role change helpers', () => {
  it('turns the next selection into exactly the roles to add and remove', () => {
    expect(diffRoles(['one', 'two', 'three'], ['two', 'four'])).toEqual({ add: ['four'], remove: ['one', 'three'] });
  });

  it('turns clearing every role into one removal per role', () => {
    expect(diffRoles(['one', 'two'], [])).toEqual({ add: [], remove: ['one', 'two'] });
  });

  it('knows when there is nothing to send', () => {
    expect(hasChanges(diffRoles(['one'], ['one']))).toBe(false);
    expect(hasChanges({ add: [], remove: ['one'] })).toBe(true);
  });
});
