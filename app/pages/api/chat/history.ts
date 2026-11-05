import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiLogging } from '@app/utils/api';
import { authenticate } from '@app/utils/authenticate';
import { logger } from '@app/utils/logger';
import { Session } from '@app/shared/interfaces';
import {
  CHAT_UNAVAILABLE_MESSAGE,
  applyUpstreamSessionCookie,
  chatConfig,
  chatUserId,
  upstreamHeaders,
  upstreamUrl,
} from '@app/utils/chat-proxy';

const log = logger.child({ module: 'api/chat/history' });

const HISTORY_NOT_DELETED_MESSAGE = 'Some history could not be deleted. Please try again.';

/** Deletes every conversation the signed-in user has with the assistant in this browser, and its session cookie. */
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
  const userId = chatUserId(session);

  if (req.method === 'DELETE') {
    try {
      const upstream = await fetch(upstreamUrl('chat/history'), {
        method: 'DELETE',
        headers: upstreamHeaders(req, userId),
      });
      applyUpstreamSessionCookie(upstream, res, userId);
      if (!upstream.ok) {
        log.error({ upstreamStatus: upstream.status }, 'chat history delete upstream returned an error');
        const message = upstream.status === 500 ? HISTORY_NOT_DELETED_MESSAGE : CHAT_UNAVAILABLE_MESSAGE;
        res.status(502).json({ message });
        return;
      }
      res.status(204).end();
    } catch (err) {
      log.error({ err }, 'chat history delete upstream request failed');
      res.status(502).json({ message: CHAT_UNAVAILABLE_MESSAGE });
    }
    return;
  }

  res.setHeader('Allow', ['DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withApiLogging(handler);
