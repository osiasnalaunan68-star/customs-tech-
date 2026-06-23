import os

# 1. Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://isiwsanzcbtoihelnpue.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# 2. CORS & Network
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://your-app.vercel.app,http://localhost:5173")

# 3. API Keys (Isinama na natin para hindi mag-error ang classifier)
EXCHANGE_RATE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# 4. Calculator Constants (Ito yung nagpa-crash ngayon)
DEFAULT_EXCHANGE_RATE = float(os.getenv("DEFAULT_EXCHANGE_RATE", "56.00"))
DEFAULT_VAT_RATE = float(os.getenv("DEFAULT_VAT_RATE", "0.12"))
ALLOWED_ORIGINS = "https://your-app.vercel.app"
