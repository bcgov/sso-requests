# ADR 0003: CSS Assistant chatbot backed by the sso-rag agent

- **Status:** Accepted
- **Date:** 2026-11-05
- **Supersedes:** none

## Context

Teams using the CSS app ask the same questions about integrations, identity providers, roles and the CSS API that the
documentation already answers. The [sso-rag](https://github.com/bcgov/sso-rag) project runs a retrieval-augmented
agent over that documentation on AWS (API Gateway REST API in front of a FastAPI service using Amazon Bedrock). It
ships its own full-page chat UI. We wanted that assistant inside the CSS app, as a small widget rather than a separate
site.

Constraints that shaped the design:

1. **The browser can't call the RAG API directly.** The production Content Security Policy is `default-src 'self'` with
   no `connect-src`, so requests to the API Gateway origin are blocked.
2. **The RAG API keeps history in a same-site cookie.** A conversation is keyed by an HttpOnly `strands_session` cookie
   (`SameSite=Lax`) plus an `X-Tab-Id` header. A browser does not send a `SameSite=Lax` cookie on a cross-site
   `fetch`, so calling the API from the CSS domain would lose the conversation on every message.
3. **The RAG API has no authentication, and every message costs model tokens.** Nothing on the API Gateway limits who
   calls it or how often.
4. **The bottom-right corner is taken.** The satisfaction survey (`components/SurveyBox.tsx`) opens there.
5. **The RAG API can't return a conversation.** It has `POST /chat`, `DELETE /chat` and `DELETE /chat/history`, but no
   endpoint to read stored messages back.

## Decision

Add a **CSS Assistant** widget for signed-in users, talking to the RAG API only through a same-origin proxy in the CSS
app. Configuration and day-to-day details are in the
[developer guide](../developer-guide.md#css-assistant-chatbot).

### 1. Same-origin proxy

The browser only calls the app's own routes (`app/pages/api/chat/`), which forward to `RAG_API_URL`:

| Route                      | Upstream               | Purpose                                                          |
| -------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `POST /api/chat`           | `POST /chat`           | Ask a question; the answer streams back as server-sent events.   |
| `DELETE /api/chat`         | `DELETE /chat`         | End this tab's conversation (New chat).                          |
| `DELETE /api/chat/history` | `DELETE /chat/history` | Delete every conversation this user has in this browser.         |
| `GET /api/chat/status`     | none                   | Whether the assistant is enabled, and the question length limit. |

- Upstream requests are built from an allowlist: the session id (as `strands_session`), a valid `X-Tab-Id` and the
  content headers. The user's bearer token, Keycloak cookies and other headers are never forwarded.
- The SSE stream is piped through unchanged, including the RAG API's keepalive comments. The response sets
  `Cache-Control: no-cache, no-transform` (so compression doesn't buffer it) and `X-Accel-Buffering: no`.
- If the client disconnects, the upstream request is aborted, so the agent stops working on an answer nobody will
  read. Upstream calls time out after 300 seconds.
- Failures before the stream starts return 502 with a friendly message. Failures after it starts are sent in-band as
  `{ "error": … }`, as the RAG API does.

### 2. Signed-in users only

- `POST /api/chat`, `DELETE /api/chat` and `DELETE /api/chat/history` call `authenticate()` and return 401 without a
  valid bearer token. `authenticate()` now also returns the token's `sub` claim.
- The widget is rendered from `pages/_app.tsx` only when there is a Keycloak session and the user's profile has loaded
  (`session && user`), and it sends `Authorization` from `getAuthHeader()` on every call.

### 3. Per-user rate limit and question length

- `chatRateLimiter` (`utils/rate-limiters.ts`) allows `CHATBOT_RATE_LIMIT` messages (default 10) per
  `CHATBOT_RATE_LIMIT_WINDOW_MS` (default one hour) per user. It is keyed on the token's `sub`, or the IDIR GUID if a
  token has none, and stored in Redis under the `rl-chat:` prefix. Over the limit, the route returns 429 with
  `Retry-After`, and the widget tells the user roughly how many minutes to wait.
- Questions are limited to `CHATBOT_MAX_PROMPT_LENGTH` characters (default 500). The widget caps the input and the
  proxy rejects longer, empty or non-text prompts with 400.
- Validation runs before the rate limit, so rejected questions don't use up the user's allowance.

### 4. Session cookie, tied to the user

- The proxy keeps the upstream session id in its own cookie, `css_chat_session`: HttpOnly, `SameSite=Lax`, `Secure`
  on HTTPS, with its path limited to `/api/chat`. It mirrors the upstream cookie's lifetime and deletion.
- The value is `<tag>.<session id>`, where the tag is the first 16 hex characters of a SHA-256 hash of the user's id.
  The proxy only uses a cookie whose tag matches the signed-in user, so another user signing in on the same browser
  starts a new conversation instead of continuing (and getting the context of) the previous user's.
- Malformed cookie values and tab ids are dropped rather than forwarded.

### 5. The widget

`components/ChatWidget/` keeps the sso-rag UI's behaviour, restyled with the app's components and theme:

- A round launcher button in the bottom-right corner opens a 400px window in the survey box's style.
- While the answer is prepared, it shows progress labels ("Searching the documentation…", "Checking sources…").
  Answers are revealed smoothly by a typewriter effect, since the RAG API usually sends them in one chunk after
  checking them.
- Answers are rendered as GitHub-flavoured Markdown with `react-markdown` and `remark-gfm`. Raw HTML is not rendered,
  and links open in a new tab.
- Each answer lists its sources and, when the documentation only partly covers the question, says so.
- A ⋮ menu in the window header, next to the minimize button, holds the conversation actions. It is a react-bootstrap
  `Dropdown`, so it supports keyboard navigation, and Escape closes the menu without closing the window.
  - **New chat** starts a new conversation in the tab. It is disabled while there is nothing to clear.
  - **Delete history** asks for confirmation in the existing `GenericModal` and deletes every conversation the user has
    in this browser. It is disabled while an answer streams, because the RAG API saves a turn when it finishes and
    would write the conversation back after the delete.
- Keyboard and screen-reader support: Escape closes the window, and focus moves into the window and back to the
  launcher. Progress is announced through a live region. An empty conversation shows a short note that answers are
  AI-generated and that personal information shouldn't be shared.

`utils/chat/` holds code ported from the sso-rag UI: the SSE parser, the typewriter, and
`stabilizeStreamingMarkdown`, which keeps half-received Markdown from flashing as raw syntax.

### 6. Never alongside the survey

`_app.tsx` passes `hidden={displaySurvey}`. While the survey is displayed, the launcher and the window are hidden. When
the survey closes, the widget waits for its 500 ms collapse animation before reappearing, so the two never overlap.
The widget stays mounted while hidden, so a conversation, or an answer still streaming, is not lost.

### 7. History restored from `sessionStorage`

Because the RAG API can't return a conversation (constraint 5), `useChat` keeps the messages on screen in
`sessionStorage` (`utils/chat/history.ts`):

- They are stored under the same tab id the RAG API keys the conversation by, and tagged with the signed-in user. A
  page refresh restores them, and a different user's are discarded.
- Only finished turns are stored. An answer still streaming is left out together with its question, since the RAG API
  only saves a turn once it completes.
- Storage is capped at the last 50 messages. Restored entries are validated, and only `http(s)` source links are kept.
- New chat, Delete history or another user signing in clears the stored copy, and closing the tab ends it.

### 8. Configuration, logging and audit

- `CHATBOT_ENABLED`, `RAG_API_URL`, `CHATBOT_RATE_LIMIT`, `CHATBOT_RATE_LIMIT_WINDOW_MS` and `CHATBOT_MAX_PROMPT_LENGTH`
  are read at runtime from the `env:` map in `helm/values-*.yaml`, and the widget asks `/api/chat/status` whether to
  show. The assistant can therefore be switched per environment without rebuilding the image. It is enabled in the
  sandbox namespaces and disabled in production until a production RAG endpoint exists.
- The routes are wrapped in `withApiLogging`. They log metadata only (upstream status, prompt length, rate-limit hits),
  never question or answer text, cookie values or tokens.
- The three write routes are listed as `unaudited` in `app/jest-api/audit-coverage-manifest.ts`. They change no CSS
  resource, and the conversation is held by the RAG API.

## Consequences

### Positive

- Users get answers from the documentation without leaving the app, with sources to check them against.
- The RAG API stays unchanged and unaware of the CSS app. The proxy adapts its cookie model to the app's domain.
- The app's credentials and cookies never reach the RAG API, and conversations are isolated per user and per tab.
- Model cost is bounded per user, and the assistant can be turned off per environment with one setting.
- Behaviour is covered by tests: `jest/chat-widget.test.tsx` and `jest/chat-utils.test.ts` for the widget and helpers,
  and `jest-api/48.chat-proxy.test.ts` for the proxy, including authentication, cookie isolation and the rate limit.

### Negative and limitations

- **The RAG API itself is still open.** The protections above apply only to traffic through the CSS app. Anyone who
  knows the API Gateway URL can call it directly, with no limit. Restricting the gateway (for example with an API key
  the proxy sends, or a resource policy) is a follow-up in sso-rag.
- **IDIR users only.** `authenticate()` accepts only IDIR and Azure IDIR tokens with an email, like the rest of the
  app.
- **History lives in the browser.** The restored conversation is per tab: it is not shared between tabs or devices
  and does not survive closing the tab. The RAG API keeps conversations for three days by default. If it has already discarded
  one, the restored messages still show, but the assistant no longer has them as context.
- **Delete history doesn't clear other tabs' screens.** It deletes all of the user's conversations in the browser on
  the server, but other open tabs keep showing their messages until they start a new chat or close.
- **A disconnected answer is lost.** If the user closes the tab or loses the connection mid-answer, the RAG API saves
  nothing for that turn, and the question is not restored.
- **The rate limit counts messages, not tokens,** and a message counts even if the RAG API then fails to answer it.
  Without `REDIS_HOST`, the limit is kept in memory per pod, so each replica allows the full limit.
- **Answers arrive all at once.** The RAG API checks each answer against the documentation before sending it, so the
  progress labels can show for several seconds.
- **Ported code to keep in step.** The SSE parser, typewriter and Markdown stabilizer are copies of the sso-rag UI's,
  and changes to the stream format must be made in both places.
- **ESM-only dependencies.** `react-markdown` and the unified/remark packages it depends on are listed in
  `app/jest.config.js` `transformIgnorePatterns`, so Jest can load them. That list may need updating when they are
  upgraded.
- **`GET /api/chat/status` is public.** It only reports whether the assistant is enabled and the question length limit.

## Alternatives considered

| Option                                                                          | Why not                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Embed the sso-rag UI in an iframe                                               | Needs CSP changes for framing, has its own styling and no access to the user's session, and can't coordinate with the survey box.                                                                                                                                                   |
| Call the RAG API directly from the browser (allow the origin in `CORS_ORIGINS`) | Needs a CSP `connect-src` exception, and the `SameSite=Lax` session cookie isn't sent cross-site, so history would not work. There would also be no place to authenticate users or enforce a per-user limit.                                                                        |
| A Next.js `rewrites` rule instead of API routes                                 | Forwards the browser's cookies and headers as they are, including Keycloak cookies, and can't authenticate, rate limit or tie the session to a user.                                                                                                                                |
| A public chatbot limited per IP address                                         | The first implementation. The client address had to be read from `X-Forwarded-For`, whose trustworthy entry depends on the proxies in front of the app (`CHATBOT_TRUSTED_PROXY_COUNT`). Requiring a login made the limit per user and removed that dependency.                      |
| A history endpoint in sso-rag (`GET /chat`)                                     | Would make the server the single source of truth, but needs a change and redeployment of sso-rag. Stored messages are raw model output with `<thinking>` and `<grounding>` blocks, and source titles aren't stored, so they need converting before display. Can be revisited later. |
| Store conversations in the CSS database                                         | A new table with its own retention and privacy obligations, duplicating what the RAG API already stores.                                                                                                                                                                            |
