import { createHash } from 'node:crypto';
import * as authenticateModule from '@app/utils/authenticate';
import { testClient } from './helpers/test-client';
import { API_BASE_PATH } from './helpers/constants';
import { invalidateRagAccessToken } from '@app/utils/rag-token';
import chatHandler from '@app/pages/api/chat';
import chatHistoryHandler from '@app/pages/api/chat/history';
import chatStatusHandler from '@app/pages/api/chat/status';

const RAG_API_URL = 'https://rag.example/sandbox/';
const TOKEN_URL = 'https://sso.example/auth/realms/standard/protocol/openid-connect/token';
const SERVICE_TOKEN = 'service-account-token';
const TAB_ID = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const SESSION = 'sess_0b4e28ba-2fa1-41d2-883f-0016d3cca427';
const AUTH = 'Bearer test-token';

const SSE_ANSWER = [
  'data: {"id":"c","object":"chat.completion.chunk","created":0,"model":"m","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}\n\n',
  'data: [DONE]\n\n',
];

const sseResponse = (chunks: string[], headers: Record<string, string> = {}) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream', ...headers } });
};

// `authenticate` is automocked for API tests (helpers/common-mocks.js), so it signs no one in unless told to.
const mockedAuthenticate = authenticateModule.authenticate as jest.Mock;
let userCounter = 0;
const signIn = (sub = `user-${++userCounter}@azureidir`) => {
  mockedAuthenticate.mockResolvedValue({
    idir_userid: `GUID${userCounter}`,
    sub,
    email: 'user@gov.bc.ca',
    client_roles: [],
    given_name: 'Test',
    family_name: 'User',
  });
  return sub;
};
const signOut = () => mockedAuthenticate.mockResolvedValue(false);

// The chat cookie is tagged with a hash of the user it belongs to.
const cookieFor = (sub: string, sessionId = SESSION) =>
  `css_chat_session=${createHash('sha256').update(sub).digest('hex').slice(0, 16)}.${sessionId}`;

