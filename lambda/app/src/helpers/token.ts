import { verify, sign, JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { User } from '@lambda-shared/interfaces';

const VERIFY_USER_SECRET = process.env.VERIFY_USER_SECRET || 'asdf';

export const generateInvitationToken = (user: User, teamId: number) => {
  return sign({ userId: user.id, teamId }, VERIFY_USER_SECRET, { expiresIn: '2d' });
};

export const parseInvitationToken = (token) => {
  try {
    const data = (verify(token, VERIFY_USER_SECRET) as any) || {};
    return data;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return { error: true, message: 'expired' };
    } else if (err instanceof NotBeforeError) {
      return { error: true, message: 'notbefore' };
    } else if (err instanceof JsonWebTokenError) {
      return { error: true, message: 'malformed' };
    }

    return { error: true, message: 'unknown' };
  }
};
