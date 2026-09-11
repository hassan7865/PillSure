# PillSure

Healthcare management platform for patients, doctors, medical stores, and manufacturers. PillSure combines appointment booking, medicine marketplace/wholesale flows, LiveKit video visits, and WhatsApp chatbot tooling in a single npm workspaces monorepo.

## Features

- **Patient & doctor flows** — auth/onboarding, doctor search, appointments, and dashboard experiences
- **Medicine marketplace** — browse medicines, cart, and orders scoped to medical stores
- **Medical store & manufacturer tooling** — store catalogs, pack images, wholesale orders, and manufacturer listings
- **Live consultations** — LiveKit-powered video sessions from the Next.js client and Express API
- **WhatsApp agent** — business accounts, conversations, message history, and chatbot personas
- **RAG / recommendations** — server-side RAG query routes and recommendation UI components
- **Payments** — payment routes integrated with the order flow
- **Auth** — Firebase on the client; JWT + role initialization on the server

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend (`client/`) | Next.js 15, React 19, TypeScript, Tailwind CSS, Radix UI, Firebase, LiveKit, Leaflet, Recharts |
| Backend (`server/`) | Express 5, TypeScript, Drizzle ORM, PostgreSQL, JWT, bcrypt, LiveKit server SDK, AWS S3, Multer |
| Database | PostgreSQL (Docker Compose in `server/`), Drizzle migrations under `server/drizzle/` |
| Tooling | npm workspaces, nodemon/ts-node, drizzle-kit |

## Project structure

```
PillSure/
├── client/                 # Next.js App Router frontend (port 3000)
│   └── src/app/            # appointments, auth, dashboard, doctor, medicine, cart, orders, marketplace, …
├── server/                 # Express API (port 3001)
│   ├── index.ts            # API entry
│   ├── docker-compose.yml  # local Postgres
│   ├── drizzle/            # SQL migrations
│   └── src/
│       ├── routes/         # auth, doctor, appointments, marketplace, orders, whatsapp, livekit, …
│       ├── schema/         # Drizzle table definitions
│       ├── services/       # business logic
│       └── migrations/     # migration CLI
├── docs/                   # notes (e.g. WhatsApp bot test flow)
└── package.json            # workspace scripts
```

## Getting started

### Prerequisites

- Node.js ≥ 18 and npm ≥ 8
- Docker (for local PostgreSQL)

### Install

```bash
npm install
# or install each workspace:
npm install --workspace=client
npm install --workspace=server
```

### Environment

Create `client/.env.local` and `server/.env` with your Firebase, database, JWT, LiveKit, S3, and payment settings. Do not commit secrets. The server Docker Compose DB defaults (for local only) are defined in `server/docker-compose.yml`.

### Database

```bash
cd server && docker compose up -d
# from repo root:
npm run db:upgrade
npm run init:roles
```

Other DB helpers: `npm run db:generate`, `npm run db:studio`, `npm run db:current`, `npm run db:pending`.

### Run

```bash
# both apps (API + Next.js)
npm run dev

# individually
npm run dev:client   # http://localhost:3000
npm run dev:server   # Express on port 3001 (see server config)
```

### Build / production

```bash
npm run build
npm run start
```

## Notes

- Root scripts orchestrate workspaces via `npm-run-all`; there is no separate `install:all` / `setup` script in the current `package.json`.
- Schema coverage includes users/roles, patients, doctors, hospitals, medicines, medical stores, manufacturers, carts/orders, WhatsApp tables, RAG queries, and appointments.
