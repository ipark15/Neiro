from fastapi import APIRouter

# Auth is handled client-side via Supabase JS SDK.
# This router is a placeholder for any server-side auth helpers needed in V2.
router = APIRouter(prefix="/auth", tags=["auth"])
