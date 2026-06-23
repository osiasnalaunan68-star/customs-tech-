import os

# Binabasa ang mga variables mula sa Environment ng Render (or local system)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://isiwsanzcbtoihelnpue.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
EXCHANGE_RATE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://your-app.vercel.app")
