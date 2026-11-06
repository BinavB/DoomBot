# DOOMBOT

A self-hosted personal AI agent with a Doctor Doom theme. Chat with the chief bot, get a daily briefing, and run Doombots that keep their own memory, tasks and routines. Urgent results reach your phone through Web Push.

Every person signs in with Google and gets a private account. Chats, Doombots, memories, to-dos, alerts and Google connections are never shared between accounts.

## What it does

- Chat agent with an approval step for risky actions, using Gemini first and DeepSeek as a fallback.
- Morning briefing at 07:00 Dubai time with weather, headlines, calendar, unread email and to-dos.
- Doombots with private memory, assigned tasks and routines that run hourly, daily, on weekdays, weekly or monthly.
- Read-only Google Calendar, Gmail and Tasks, connected per account.
- Alerts page and phone alerts with Web Push.
- A daily token limit per account to cap AI cost.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local`, then open http://localhost:3000.

| Setting | What it is |
| --- | --- |
| `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` | AI provider keys |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client, used for sign-in and for Calendar, Gmail and Tasks |
| `AUTH_SECRET` | Random text of at least 32 characters that signs login cookies. Make one with `openssl rand -hex 32` |
| `APP_URL` | The public address of the app, with no trailing slash |
| `DAILY_TOKEN_LIMIT` | Tokens each account may use per day |
| `DATABASE_PATH`, `NOTES_DIRECTORY` | Where the SQLite database and saved notes live |

In the Google Cloud console, add these Authorized redirect URIs to the OAuth client, using your own `APP_URL`:

- `APP_URL/api/auth/google/callback`
- `APP_URL/api/google/callback`

While the Google app is in Testing mode, only the test users you list can sign in. Reading Gmail for other people needs Google's app verification.

## Deploy on Railway

DOOMBOT keeps a SQLite file and runs its routines inside the server process, so it needs one always-on server with a saved disk. Railway fits this.

1. Create a Railway project from this GitHub repo.
2. Add a Volume and mount it at `/data`.
3. Set the variables above, plus `DATABASE_PATH=/data/agent.db` and `NOTES_DIRECTORY=/data/notes`.
4. Generate a public domain, set `APP_URL` to it, and add the two redirect URIs in Google Cloud.
5. Keep the service at one instance.
