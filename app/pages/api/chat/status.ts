import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiLogging } from '@app/utils/api';
import { chatConfig, ragFeedbackEnabled } from '@app/utils/chat-proxy';

/**
 * Read at runtime by the chat widget, so the assistant can be turned on or off per environment without a rebuild.
 * `feedbackEnabled` comes from the RAG API and says whether answers can be rated.
 */
async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === 'GET') {
    const { enabled, maxPromptLength } = chatConfig();
    if (!enabled) {
      res.status(200).json({ enabled });
      return;
    }
    res.status(200).json({ enabled, maxPromptLength, feedbackEnabled: await ragFeedbackEnabled() });
    return;
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withApiLogging(handler);
