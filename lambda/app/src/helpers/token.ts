import { verify, sign } from 'jsonwebtoken';
import { User } from '@lambda-shared/interfaces';

const VERIFY_USER_SECRET = process.env.VERIFY_USER_SECRET || 'asdf';

export const generateInvitationToken = (user: User, teamId: number) => {
  return sign({ userId: user.id, teamId }, VERIFY_USER_SECRET, { expiresIn: '2d' });
};

export const parseInvitationToken = (token) => {
  const data = (verify(token, VERIFY_USER_SECRET) as any) || {};
  return data;
};
