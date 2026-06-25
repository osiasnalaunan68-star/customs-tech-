#!/data/data/com.termux/files/usr/bin/bash
set -e

REPO="$HOME/customs-tech"
BACKEND="$REPO/backend"
FRONTEND="$REPO/frontend"
LOG_DIR="$REPO/logs"
CMD="${1:-start}"

mkdir -p "$LOG_DIR"

check_deps() {
  echo "Checking engine requirements..."
  command -v python3  >/dev/null || { echo "❌ python3 missing"; exit 1; }
  command -v node     >/dev/null || { echo "❌ node missing"; exit 1; }
  echo "✓ Software stack verified"
}

check_env() {
  # Frontend Check
  F_ENV="$FRONTEND/.env.local"
  if [ ! -f "$F_ENV" ] || grep -q "YOUR_ANON_KEY_HERE" "$F_ENV"; then
    echo "❌ Frontend Environment Config Missing! Please configure $F_ENV first."
    exit 1
  fi

  # Backend Check
  B_ENV="$BACKEND/.env"
  if [ ! -f "$B_ENV" ] || grep -q "YOUR_SUPER_SECRET_SERVICE_ROLE_KEY_HERE" "$B_ENV"; then
    echo "❌ Backend Environment Secrets Missing! Please configure $B_ENV first."
    exit 1
  fi
  echo "✓ Production configuration schemas loaded successfully"
}

build_frontend() {
  echo "Compiling client app assets via Vite..."
  cd "$FRONTEND"
  npm run build || { echo "❌ Vite compilation crashed!"; exit 1; }
  echo "✓ Static distribution engine compiled"
}

start_services() {
  echo "Flushing any running stale ports..."
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  pkill -f "python3 -m http.server 5173" 2>/dev/null || true
  sleep 1

  echo "Firing up FastAPI Engine gateway..."
  cd "$BACKEND"
  nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
  
  echo "Serving static responsive interface..."
  cd "$FRONTEND/dist"
  nohup python3 -m http.server 5173 > "$LOG_DIR/frontend.log" 2>&1 &
  
  echo "🚀 Synchronizing microservices... Checking telemetry in 4s..."
  sleep 4
  bash "$REPO/deploy.sh" status
}

show_status() {
  echo "=== Live Architecture Cluster Status ==="
  if curl -s -m 2 http://localhost:8000/ > /dev/null || [ $? -eq 0 ]; then 
      echo "  FastAPI Gateway (Port 8000): 🟢 RUNNING & RESPONDING" 
  else 
      echo "  FastAPI Gateway (Port 8000): 🔴 CRASHED / INITIALIZATION ERROR"
  fi
  if curl -s -m 2 http://localhost:5173 > /dev/null; then 
      echo "  Vite Static Server (Port 5173): 🟢 RUNNING & RESPONDING" 
  else 
      echo "  Vite Static Server (Port 5173): 🔴 DOWN" 
  fi
}

case "$CMD" in
  start)
    check_deps; check_env
    if [ ! -d "$FRONTEND/dist" ]; then build_frontend; fi
    start_services
    ;;
  build)
    build_frontend ;;
  stop)
    pkill -f "uvicorn" || true
    pkill -f "http.server" || true
    echo "🔒 Local servers cleanly terminated. RAM space freed up!"
    ;;
  status)
    show_status ;;
  *)
    echo "Usage: bash deploy.sh [start|stop|status|build]"; exit 1 ;;
esac
