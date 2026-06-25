#!/data/data/com.termux/files/usr/bin/bash
set -e

REPO="$HOME/customs-tech"
BACKEND="$REPO/backend"
FRONTEND="$REPO/frontend"
LOG_DIR="$REPO/logs"
CMD="${1:-start}"

mkdir -p "$LOG_DIR"

start_services() {
  pkill -f "uvicorn app.main:app" 2>/dev/null || true
  pkill -f "python3 -m http.server 5173" 2>/dev/null || true
  sleep 1

  cd "$BACKEND"
  nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
  
  cd "$FRONTEND/dist"
  nohup python3 -m http.server 5173 > "$LOG_DIR/frontend.log" 2>&1 &
  
  echo "🚀 Services starting... checking status..."
  sleep 2
  bash "$REPO/deploy.sh" status
}

show_status() {
  echo "=== System Status Check ==="
  # Binago natin ang check mula /health papuntang / (Root)
  if curl -s -m 2 http://localhost:8000/ > /dev/null || [ $? -eq 0 ]; then 
      echo "  Backend (Port 8000): 🟢 RUNNING" 
  else 
      echo "  Backend (Port 8000): 🔴 FAILING (Check logs)"
  fi
  if curl -s -m 2 http://localhost:5173 > /dev/null; then 
      echo "  Frontend (Port 5173): 🟢 RUNNING" 
  else 
      echo "  Frontend (Port 5173): 🔴 DOWN" 
  fi
}

case "$CMD" in
  start) start_services ;;
  stop) pkill -f "uvicorn"; pkill -f "http.server"; echo "Stopped." ;;
  status) show_status ;;
  *) echo "Usage: start|stop|status";;
esac
