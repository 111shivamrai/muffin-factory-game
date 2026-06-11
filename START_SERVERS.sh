#!/bin/bash

# ================================================
#  MUFFIN MEGA FACTORY — START ALL SERVERS
# ================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

echo ""
echo "🧁 Starting Muffin Mega Factory Servers..."
echo "==========================================="

# Kill anything already on these ports
echo "🔄 Clearing ports 3000 and 5001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
sleep 1

# Start Backend in a new Terminal tab
echo "🚀 Starting Backend on port 5001..."
osascript -e "tell application \"Terminal\" to do script \"echo '🔵 BACKEND — Port 5001'; cd '$BACKEND_DIR' && npm run dev\""

sleep 2

# Start Frontend in a new Terminal tab
echo "🚀 Starting Frontend on port 3000..."
osascript -e "tell application \"Terminal\" to do script \"echo '🟢 FRONTEND — Port 3000'; cd '$FRONTEND_DIR' && npm run dev -- --port 3000\""

sleep 3

echo ""
echo "✅ Both servers launched in separate Terminal tabs!"
echo ""
echo "📌 Open these URLs in your browser:"
echo "   🏠 Landing Page   → http://localhost:3000"
echo "   🛡️  Admin Panel    → http://localhost:3000/saas-admin"
echo "   🎓 Instructor     → http://localhost:3000/instructor"
echo "   🔧 Backend Health → http://localhost:5001/health"
echo ""
echo "🔑 Login Password: muffin123 (for all seeded accounts)"
echo ""
