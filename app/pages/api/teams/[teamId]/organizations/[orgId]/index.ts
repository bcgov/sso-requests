import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { leaveOrganization, respondToOrganizationInvitation, updateTeamCeiling } from '@app/controllers/organization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);
    const teamId = Number(req.query.teamId);
    const orgId = Number(req.query.orgId);

    if (req.method === 'POST') {
      // Accepting or declining the invitation, optionally on narrower terms.
      return res.status(200).json(await respondToOrganizationInvitation(session as Session, teamId, orgId, req.body));
    } else if (req.method === 'PUT') {
      return res.status(200).json(await updateTeamCeiling(session as Session, teamId, orgId, req.body.ceilings || []));
    } else if (req.method === 'DELETE') {
      return res.status(200).json(await leaveOrganization(session as Session, teamId, orgId));
    } else {
      res.setHeader('Allow', ['POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
