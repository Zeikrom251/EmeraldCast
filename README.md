# EmeraldCast

A multi-stream viewer for Twitch. Watch several streams at once, rearrange them with drag-and-drop, and follow every chat in one merged feed, all from a single static page with no account and no backend.

---

## Features

- **Multi-stream playback**: open as many Twitch streams as you want side by side
- **Flexible layouts**: switch between Grid and Focus (main stream + resizable sidebar) at any time
- **Drag-and-drop reordering**: rearrange streams by dragging them within the grid
- **Per-stream audio focus**: choose which stream plays audio while the rest stay muted
- **Per-stream chat**: show the chat of any open stream in a side panel
- **Unified chat**: merge every open channel into a single colour-coded feed, with emotes, read anonymously straight from Twitch IRC
- **Live status**: open streams are polled for viewers and uptime, and tiles are flagged the moment a broadcast ends, with one click to clear them all
- **Channel search**: search any Twitch channel from the home screen or the ⌘K command palette and add it instantly
- **Category browsing**: browse top categories or search one (Just Chatting, GTA V…), filter its live streams by language, title or tag, star favourites, and add several streams at once; the panel sits beside the wall so streams keep playing
- **Command palette**: press `⌘K` / `Ctrl+K` to add channels, reopen recent channels or saved walls, and run any action
- **Saved walls**: name and save a whole multi-view setup, then restore it from the home screen or ⌘K
- **Shareable links**: copy a link that encodes your current streams, layout and audio focus so anyone can open the same multi-view
- **Keyboard shortcuts**: drive the whole multi-view from the keyboard; press `?` for the full list
- **Cross-tab sync**: layouts, saved walls and recent channels stay in step across every open tab

---

## Tech Stack

| Layer       | Technology                                     |
| ----------- | ---------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite, Tailwind CSS, SCSS |
| Drag & drop | dnd-kit                                        |
| Twitch data | Official embeds + Twitch's public GraphQL API  |

---

## Project Structure

```
EmeraldCast/
└── apps/
    └── client/          # React app (Vite), the whole product
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) ≥ 8

### 1. Clone the repository

```bash
git clone https://github.com/Zeikrom251/EmeraldCast.git
cd EmeraldCast
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Run in development

```bash
pnpm dev
```

This starts the app at `http://localhost:5173`. No environment variables or Twitch credentials are needed.

---

## How It Works

EmeraldCast is a static site that talks to Twitch directly from the browser:

- **Players and single-channel chat** use Twitch's official embeds.
- **Channel search, categories and live status** (viewers, uptime, offline detection) call `gql.twitch.tv`, the public GraphQL endpoint twitch.tv itself uses, with its public web Client-ID. It needs no secret and no login, but it is **unofficial and undocumented**: if Twitch changes it, search, categories and live status stop working while playback and chat keep going. All of it lives in `apps/client/src/lib/twitch.ts`.
- **Unified chat** connects to Twitch's IRC-over-WebSocket gateway with an anonymous `justinfan` login. It is read-only and needs no credentials.
- **Everything you save** (open streams, saved walls, recent channels) stays in `localStorage`.

---

## Available Scripts

Run these from the repo root:

| Command       | Description                           |
| ------------- | ------------------------------------- |
| `pnpm dev`    | Start the app in development mode     |
| `pnpm build`  | Build the app for production          |
| `pnpm test`   | Run the test suite                    |
| `pnpm lint`   | Lint the source                       |
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
