# 🛠️ Setup & Recovery Guide

Follow this guide to restore and run the Muffin Factory Game on a freshly formatted MacBook, Linux workstation, or development container.

---

## 1. Prerequisites Installation (macOS M2 / Homebrew)

Open Terminal and verify/install:
```bash
# 1. Install Node.js (Version 20 LTS recommended)
node -v   # Should be >= 20.0.0
# If not installed or older:
brew install node@20

# 2. Verify Git
git --version
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

# Install dependencies
npm install

# (Optional) Setup environment variables
cp .env.example .env 2>/dev/null || cat << 'EOF' > .env
PORT=5001
NODE_ENV=development
JWT_SECRET=muffin_secret_key_development_only_123
# DATABASE_URL=postgresql://user:password@localhost:5432/muffindb  # (Optional: fallback uses in-memory)
EOF

# Run test suite to verify simulation math
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

# (Optional) Verify or set local API target
cat << 'EOF' > .env.development
VITE_API_URL=http://localhost:5001
EOF

# Build frontend to verify bundles
npm run build

# Start frontend development server
npm run dev
```
The frontend starts at `http://localhost:3000`.

---

## 5. Environment Variables Reference

### Backend (`backend/.env`)
- `PORT`: Server port (default: `5001`, Render assigns automatically in production).
- `NODE_ENV`: `development` | `production`.
- `JWT_SECRET`: Secret key for signing instructor and operator auth tokens.
- `DATABASE_URL`: (Optional) PostgreSQL connection URI. If omitted, uses in-memory database.
- `FRONTEND_URL`: Primary frontend domain for strict CORS matching.

### Frontend (`frontend/.env.production`)
- `VITE_API_URL`: Points to the production backend server (`https://muffin-factory-game.onrender.com`).
