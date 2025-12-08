# Simple script to commit and push changes
Set-Location "d:\Downloads\LeadMap-main\LeadMap-main"

Write-Host "=== Git Status ===" -ForegroundColor Cyan
git status

Write-Host "`n=== Staging all changes ===" -ForegroundColor Cyan
git add -A

Write-Host "`n=== Committing changes ===" -ForegroundColor Cyan
git commit -m "Fix Supabase rate limiting and next/headers import issues

- Fixed dynamic import for next/headers in supabase-singleton.ts to prevent client component errors
- Updated providers.tsx with improved rate limiting, exponential backoff, and circuit breaker
- Created useSupabase hook for shared client access
- All fixes for /auth/v1/token rate limiting endpoint"

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Done! ===" -ForegroundColor Green
