import type { NextApiRequest, NextApiResponse } from 'next';
import { parseInvitationToken } from '@app/helpers/token';
import { verifyTeamMember } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.query.token;
  if (!token) return res.redirect(`/verify-user?message=notoken`);
  else {
    const { error, message, userId, teamId } = parseInvitationToken(token);

    if (error) return res.redirect(`/verify-user?message=${message}`);

    const verified = await verifyTeamMember(userId, teamId);
    if (!verified) return res.redirect(`/verify-user?message=notfound`);

    return res.redirect(`/verify-user?message=success&teamId=${teamId}`);
  }
}
