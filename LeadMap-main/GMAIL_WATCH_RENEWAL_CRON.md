# Gmail Watch Renewal Cron Job

## Overview

Gmail Watch subscriptions expire after 7 days. This cron job automatically renews them to ensure continuous push notifications for incoming emails.

## Configuration

**Endpoint:** `/api/cron/gmail-watch-renewal`  
**Schedule:** Daily at 3 AM (`0 3 * * *`)  
**Location:** `app/api/cron/gmail-watch-renewal/route.ts`  
**Vercel Config:** Already added to `vercel.json`

## What It Does

1. **Finds Mailboxes Needing Renewal**
   - Queries Gmail mailboxes with `watch_expiration` in the next 24 hours or already expired
   - Only processes active mailboxes (`active = true`)

2. **Refreshes Access Tokens**
   - Checks if tokens are expired or expiring within 5 minutes
   - Automatically refreshes tokens using refresh tokens
   - Updates mailbox with new access token and expiration

3. **Renews Gmail Watch Subscriptions**
   - Calls Gmail Watch API to set up/renew the subscription
   - Updates `watch_expiration` and `watch_history_id` in database
   - Sets expiration to 7 days from now

4. **Error Handling**
   - Logs errors for individual mailboxes but continues processing others
   - Returns summary of renewed/failed mailboxes

## Authentication

The cron job accepts authentication via:
- `x-vercel-cron-secret` header (set automatically by Vercel)
- `x-service-key` header with `CALENDAR_SERVICE_KEY` value
- `Authorization: Bearer` header with `CRON_SECRET` or `CALENDAR_SERVICE_KEY`

## Response Format

```json
{
  "success": true,
  "renewed": 2,
  "failed": 0,
  "total": 2,
  "results": [
    {
      "mailboxId": "uuid",
      "email": "user@example.com",
      "status": "renewed",
      "expiration": 1234567890000,
      "historyId": "12345"
    }
  ],
  "timestamp": "2025-01-01T03:00:00.000Z"
}
```

## When It Runs

- **Schedule:** Daily at 3:00 AM UTC
- **Frequency:** Once per day
- **Duration:** Processes all mailboxes in a single run

## Why Daily?

- Gmail Watch expires after 7 days
- Daily renewal ensures subscriptions never expire
- Running at 3 AM minimizes impact on users
- 24-hour buffer catches any expiring subscriptions

## Monitoring

### Check Cron Job Status

1. Go to Vercel Dashboard → Your Project → Functions
2. Look for `/api/cron/gmail-watch-renewal` in the logs
3. Check execution times and any errors

### Verify Watch Renewal

Query the database to check watch status:

```sql
SELECT 
  email,
  watch_expiration,
  CASE 
    WHEN watch_expiration > NOW() + INTERVAL '6 days' THEN 'Active'
    WHEN watch_expiration > NOW() THEN 'Expiring Soon'
    ELSE 'Expired'
  END as status
FROM mailboxes
WHERE provider = 'gmail' 
  AND active = true
  AND watch_expiration IS NOT NULL;
```

### Expected Behavior

- ✅ Active mailboxes should have `watch_expiration` > 7 days from now
- ✅ Renewal happens automatically every day
- ✅ No manual intervention needed

## Troubleshooting

### Cron Job Not Running

1. **Check Vercel Configuration**
   - Verify cron job is in `vercel.json`
   - Check that `CRON_SECRET` environment variable is set

2. **Check Vercel Logs**
   - Go to Vercel Dashboard → Functions → Logs
   - Look for authentication errors

3. **Verify Environment Variables**
   - `CRON_SECRET` must be set
   - `NEXT_PUBLIC_SUPABASE_URL` must be set
   - `SUPABASE_SERVICE_ROLE_KEY` must be set
   - `GMAIL_PUBSUB_TOPIC_NAME` must be set

### Watch Not Renewing

1. **Check Mailbox Status**
   - Verify mailbox is `active = true`
   - Check if `refresh_token` exists
   - Verify access token is valid

2. **Check Gmail API Errors**
   - Look for errors in cron job response
   - Verify Pub/Sub topic exists and is accessible
   - Check if Gmail API quota is exceeded

3. **Check Token Refresh**
   - Verify refresh token is valid
   - Check if OAuth credentials are configured
   - Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### Watch Expiration Issues

If watches are expiring despite the cron job:

1. **Check Cron Job Logs**
   - Verify cron job is actually running
   - Look for errors in processing specific mailboxes

2. **Check Mailbox Records**
   - Verify `watch_expiration` is being updated
   - Check if multiple renewals are happening

3. **Check Gmail Watch API**
   - Verify topic name is correct
   - Check if Pub/Sub subscription is active
   - Ensure permissions are properly set

## Manual Renewal

If you need to manually renew a watch:

```bash
POST /api/mailboxes/{mailboxId}/watch
```

This will immediately renew the watch subscription for that specific mailbox.

## Related Files

- `app/api/cron/gmail-watch-renewal/route.ts` - Cron job implementation
- `lib/email/providers/gmail-watch.ts` - Gmail Watch utilities
- `app/api/mailboxes/[id]/watch/route.ts` - Manual watch setup/stop
- `vercel.json` - Cron job configuration

## Dependencies

- Requires `GMAIL_PUBSUB_TOPIC_NAME` environment variable
- Requires valid Gmail OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Requires Supabase access (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

## Future Enhancements

Potential improvements:
- Email notifications when renewals fail
- Retry logic for failed renewals
- Metrics dashboard for watch status
- Alerting for expired watches

