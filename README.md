# DOOMBOT

Live app (when the Mac and tunnel are running): https://huntsman-wanting-retread.ngrok-free.dev/

Cloud version: https://doombot-igba.onrender.com/

**DOOMBOT Cloud** is the always-on, multi-user version of this app. It keeps all data in a Turso database instead of a local file, so it runs on a free host (Render) without needing your computer to stay on. Anyone can sign in with Google and gets their own private chats, Doombots and memories. The code is in the [DoomBot-Cloud](https://github.com/BinavB/DoomBot-Cloud) repository.

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
| `OWNER_EMAIL` | The Google email that takes over data saved before sign-in was added |
| `DAILY_TOKEN_LIMIT` | Tokens each account may use per day |
| `DATABASE_PATH`, `NOTES_DIRECTORY` | Where the SQLite database and saved notes live |

In the Google Cloud console, add these Authorized redirect URIs to the OAuth client, using your own `APP_URL`:

- `APP_URL/api/auth/google/callback`
- `APP_URL/api/google/callback`

While the Google app is in Testing mode, only the test users you list can sign in. Reading Gmail for other people needs Google's app verification.

## Deploy on Google Cloud (free)

DOOMBOT keeps a SQLite file and runs its routines inside the server process, so it needs an always-on server with a saved disk. A Google Cloud `e2-micro` VM in `us-central1` (Iowa), `us-west1` (Oregon) or `us-east1` (South Carolina) stays free within Google's free-tier limits. The scripts in `deploy/gcp/` set it up.

### 1. Get a free domain
1. Sign in at https://www.duckdns.org with GitHub or Google.
2. Create a subdomain, such as `doombot-yourname`, and point it at the VM's external IP once you have it.

### 2. Create the VM
1. In Google Cloud, create a project and enable Compute Engine.
2. Create a VM instance: region `us-central1`, machine type `e2-micro`, boot disk Ubuntu 24.04 LTS with 30 GB standard persistent disk.
3. Tick **Allow HTTP traffic** and **Allow HTTPS traffic**.
4. Reserve a static external IP for the VM and set it on your DuckDNS subdomain.

### 3. Run the setup script
Open SSH from the Compute Engine page, then run:

```bash
curl -fsSLO https://raw.githubusercontent.com/BinavB/DoomBot/main/deploy/gcp/setup.sh
sudo DOMAIN=your-subdomain.duckdns.org bash setup.sh
```

### 4. Add your settings
Open the settings file and add the values from your `.env.local`:

```bash
sudo nano /etc/doombot.env
```

```
AI_PROVIDERS=gemini,deepseek
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=
APP_URL=https://your-subdomain.duckdns.org
OWNER_EMAIL=binav5555@gmail.com
APP_TIMEZONE=Asia/Dubai
BRIEFING_TIME=07:00
DAILY_TOKEN_LIMIT=200000
DATABASE_PATH=/var/lib/doombot/agent.db
NOTES_DIRECTORY=/var/lib/doombot/notes
```

Make `AUTH_SECRET` a new random value with `openssl rand -hex 32`. Then start the app:

```bash
sudo systemctl restart doombot
```

### 5. Google Cloud OAuth
In your OAuth client, add these Authorized redirect URIs, using your own domain:
- `https://your-subdomain.duckdns.org/api/auth/google/callback`
- `https://your-subdomain.duckdns.org/api/google/callback`

Add `binav5555@gmail.com` under **OAuth consent screen → Test users**.

### Updates
After you push new commits, run this on the VM:

```bash
sudo doombot-update
```

### Keep it running
The app runs as a service named `doombot`. Check it with `sudo systemctl status doombot`, and read its log with `sudo journalctl -u doombot -f`.
