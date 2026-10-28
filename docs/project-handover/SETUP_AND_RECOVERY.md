# 🛠️ Setup & Recovery Guide

Follow this guide to restore and run the Muffin Factory Game on a freshly formatted MacBook, Linux workstation, or development container.

---

## 1. Prerequisites Installation (macOS Apple Silicon / Homebrew)

Open Terminal and verify/install:
```bash
# 1. Verify Node.js (Version 20+ LTS recommended)
export PATH="/Users/shivamrai/.local/bin:$PATH"
node -v   # Verified: v22.12.0
npm -v    # Verified: 10.9.0

# 2. Verify Git
git --version
```

If Node is not in your default `$PATH`, add it to your `~/.zshrc`:
```bash
echo 'export PATH="/Users/shivamrai/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## 2. Clone Repository
```bash
git clone https://github.com/111shivamrai/muffin-factory-game.git
cd muffin-factory-game
```

---

## 3. Backend Setup

```bash
cd backend

# Install dependencies (automatically runs build via postinstall)
npm install

# Run test suite to verify 100% deterministic simulation math
npm test

# Build backend TypeScript
npm run build

# Start backend development server
npm run dev
```
The backend server runs at `http://localhost:5001`. You can test health at `http://localhost:5001/health`.

---

## 4. Frontend Setup

In a new terminal window:
```bash
cd muffin-factory-game/frontend

# Install dependencies
npm install

# Build frontend to verify production bundle compilation
npm run build

# Start frontend development server
npm run dev
```
The frontend starts at `http://localhost:3000`.

---

## 5. One-Click Startup Script

For fast local development on macOS:
```bash
# From the repository root:
./START_SERVERS.sh
```
This script clears ports `3000` and `5001`, launches the backend in one Terminal tab, launches the frontend in another, and displays direct URLs to all dashboards.

---

## 6. Access Points & Seed Credentials

| Portal | URL | Default Credentials |
| :--- | :--- | :--- |
| **Landing Page** | `http://localhost:3000` | Team name + Room code |
| **Instructor Dashboard** | `http://localhost:3000/instructor` | `instructor@factory.com` / `muffin123` |
| **Super Admin Portal** | `http://localhost:3000/saas-admin` | `aryajain1906@gmail.com` / `@Aryajain19` |
| **Backend Health Check** | `http://localhost:5001/health` | Public JSON check |

---

## 7. Environment Variables Reference

### Backend (`backend/.env`)
- `PORT`: Server port (default: `5001`, assigned by hosting provider in production).
- `NODE_ENV`: `development` | `production`.
- `JWT_SECRET`: Secret key for signing tokens (defaults to development key if omitted).
- `DATABASE_URL`: (Optional) PostgreSQL connection URI. If omitted, uses local JSON database fallback (`backend/data/db.json`).
- `FRONTEND_URL`: Primary frontend domain for CORS matching.

### Frontend (`frontend/.env.production`)
- `VITE_API_URL`: Points to the production backend server (`https://muffin-factory-game.onrender.com`). In local development, the client automatically defaults to `http://localhost:5001` when hosted on `localhost`.
