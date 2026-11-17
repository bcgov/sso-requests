import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiLogging } from '@app/utils/api';
import { authenticate } from '@app/utils/authenticate';
import { logger } from '@app/utils/logger';
import { Session } from '@app/shared/interfaces';
import { chatConfig, chatUserId, fetchUpstream, upstreamHeaders } from '@app/utils/chat-proxy';

const log = logger.child({ module: 'api/chat/feedback' });

// The id of the answer's stream chunks, as the RAG API issues it.
const TURN_ID_PATTERN = /^chatcmpl-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RATINGS = ['up', 'down'] as const;
type Rating = typeof RATINGS[number];

const FEEDBACK_NOT_FOUND_MESSAGE = "This answer can't be rated.";
const FEEDBACK_FAILED_MESSAGE = 'Your rating could not be saved. Please try again.';

const readFeedback = (req: NextApiRequest) => {
  const turnId = req.body?.turnId;
  const rating = req.body?.rating;
  if (typeof turnId !== 'string' || !TURN_ID_PATTERN.test(turnId)) return null;
  if (rating !== null && !RATINGS.includes(rating)) return null;
  return { turnId, rating: rating as Rating | null };
};

/**
 * Rates one answer of the signed-in user's conversation: `rating` "up" or "down", or null to clear it. The RAG API
 * stores it with the answer for analysis, and only accepts answers of this browser's session, so the session cookie
 * is forwarded.
 */
async function rateAnswer(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const feedback = readFeedback(req);
  if (!feedback) {
    res.status(400).json({ message: FEEDBACK_NOT_FOUND_MESSAGE });
    return;
  }

  try {
    const upstream = await fetchUpstream('chat/feedback', {
      method: 'POST',
      headers: upstreamHeaders(req, userId, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ turn_id: feedback.turnId, rating: feedback.rating }),
    });
    await upstream.body?.cancel().catch(() => undefined);

    if (upstream.ok) {
      log.info({ rating: feedback.rating }, 'chat answer rated');
      res.status(204).end();
    } else if (upstream.status === 404) {
      // Another session's answer, one that wasn't stored, or rating is switched off upstream.
      log.warn('chat feedback rejected by upstream');
      res.status(404).json({ message: FEEDBACK_NOT_FOUND_MESSAGE });
    } else {
      log.error({ upstreamStatus: upstream.status }, 'chat feedback upstream returned an error');
      res.status(502).json({ message: FEEDBACK_FAILED_MESSAGE });
    }
  } catch (err) {
    log.error({ err }, 'chat feedback upstream request failed');
    res.status(502).json({ message: FEEDBACK_FAILED_MESSAGE });
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (!chatConfig().enabled) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  const session = (await authenticate(req.headers)) as Session | false;
  if (!session) {
    res.status(401).json({ message: 'Please log in to use the assistant.' });
    return;
  }

  if (req.method === 'POST') {
    await rateAnswer(req, res, chatUserId(session));
    return;
  }

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withApiLogging(handler);
