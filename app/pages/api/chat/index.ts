import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiLogging } from '@app/utils/api';
import { authenticate } from '@app/utils/authenticate';
import { logger } from '@app/utils/logger';
import { Session } from '@app/shared/interfaces';
import { chatRateLimiter } from '@app/utils/rate-limiters';
import {
  CHAT_UNAVAILABLE_MESSAGE,
  UPSTREAM_TIMEOUT_MS,
  applyUpstreamSessionCookie,
  chatConfig,
  chatUserId,
  fetchUpstream,
  upstreamHeaders,
} from '@app/utils/chat-proxy';

const log = logger.child({ module: 'api/chat' });

// The answer is streamed as it is produced, so Next.js must not cap the response size.
export const config = { api: { responseLimit: false } };

const STREAM_FAILED_EVENT = `data: ${JSON.stringify({
  error: 'The assistant failed to respond. Please try again.',
})}\n\n`;

const readPrompt = (req: NextApiRequest, maxPromptLength: number) => {
  const prompt = req.body?.prompt;
  if (typeof prompt !== 'string' || prompt.trim() === '') return { error: 'Please enter a question.' };
  if (prompt.length > maxPromptLength) return { error: `Questions can be at most ${maxPromptLength} characters.` };
  return { prompt };
};

async function sendMessage(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { maxPromptLength } = chatConfig();
  const { prompt, error } = readPrompt(req, maxPromptLength);
  if (error || !prompt) {
    res.status(400).json({ message: error });
    return;
  }

  await chatRateLimiter(req, res, userId);
  if (res.headersSent) {
    log.warn('chat rate limit reached');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  // The caller went away (closed the chat, started a new one, navigated): stop the upstream answer too.
  res.on('close', () => {
    if (!res.writableFinished) controller.abort();
  });

  try {
    let upstream: Response;
    try {
      upstream = await fetchUpstream('chat', {
        method: 'POST',
        headers: upstreamHeaders(req, userId, { 'Content-Type': 'application/json', Accept: 'text/event-stream' }),
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });
    } catch (err) {
      if (res.destroyed) return;
      log.error({ err }, 'chat upstream request failed');
      res.status(502).json({ message: CHAT_UNAVAILABLE_MESSAGE });
      return;
    }

    if (!upstream.ok || !upstream.body) {
      log.error({ upstreamStatus: upstream.status }, 'chat upstream returned an error');
      res.status(502).json({ message: CHAT_UNAVAILABLE_MESSAGE });
      return;
    }

    log.debug({ promptLength: prompt.length }, 'chat answer streaming');
    applyUpstreamSessionCookie(upstream, res, userId);
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    // no-transform keeps compression from buffering the stream; X-Accel-Buffering does the same for proxies.
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } catch (err) {
      if (res.destroyed) return;
      // Headers (200) are already sent, so report the failure in-band, as the RAG API does.
      log.error({ err }, 'chat upstream stream failed');
      res.write(STREAM_FAILED_EVENT);
      res.write('data: [DONE]\n\n');
    }
    res.end();
  } finally {
    clearTimeout(timeout);
  }
}

async function resetConversation(req: NextApiRequest, res: NextApiResponse, userId: string) {
  try {
    const upstream = await fetchUpstream('chat', { method: 'DELETE', headers: upstreamHeaders(req, userId) });
    applyUpstreamSessionCookie(upstream, res, userId);
    if (!upstream.ok) {
      log.error({ upstreamStatus: upstream.status }, 'chat reset upstream returned an error');
      res.status(502).json({ message: CHAT_UNAVAILABLE_MESSAGE });
      return;
    }
    res.status(204).end();
  } catch (err) {
    log.error({ err }, 'chat reset upstream request failed');
    res.status(502).json({ message: CHAT_UNAVAILABLE_MESSAGE });
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
  const userId = chatUserId(session);

  if (req.method === 'POST') {
    await sendMessage(req, res, userId);
  } else if (req.method === 'DELETE') {
    await resetConversation(req, res, userId);
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withApiLogging(handler);