// Keycloak token requests are answered here; every other fetch goes to `upstream`, the RAG API.
const fetchSpy = jest.spyOn(global, 'fetch');
const tokenEndpoint = jest.fn(
  async () =>
    new Response(JSON.stringify({ access_token: SERVICE_TOKEN, expires_in: 300 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
);
const upstream = jest.fn<Promise<Response>, [string, RequestInit]>();
const upstreamCall = (index = 0) => {
  const [url, init] = upstream.mock.calls[index];
  return { url: String(url), init: init!, headers: init!.headers as Record<string, string> };
};

const post = (body: object) =>
  testClient(chatHandler).post(`${API_BASE_PATH}/chat`).set('Authorization', AUTH).send(body);

describe('CSS Assistant proxy', () => {
  beforeEach(() => {
    fetchSpy.mockReset();
    tokenEndpoint.mockClear();
    upstream.mockReset();
    fetchSpy.mockImplementation(async (url: any, init?: RequestInit) =>
      String(url) === TOKEN_URL ? tokenEndpoint() : upstream(String(url), init!),
    );
    invalidateRagAccessToken();
    signIn();
    process.env.CHATBOT_ENABLED = 'true';
    process.env.RAG_API_URL = RAG_API_URL;
    process.env.RAG_TOKEN_URL = TOKEN_URL;
    process.env.RAG_CLIENT_ID = 'css-app-rag';
    process.env.RAG_CLIENT_SECRET = 'client-secret';
    process.env.CHATBOT_MAX_PROMPT_LENGTH = '20';
    process.env.CHATBOT_RATE_LIMIT = '100';
  });

  afterAll(() => {
    fetchSpy.mockRestore();
    mockedAuthenticate.mockReset();
    [
      'CHATBOT_ENABLED',
      'RAG_API_URL',
      'RAG_TOKEN_URL',
      'RAG_CLIENT_ID',
      'RAG_CLIENT_SECRET',
      'CHATBOT_MAX_PROMPT_LENGTH',
      'CHATBOT_RATE_LIMIT',
    ].forEach((key) => delete process.env[key]);
  });

  describe('GET /api/chat/status', () => {
    it('reports the assistant as enabled with its prompt limit', async () => {
      const res = await testClient(chatStatusHandler).get(`${API_BASE_PATH}/chat/status`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ enabled: true, maxPromptLength: 20 });
    });

    it('reports the assistant as disabled without a RAG API URL or when switched off', async () => {
      delete process.env.RAG_API_URL;
      expect((await testClient(chatStatusHandler).get(`${API_BASE_PATH}/chat/status`)).body).toEqual({
        enabled: false,
      });
      process.env.RAG_API_URL = RAG_API_URL;
      process.env.CHATBOT_ENABLED = 'false';
      expect((await testClient(chatStatusHandler).get(`${API_BASE_PATH}/chat/status`)).body).toEqual({
        enabled: false,
      });
    });
  });

  describe('POST /api/chat', () => {
    it('requires a signed-in user', async () => {
      signOut();
      const res = await post({ prompt: 'Hello' });
      expect(res.status).toBe(401);
      expect(upstream).not.toHaveBeenCalled();
    });

    it('returns 404 when the assistant is disabled', async () => {
      process.env.CHATBOT_ENABLED = 'false';
      const res = await post({ prompt: 'Hello' });
      expect(res.status).toBe(404);
      expect(upstream).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing prompt', {}],
      ['an empty prompt', { prompt: '   ' }],
      ['a prompt that is not text', { prompt: 42 }],
      ['a prompt over the length limit', { prompt: 'x'.repeat(21) }],
    ])('rejects %s without calling the assistant', async (_case, body) => {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(res.body.message).toBeTruthy();
      expect(upstream).not.toHaveBeenCalled();
    });

    it("streams the answer and keeps the upstream session in the user's own cookie", async () => {
      const sub = signIn();
      upstream.mockResolvedValueOnce(
        sseResponse(SSE_ANSWER, {
          'Set-Cookie': `strands_session=${SESSION}; HttpOnly; Max-Age=86400; Path=/; SameSite=lax; Secure`,
        }),
      );

      const res = await post({ prompt: 'Hello' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.headers['cache-control']).toBe('no-cache, no-transform');
      expect(res.text).toBe(SSE_ANSWER.join(''));
      const cookie = res.headers['set-cookie'][0];
      expect(cookie).toContain(`${cookieFor(sub)};`);
      expect(cookie).not.toContain(sub);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Max-Age=86400');
      expect(cookie).toMatch(/Path=\/api\/chat/);

      const { url, init } = upstreamCall();
      expect(url).toBe(`${RAG_API_URL}chat`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ prompt: 'Hello' });
    });

    it("sends upstream the service account's token, the session cookie and a valid tab id, and nothing of the user's", async () => {
      const sub = signIn();
      upstream.mockResolvedValueOnce(sseResponse(SSE_ANSWER));

      await testClient(chatHandler)
        .post(`${API_BASE_PATH}/chat`)
        .set('Authorization', AUTH)
        .set('Cookie', `${cookieFor(sub)}; KEYCLOAK_SESSION=secret; other=value`)
        .set('X-Tab-Id', TAB_ID)
        .send({ prompt: 'Hello' });

      const { headers } = upstreamCall();
      expect(headers.Cookie).toBe(`strands_session=${SESSION}`);
      expect(headers['X-Tab-Id']).toBe(TAB_ID);
      expect(headers.Authorization).toBe(`Bearer ${SERVICE_TOKEN}`);
      expect(JSON.stringify(headers)).not.toMatch(/secret|test-token/);
    });

    it("does not continue another user's conversation from the same browser", async () => {
      const previousUser = signIn();
      signIn();
      upstream.mockResolvedValueOnce(sseResponse(SSE_ANSWER));

      await testClient(chatHandler)
        .post(`${API_BASE_PATH}/chat`)
        .set('Authorization', AUTH)
        .set('Cookie', cookieFor(previousUser))
        .send({ prompt: 'Hello' });

      expect(upstreamCall().headers.Cookie).toBeUndefined();
    });

    it('drops a malformed tab id or session cookie', async () => {
      upstream.mockResolvedValueOnce(sseResponse(SSE_ANSWER));

      await testClient(chatHandler)
        .post(`${API_BASE_PATH}/chat`)
        .set('Authorization', AUTH)
        .set('Cookie', 'css_chat_session=bad%0d%0avalue')
        .set('X-Tab-Id', 'not-a-uuid')
        .send({ prompt: 'Hello' });

      const { headers } = upstreamCall();
      expect(headers.Cookie).toBeUndefined();
      expect(headers['X-Tab-Id']).toBeUndefined();
    });

    it('returns 502 when the assistant cannot be reached or fails', async () => {
      upstream.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const unreachable = await post({ prompt: 'Hello' });
      expect(unreachable.status).toBe(502);
      expect(unreachable.body.message).toMatch(/unavailable/);

      upstream.mockResolvedValueOnce(new Response('oops', { status: 500 }));
      const failing = await post({ prompt: 'Hello' });
      expect(failing.status).toBe(502);
    });

    it('limits messages per user, whatever address they send from', async () => {
      process.env.CHATBOT_RATE_LIMIT = '2';
      upstream.mockImplementation(async () => sseResponse(SSE_ANSWER));
      const sendFrom = (ip: string) =>
        testClient(chatHandler)
          .post(`${API_BASE_PATH}/chat`)
          .set('Authorization', AUTH)
          .set('X-Forwarded-For', ip)
          .send({ prompt: 'Hello' });

      expect((await sendFrom('203.0.113.1')).status).toBe(200);
      expect((await sendFrom('203.0.113.2')).status).toBe(200);
      const limited = await sendFrom('203.0.113.3');
      expect(limited.status).toBe(429);
      expect(limited.body.message).toMatch(/message limit/);
      expect(limited.headers['retry-after']).toBeDefined();
      expect(upstream).toHaveBeenCalledTimes(2);

      // Another user still gets through.
      signIn();
      expect((await post({ prompt: 'Hello' })).status).toBe(200);
    });

    it('falls back to the IDIR GUID when the token has no subject', async () => {
      process.env.CHATBOT_RATE_LIMIT = '1';
      upstream.mockImplementation(async () => sseResponse(SSE_ANSWER));
      mockedAuthenticate.mockResolvedValue({
        idir_userid: 'NO-SUB-GUID',
        email: 'user@gov.bc.ca',
        client_roles: [],
        given_name: 'Test',
        family_name: 'User',
      });

      expect((await post({ prompt: 'Hello' })).status).toBe(200);
      expect((await post({ prompt: 'Hello' })).status).toBe(429);
    });

    it('does not count rejected prompts against the limit', async () => {
      process.env.CHATBOT_RATE_LIMIT = '1';
      upstream.mockImplementation(async () => sseResponse(SSE_ANSWER));

      expect((await post({ prompt: '' })).status).toBe(400);
      expect((await post({ prompt: 'Hello' })).status).toBe(200);
    });
  });

  describe('RAG API service account token', () => {
    it('is fetched with the client credentials grant and reused for later calls', async () => {
      upstream.mockImplementation(async () => sseResponse(SSE_ANSWER));

      expect((await post({ prompt: 'Hello' })).status).toBe(200);
      expect((await post({ prompt: 'Again' })).status).toBe(200);

      expect(tokenEndpoint).toHaveBeenCalledTimes(1);
      const [, init] = fetchSpy.mock.calls.find(([url]) => String(url) === TOKEN_URL)!;
      expect(init!.method).toBe('POST');
      expect(Object.fromEntries(new URLSearchParams(String(init!.body)))).toEqual({
        grant_type: 'client_credentials',
        client_id: 'css-app-rag',
        client_secret: 'client-secret',
      });
      expect(upstreamCall(1).headers.Authorization).toBe(`Bearer ${SERVICE_TOKEN}`);
    });

    it('is fetched again and the call retried once when the RAG API rejects it', async () => {
      upstream
        .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }))
        .mockResolvedValueOnce(sseResponse(SSE_ANSWER));

      const res = await post({ prompt: 'Hello' });

      expect(res.status).toBe(200);
      expect(res.text).toBe(SSE_ANSWER.join(''));
      expect(tokenEndpoint).toHaveBeenCalledTimes(2);
      expect(upstream).toHaveBeenCalledTimes(2);
    });

    it('returns 502 without calling the RAG API when Keycloak refuses the token', async () => {
      tokenEndpoint.mockResolvedValueOnce(new Response('{"error":"unauthorized_client"}', { status: 401 }));
      const res = await post({ prompt: 'Hello' });
      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/unavailable/);
      expect(upstream).not.toHaveBeenCalled();
    });

    it('keeps the assistant disabled until the service account is configured', async () => {
      delete process.env.RAG_CLIENT_SECRET;
      expect((await testClient(chatStatusHandler).get(`${API_BASE_PATH}/chat/status`)).body).toEqual({
        enabled: false,
      });
      expect((await post({ prompt: 'Hello' })).status).toBe(404);
      expect(tokenEndpoint).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/chat', () => {
    it('requires a signed-in user', async () => {
      signOut();
      const res = await testClient(chatHandler).delete(`${API_BASE_PATH}/chat`).set('X-Tab-Id', TAB_ID);
      expect(res.status).toBe(401);
      expect(upstream).not.toHaveBeenCalled();
    });

    it("clears this tab's conversation upstream", async () => {
      const sub = signIn();
      upstream.mockResolvedValueOnce(new Response(null, { status: 204 }));

      const res = await testClient(chatHandler)
        .delete(`${API_BASE_PATH}/chat`)
        .set('Authorization', AUTH)
        .set('Cookie', cookieFor(sub))
        .set('X-Tab-Id', TAB_ID);

      expect(res.status).toBe(204);
      const { url, init, headers } = upstreamCall();
      expect(url).toBe(`${RAG_API_URL}chat`);
      expect(init.method).toBe('DELETE');
      expect(headers['X-Tab-Id']).toBe(TAB_ID);
      expect(headers.Cookie).toBe(`strands_session=${SESSION}`);
    });
  });

  describe('DELETE /api/chat/history', () => {
    it('requires a signed-in user', async () => {
      signOut();
      const res = await testClient(chatHistoryHandler).delete(`${API_BASE_PATH}/chat/history`);
      expect(res.status).toBe(401);
      expect(upstream).not.toHaveBeenCalled();
    });

    it('deletes all history upstream and clears the session cookie', async () => {
      const sub = signIn();
      upstream.mockResolvedValueOnce(
        new Response(null, {
          status: 204,
          headers: { 'Set-Cookie': 'strands_session=""; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=/' },
        }),
      );

      const res = await testClient(chatHistoryHandler)
        .delete(`${API_BASE_PATH}/chat/history`)
        .set('Authorization', AUTH)
        .set('Cookie', cookieFor(sub));

      expect(res.status).toBe(204);
      const { url, headers } = upstreamCall();
      expect(url).toBe(`${RAG_API_URL}chat/history`);
      expect(headers.Cookie).toBe(`strands_session=${SESSION}`);
      const cookie = res.headers['set-cookie'][0];
      expect(cookie).toContain('css_chat_session=;');
      expect(cookie).toContain('Max-Age=0');
    });

    it('reports a partial failure so the user can retry', async () => {
      upstream.mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'x' }), { status: 500 }));
      const res = await testClient(chatHistoryHandler)
        .delete(`${API_BASE_PATH}/chat/history`)
        .set('Authorization', AUTH);
      expect(res.status).toBe(502);
      expect(res.body.message).toBe('Some history could not be deleted. Please try again.');
    });

    it('returns 404 when the assistant is disabled', async () => {
      process.env.CHATBOT_ENABLED = 'false';
      const res = await testClient(chatHistoryHandler)
        .delete(`${API_BASE_PATH}/chat/history`)
        .set('Authorization', AUTH);
      expect(res.status).toBe(404);
    });
  });
});
