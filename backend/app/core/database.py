from supabase import create_client
from app.core.config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY

def get_db():
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_admin():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
