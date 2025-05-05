import type { NextApiRequest, NextApiResponse } from 'next';
import { createSurvey } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { sendTemplate } from '@app/shared/templates';
import { EMAILS } from '@app/shared/enums';
import { handleError, processUserSession } from '@app/utils/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'POST') {
      const { rating, message, triggerEvent } = req.body;

      if (!rating || !triggerEvent) {
        return res.status(422).json({ message: 'Please include the keys "rating" and "triggerEvent" in the body.' });
      }

      // awaiting so email won't send if db save errors
      await createSurvey(session, req.body);
      await sendTemplate(EMAILS.SURVEY_COMPLETED, { user: session.user, rating, message, triggerEvent });

      return res.status(200).json({ message: 'Survey created successfully' });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
