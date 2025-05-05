import type { NextApiRequest, NextApiResponse } from 'next';
import { parseInvitationToken } from '@app/helpers/token';
import { verifyTeamMember } from '@app/controllers/team';
import { handleError } from '@app/utils/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { token } = req.query;

      if (!token) return res.redirect(`/verify-user?message=notoken`);
      else {
        const { error, message, userId, teamId } = parseInvitationToken(token);

        if (error) return res.redirect(`/verify-user?message=${message}`);

        const verified = await verifyTeamMember(userId, teamId);
        if (!verified) return res.redirect(`/verify-user?message=notfound`);

        return res.redirect(`/verify-user?message=success&teamId=${teamId}`);
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    handleError(res, err);
  }
}
