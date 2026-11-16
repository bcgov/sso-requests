import { hasValidEmail } from '@app/utils/session';

describe('hasValidEmail', () => {
  it.each([undefined, null, {}, { email: '' }, { email: '   ' }, { email: 123 }])('rejects %p', (session) => {
    expect(hasValidEmail(session as any)).toBe(false);
  });

  it('accepts a session with an email', () => {
    expect(hasValidEmail({ email: 'user@gov.bc.ca' } as any)).toBe(true);
  });
});
