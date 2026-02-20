# openclaw-webui

Web dashboard for [OpenClaw](https://github.com/artash0001/openclaw) — monitor agents, sessions, costs, logs, and VPS stats from your browser.

Built with Next.js, Tailwind CSS, and Recharts.

## Prerequisites

- Node.js >= 18
- npm (or pnpm / yarn)
- A running OpenClaw instance on the same machine

## Setup

1. **Clone the repo:**

   ```bash
   git clone https://github.com/artash0001/openclaw-webui.git
   cd openclaw-webui
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   Create a `.env.local` file in the project root:

   ```bash
   # Secret used for signing session cookies (generate a random string)
   NEXTAUTH_SECRET=your-random-secret-here

   # Password for the web UI login page
   WEBUI_PASSWORD=your-password-here
   ```

   You can generate a secret with:

   ```bash
   openssl rand -hex 32
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and log in with the password you set.

## Production

Build and start the production server:

```bash
npm run build
npm run start
```

By default the server runs on port 3000. Set the `PORT` environment variable to change it.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── agents/           # Agent list and detail views
│   ├── api/              # API routes (logs, VPS stats, config, gateway proxy)
│   ├── config/           # Configuration viewer
│   ├── costs/            # Usage cost charts
│   ├── logs/             # Log viewer
│   ├── login/            # Login page
│   ├── sessions/         # Session list
│   └── vps/              # VPS resource monitoring
├── components/           # Shared UI components (dashboard, charts, nav)
├── lib/                  # Auth, gateway RPC client, formatting utilities
└── middleware.ts          # Session verification middleware
```

## Linting

```bash
npm run lint
```
