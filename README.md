# EmeraldCast

A multi-stream viewer for Twitch. Watch several streams at once, rearrange them with drag-and-drop, and keep an eye on your followed channels — all from a single page.

---

## Features

- **Multi-stream playback** — open as many Twitch streams as you want side by side
- **Flexible layouts** — switch between Grid, Main + Sidebar, and Focus modes at any time
- **Drag-and-drop reordering** — rearrange streams by dragging them within the grid
- **Per-stream audio focus** — choose which stream plays audio while the rest stay muted
- **Per-stream chat** — pin the chat of any active stream in a resizable side panel
- **Following panel** — connect your Twitch account to see your followed channels and their live status at a glance
- **Channel search** — search any Twitch channel and add it instantly

---

## Tech Stack

| Layer       | Technology                                     |
| ----------- | ---------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite, Tailwind CSS, SCSS |
| Backend     | NestJS (Node.js), TypeScript                   |
| Monorepo    | pnpm workspaces + Turborepo                    |
| Drag & drop | dnd-kit                                        |
| Auth        | Twitch OAuth 2.0 + short-lived JWT             |
| HTTP        | Axios (client ↔ server ↔ Twitch Helix API)     |

---

## Project Structure

```
EmeraldCast/
├── apps/
│   ├── client/          # React frontend (Vite)
│   └── server/          # NestJS API server
└── packages/
    ├── types/           # Shared TypeScript types
    └── utils/           # Shared utility functions
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) ≥ 8

### 1. Clone the repository

```bash
git clone https://github.com/your-username/EmeraldCast.git
cd EmeraldCast
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in `apps/server/` (or at the repo root if you prefer) with the following:

```env
# Twitch application credentials (https://dev.twitch.tv/console)
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret

# OAuth redirect URI — must match what you registered on Twitch
TWITCH_REDIRECT_URI=http://localhost:3001/api/twitch/auth/callback

# Frontend origin for CORS
FRONT_URL=http://localhost:5173

# Server port
PORT=3001

# Secret used to sign the short-lived JWT returned after OAuth
JWT_SECRET=change-this-in-production
```

You will need a Twitch application. Register one at the [Twitch Developer Console](https://dev.twitch.tv/console/apps) and add `http://localhost:3001/api/twitch/auth/callback` as a valid OAuth redirect URI.

### 4. Run in development

```bash
pnpm dev
```

This starts both the client (`http://localhost:5173`) and the server (`http://localhost:3001`) in watch mode via Turborepo.

---

## How It Works

The NestJS server acts as a thin, secure middleware layer between the browser and the Twitch Helix API. This keeps your `TWITCH_CLIENT_SECRET` out of the browser entirely.

**OAuth flow:**

1. User clicks "Connect Twitch" → browser is redirected to `/api/twitch/auth/login`
2. Server builds the Twitch authorization URL and redirects the user
3. Twitch redirects back to `/api/twitch/auth/callback` with a short-lived code
4. Server exchanges the code for a user access token, fetches the user's followed channels, and signs a short-lived JWT
5. Browser receives the JWT **in the URL fragment** (never in a query parameter or cookie) — it is never sent to any server
6. The frontend decodes the payload, stores the data in React context, and immediately strips the token from the URL

---

## Available Scripts

Run these from the repo root:

| Command       | Description                           |
| ------------- | ------------------------------------- |
| `pnpm dev`    | Start all apps in development mode    |
| `pnpm build`  | Build all apps for production         |
| `pnpm test`   | Run all test suites                   |
| `pnpm lint`   | Lint all packages                     |
| `pnpm format` | Format all source files with Prettier |

---

## Contributing

Contributions are welcome! Here is how to get involved:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push the branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please keep commits focused and follow the existing code style. For larger changes, opening an issue first to discuss the approach is appreciated.

---

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file included in this repository.
