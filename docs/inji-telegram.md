# Inji Telegram handoff

Inji remains a local fixed-Q&A assistant. Unknown questions can be sent to the Formiva team only after the visitor clicks **Ask the Formiva Team**.

## Environment variables

Set these server-side only:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
```

Production setup requires an Upstash Redis database and Vercel environment variables. Never put these values in `client/src`, public files, Vite client variables or browser code.

## Telegram setup

1. Create a bot with BotFather and obtain the bot token.
2. Start a chat with the bot from the admin account.
3. Obtain the admin chat ID.
5. Add the required variable names to Vercel Environment Variables without exposing their values to the client.
6. Configure the Telegram webhook at `/api/inji/telegram-webhook` with Telegram's secret-token header set from `TELEGRAM_WEBHOOK_SECRET`.
7. Ask an unknown question in Inji and click **Ask the Formiva Team**.
8. Reply from the configured Telegram chat with:

```text
/reply SESSION_ID Your answer here
```

The browser polls `GET /api/inji/reply?sessionId=...` only while the handoff is open and the chat is open.

## Endpoints

- `POST /api/inji/handoff` validates the anonymous session, question and conversation, stores the session in Upstash Redis, then sends a server-side Telegram notification.
- `GET /api/inji/reply?sessionId=...` reads only the matching session's status or reply from Upstash Redis.
- `POST /api/inji/telegram-webhook` verifies Telegram's secret-token header and configured admin chat ID, parses `/reply SESSION_ID MESSAGE`, and stores the answer.

Questions and conversation entries are length-limited. Telegram text is HTML-escaped before notification. Handoffs expire after 24 hours, and the server keeps only an anonymous session ID in browser storage.

## Local development and deployment

The Vercel API routes live under `api/inji/` and are independent of the static React output. The Express server is now static-only and does not run handoff APIs or Telegram polling.

For local frontend development, use a Vercel-compatible local runtime such as `vercel dev` so `/api/inji/*` routes are available. Telegram's production webhook cannot point at localhost; use a public HTTPS deployment or tunnel for webhook testing.

Upstash Redis is the persistent store. No database SDK is required: the API uses the Upstash REST API with native `fetch`. No actual credentials are included in this repository.
