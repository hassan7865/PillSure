# PillSure Monorepo

A healthcare management platform built with Next.js frontend and Node.js/Express backend.

## Project Structure

```
pillsure-monorepo/
├── client/          # Next.js frontend application
├── server/          # Node.js/Express backend API
├── package.json     # Root package.json with workspace configuration
└── README.md        # This file
```

## Prerequisites

- Node.js (>= 18.0.0)
- npm (>= 8.0.0)
- Docker Desktop (for PostgreSQL database)

## Getting Started

### 1. Install Dependencies

Install all dependencies for both frontend and backend:

```bash
npm run install:all
```

### 2. Environment Setup

Run the setup script to create environment files:

```bash
npm run setup
```

This creates:
- `client/.env.local` - Frontend environment variables
- `server/.env` - Backend environment variables with Docker database config

### 3. Development

Start the complete development environment (Docker + Backend + Frontend):

```bash
npm run dev
```

This will start:
- **Docker PostgreSQL**: Database container (port 5432)
- **Backend**: Express.js API server (port 3001)
- **Frontend**: Next.js application (port 3000)

### 4. Database Setup

After starting the development environment, run database migrations:

```bash
npm run db:migrate
npm run init:roles
```

### 5. Individual Development

To run only the frontend:
```bash
npm run dev:client
```

To run only the backend:
```bash
npm run dev:server
```

## Available Scripts

### Root Level Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both applications
- `npm run start` - Start both applications in production mode
- `npm run install:all` - Install dependencies for all workspaces
- `npm run clean` - Clean node_modules and build artifacts

### Database Scripts

- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run init:roles` - Initialize user roles

### Docker Scripts

- `npm run docker:up` - Start PostgreSQL container
- `npm run docker:down` - Stop PostgreSQL container
- `npm run docker:logs` - View container logs
- `npm run docker:restart` - Restart PostgreSQL container

## Technology Stack

### Frontend (client/)
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Radix UI
- TanStack Query
- Firebase Authentication

### Backend (server/)
- Node.js
- Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL
- JWT Authentication
- bcryptjs

## Development Workflow

1. Make changes to either frontend or backend code
2. Both applications will hot-reload automatically
3. Frontend runs on port 3000, backend on port 3001
4. API calls from frontend are proxied to backend

## Production Deployment

1. Build both applications: `npm run build`
2. Start both applications: `npm run start`
3. Configure environment variables for production
4. Set up reverse proxy (nginx) to serve frontend and route API calls to backend

## Contributing

1. Create a feature branch
2. Make your changes
3. Test both frontend and backend
4. Submit a pull request